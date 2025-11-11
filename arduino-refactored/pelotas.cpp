// ============================================================
// JUEGO: "Pelotas" (6 botones simultáneos) - Versión Refactorizada
// Separación clara: Lógica del juego vs Interfaz de red
// ============================================================

// Nota: Este código está diseñado para Arduino IDE
// Las librerías Arduino.h, SPI.h, EthernetENC.h se asumen incluidas

#include <SPI.h>
#include <EthernetENC.h>
#include <EthernetUdp.h>
#include <string.h>

// ====== CONFIGURACIÓN ======
#define DEBUG 1
#if DEBUG
  #define DBG(x)   do{ Serial.println(x); }while(0)
  #define DBGF(...) do{ char b[160]; snprintf(b, sizeof(b), __VA_ARGS__); Serial.println(b);}while(0)
#else
  #define DBG(x)    do{}while(0)
  #define DBGF(...) do{}while(0)
#endif

// ============================================================
// SECCIÓN 1: CONFIGURACIÓN HARDWARE Y JUEGO
// ============================================================

#define NUM_BUTTONS 6

// Pines físicos (6 botones para el juego de pelotas)
const unsigned char buttonPins[NUM_BUTTONS] = {62, 63, 64, 65, 66, 67};

// LEDs de estado
#define LED_ROJO     5
#define LED_AMARILLO 6
#define LED_VERDE    7
#define LED_GAME     9

// ============================================================
// SECCIÓN 2: VARIABLES GLOBALES DEL JUEGO
// ============================================================

// Estado del juego
bool gameRunning = true;  // Inicia en true para pelotas
bool completedLatch = false;

// Debounce
unsigned long lastCheck = 0;
const unsigned long DEBOUNCE_MS = 25;

// Máscara de botones previa
uint8_t prevMask = 0;

// Variable para marcar evento pendiente de dispatch
volatile bool dispatchPending = false;

// ============================================================
// SECCIÓN 3: LÓGICA DEL JUEGO (Funciones puras)
// ============================================================

void gameInit() {
  prevMask = 0;
  completedLatch = false;
  gameRunning = true;
  dispatchPending = false;
}

void gameStart() {
  prevMask = 0;
  completedLatch = false;
  gameRunning = true;
  dispatchPending = false;
  digitalWrite(LED_GAME, LOW);
  
  DBG(F("🎮 JUEGO iniciado - Pelotas (6 botones simultáneos)"));
}

void gameStop() {
  gameRunning = false;
  digitalWrite(LED_GAME, completedLatch ? HIGH : LOW);
  DBG(F("⏹️ Juego detenido"));
}

void gameRestart() {
  prevMask = 0;
  completedLatch = false;
  gameRunning = true;
  dispatchPending = false;
  digitalWrite(LED_GAME, LOW);
  
  DBG(F("🔄 Juego reiniciado"));
}

bool isGameRunning() { return gameRunning; }
bool isGameCompleted() { return completedLatch; }

void onGameCompleted() {
  completedLatch = true;
  gameRunning = false;
  dispatchPending = true;
  digitalWrite(LED_GAME, HIGH);
  DBG(F("🎉 JUEGO COMPLETADO - 6 botones presionados simultáneamente"));
}

bool scanButtons() {
  // Debounce temporal
  if (millis() - lastCheck < DEBOUNCE_MS) return false;
  lastCheck = millis();

  // Leer todos los botones
  uint8_t mask = 0;
  uint8_t pressed = 0;
  
  for (uint8_t i = 0; i < NUM_BUTTONS; i++) {
    bool p = (digitalRead(buttonPins[i]) == LOW);  // PULLUP → LOW = presionado
    if (p) {
      mask |= (1 << i);
      pressed++;
    }
  }

  // Log si cambió el estado
  if (mask != prevMask) {
    #if DEBUG
      Serial.print(F("Botones presionados: ")); Serial.print(pressed);
      Serial.print(F("  | Mask(b5..b0)= "));
      for (int b = 5; b >= 0; b--) Serial.print((mask & (1 << b)) ? '1' : '0');
      Serial.println();
    #endif
    prevMask = mask;
  }

  // Verificar si los 6 están presionados
  if (pressed == 6) {
    onGameCompleted();
    return true;
  }

  return false;
}

// ============================================================
// SECCIÓN 4: INTERFAZ DE RED (Variables y funciones)
// ============================================================

// ============================================================
// CONFIGURACIÓN DE RED - PRODUCCIÓN
// ============================================================
// Device: Arduino Pelotas Game
// MAC: 02:AB:CD:EF:12:34 (única para este dispositivo)
// IP:  192.168.18.110 (estática)
// Server: 192.168.18.164:3001
// Gateway: 192.168.18.1
// Subnet: 255.255.255.0
// ============================================================

// Configuración de red
const unsigned char ETH_CS = 46;
unsigned char mac[] = {0x02,0xAB,0xCD,0xEF,0x12,0x34};  // MAC única - Pelotas
IPAddress serverIp(192,168,18,164);
const unsigned int serverPort = 3001;

// IP estática
IPAddress ipFallback(192,168,18,110);
IPAddress dnsServer(192,168,18,1);
IPAddress gateway(192,168,18,1);
IPAddress subnet(255,255,255,0);

// Servidor local
const unsigned int ARD_PORT = 8080;
EthernetServer controlServer(ARD_PORT);

// Estado de conexión
bool connectedOK = false;
unsigned long nextReconnectMs = 0;
const unsigned long RECONNECT_MS = 1000;
unsigned long lastPingReceivedMs = 0;
const unsigned long PING_TIMEOUT_MS = 8000;  // 8 segundos

// Endpoints
const char* ARDUINO_ID = "pelotas";
const char* CONNECT_PATH = "/connect";
const char* DISPATCH_PATH = "/dispatch";

void networkInit() {
  pinMode(ETH_CS, OUTPUT);
  digitalWrite(ETH_CS, HIGH);
  
  Ethernet.init(ETH_CS);
  SPI.begin();
  SPI.setClockDivider(SPI_CLOCK_DIV2);

  Ethernet.begin(mac, ipFallback, dnsServer, gateway, subnet);
  
  controlServer.begin();
}

bool isNetworkConnected() { return connectedOK; }

void setStatusLeds(bool red, bool yellow, bool green) {
  digitalWrite(LED_ROJO, red ? HIGH : LOW);
  digitalWrite(LED_AMARILLO, yellow ? HIGH : LOW);
  digitalWrite(LED_VERDE, green ? HIGH : LOW);
}

void scheduleReconnectSoon() {
  nextReconnectMs = millis();
}

void scheduleReconnectLater() {
  nextReconnectMs = millis() + RECONNECT_MS;
}

void onServerConnected() {
  connectedOK = true;
  nextReconnectMs = 0;
  lastPingReceivedMs = millis();
  DBG(F("✅ Conexión servidor establecida/recuperada"));
}

void onServerDisconnected() {
  connectedOK = false;
  scheduleReconnectSoon();
  DBG(F("❌ Desconectado del servidor"));
}

bool postJsonToServer(const char* path, const String& body) {
  EthernetClient cli;
  cli.setTimeout(50);
  if (!cli.connect(serverIp, serverPort)) {
    DBG(F("❌ No conecta TCP para POST"));
    return false;
  }
  
  cli.print(F("POST "));
  cli.print(path);
  cli.println(F(" HTTP/1.1"));
  cli.print(F("Host: "));
  cli.print(serverIp);
  cli.print(F(":"));
  cli.println(serverPort);
  cli.println(F("User-Agent: Arduino"));
  cli.println(F("Content-Type: application/json"));
  cli.print(F("Content-Length: "));
  cli.println(body.length());
  cli.println(F("Connection: close"));
  cli.println();
  cli.print(body);
  
  // No esperamos respuesta, cerramos inmediatamente
  cli.stop();
  return true;
}

bool postJsonToServerWaitResponse(const char* path, const String& body) {
  EthernetClient cli;
  cli.setTimeout(150);
  if (!cli.connect(serverIp, serverPort)) {
    DBG(F("❌ No conecta TCP para POST"));
    return false;
  }
  
  cli.print(F("POST "));
  cli.print(path);
  cli.println(F(" HTTP/1.1"));
  cli.print(F("Host: "));
  cli.print(serverIp);
  cli.print(F(":"));
  cli.println(serverPort);
  cli.println(F("User-Agent: Arduino"));
  cli.println(F("Content-Type: application/json"));
  cli.print(F("Content-Length: "));
  cli.println(body.length());
  cli.println(F("Connection: close"));
  cli.println();
  cli.print(body);

  // Esperamos respuesta del servidor
  unsigned long t0 = millis();
  while (cli.connected() && millis() - t0 < 50)
    while (cli.available()) cli.read();
  cli.stop();
  return true;
}

bool sendConnect() {
  IPAddress my = Ethernet.localIP();
  String myIp = String(my[0]) + "." + String(my[1]) + "." + String(my[2]) + "." + String(my[3]);
  String body = "{\"id\":\"" + String(ARDUINO_ID) + "\",\"ip\":\"" + myIp + "\",\"port\":" + String(ARD_PORT) + "}";
  
  DBG(F("📤 /connect:")); DBG(body);
  bool result = postJsonToServerWaitResponse(CONNECT_PATH, body);
  if (result) onServerConnected();
  else onServerDisconnected();
  return result;
}

void checkPingTimeout() {
  if (connectedOK && (millis() - lastPingReceivedMs >= PING_TIMEOUT_MS)) {
    DBG(F("⏱️ Timeout: 11s sin PING"));
    onServerDisconnected();
  }
}

void handleReconnection() {
  if (!connectedOK && (long)(millis() - nextReconnectMs) >= 0) {
    DBG(F("↻ Intentando /connect..."));
    if (sendConnect()) {
      onServerConnected();
    } else {
      scheduleReconnectLater();
    }
  }
}

bool sendDispatchEvent(const char* eventName, bool completed) {
  String body;
  body.reserve(160);

  body += "{\"arduinoId\":\""; body += ARDUINO_ID; body += "\",";
  body += "\"event\":\""; body += eventName; body += "\",";
  body += "\"data\":{";
  body += "\"totalConnections\":6,";
  body += "\"completed\":"; body += (completed ? "true" : "false");
  body += "}}";

  DBG(F("📤 /dispatch:")); DBG(body);
  return postJsonToServer(DISPATCH_PATH, body);
}

String getUptimeISO8601() {
  unsigned long ms = millis();
  unsigned long s  = ms / 1000UL;
  unsigned long hh = (s / 3600UL) % 24UL;
  unsigned long mm = (s / 60UL) % 60UL;
  unsigned long ss = s % 60UL;
  char buf[40];
  snprintf(buf, sizeof(buf), "1970-01-01T%02lu:%02lu:%02lu.000Z", hh, mm, ss);
  return String(buf);
}

void sendHttpResponse200(EthernetClient& c, const String& cmd) {
  String ts = getUptimeISO8601();
  c.println(F("HTTP/1.1 200 OK"));
  c.println(F("Content-Type: application/json; charset=utf-8"));
  c.println(F("Connection: close"));
  c.println();
  c.print(F("{\"status\":\"ok\",\"command\":\""));
  c.print(cmd);
  c.print(F("\",\"timestamp\":\""));
  c.print(ts);
  c.println(F("\"}"));
}

void sendHttpResponse400(EthernetClient& c, const __FlashStringHelper* msg) {
  c.println(F("HTTP/1.1 400 Bad Request"));
  c.println(F("Content-Type: text/plain; charset=utf-8"));
  c.println(F("Connection: close"));
  c.println();
  c.println(msg);
}

bool extractTimeParameterFromUrl(const String& url, String& timeVal) {
  int i = url.indexOf("time=");
  if (i < 0) return false;
  i += 5;
  timeVal = "";
  while (i < (int)url.length()) {
    char ch = url[i];
    if (ch >= '0' && ch <= '9') {
      timeVal += ch;
      i++;
    } else {
      break;
    }
  }
  return timeVal.length() > 0;
}

void handlePingRequest(EthernetClient& c, const String& path) {
  String timeVal;
  unsigned long t1 = micros();
  bool ok = extractTimeParameterFromUrl(path, timeVal);
  
  if (ok) {
    // Actualizar timestamp del último ping recibido
    lastPingReceivedMs = millis();
    
    unsigned long t2 = micros();
    
    // Responder 200 OK al cliente
    c.println(F("HTTP/1.1 200 OK"));
    c.println(F("Content-Type: text/plain"));
    c.println(F("Connection: close"));
    c.println();
    c.println(F("OK"));  // Body simple para confirmar
    
    // Dar tiempo para que se envíe el buffer antes de cerrar
    delay(1);
    c.stop();
    
    DBG(F("🏓 PING recibido"));
  } else {
    sendHttpResponse400(c, F("Falta parametro time= en /Ping"));
    c.stop();
  }
}

void handleControlGet(EthernetClient& c, const String& path) {
  sendHttpResponse400(c, F("Use POST /control"));
  c.stop();
}

void handleControlPost(EthernetClient& c) {
  // Leer headers hasta línea vacía
  while (c.available()) {
    String line = c.readStringUntil('\n');
    line.trim();
    if (line.length() == 0) break;
  }
  
  // Leer body JSON
  String body = "";
  while (c.available()) {
    body += (char)c.read();
  }
  
  body.trim();
  DBGF("📥 POST body: %s", body.c_str());
  
  // Parsear comando del JSON (simple)
  if (body.indexOf("\"command\":\"restart\"") >= 0) {
    gameRestart();
    sendHttpResponse200(c, "restart");
  } else if (body.indexOf("\"command\":\"start\"") >= 0) {
    gameStart();
    sendHttpResponse200(c, "start");
  } else if (body.indexOf("\"command\":\"stop\"") >= 0) {
    gameStop();
    sendHttpResponse200(c, "stop");
  } else {
    sendHttpResponse400(c, F("JSON debe tener {\"command\":\"start|stop|restart\"}"));
  }
  
  c.stop();
}

void handleLocalServerRequest() {
  if (EthernetClient c = controlServer.available()) {
    c.setTimeout(100);
    String req = c.readStringUntil('\n');
    req.trim();
    
    if (req.length()) {
      DBGF("⇐ %s", req.c_str());
    }

    int s1 = req.indexOf(' '), s2 = req.indexOf(' ', s1+1);
    if (s1 < 0 || s2 < 0) {
      c.stop();
      return;
    }

    String method = req.substring(0, s1);
    String path = req.substring(s1+1, s2);

    if (method == "GET" && (path.startsWith("/Ping") || path.startsWith("/ping"))) {
      handlePingRequest(c, path);
    } else if (method == "GET" && path.startsWith("/control")) {
      handleControlGet(c, path);
    } else if (method == "POST" && path == "/control") {
      handleControlPost(c);
    } else {
      sendHttpResponse400(c, F("Usa POST /control o GET /Ping?time=123"));
      c.stop();
    }
  }
}

void networkUpdate() {
  handleLocalServerRequest();
  checkPingTimeout();
  handleReconnection();
}

// ============================================================
// SECCIÓN 5: SISTEMA PRINCIPAL
// ============================================================

void setupHardware() {
  pinMode(LED_ROJO, OUTPUT);
  pinMode(LED_AMARILLO, OUTPUT);
  pinMode(LED_VERDE, OUTPUT);
  pinMode(LED_GAME, OUTPUT);
  digitalWrite(LED_GAME, LOW);
  setStatusLeds(false, false, false);

  for (int i=0; i<NUM_BUTTONS; i++) 
    pinMode(buttonPins[i], INPUT_PULLUP);
}

void updateSystemStatus() {
  if (!isNetworkConnected())
    setStatusLeds(true, false, false);    // 🔴 sin conexión
  else if (isGameCompleted())
    setStatusLeds(false, true, false);    // 🟡 completado
  else if (isGameRunning())
    setStatusLeds(false, false, true);    // 🟢 ejecutando
  else
    setStatusLeds(false, true, false);    // 🟡 esperando start
}

void setup() {
  Serial.begin(115200);
  
  setupHardware();
  gameInit();
  networkInit();

  if (sendConnect()) {
    DBG(F("✅ Conexión inicial exitosa"));
  } else {
    DBG(F("❌ Fallo en conexión inicial"));
  }

  updateSystemStatus();
}

void loop() {
  // 1. Actualizar interfaz de red (siempre máxima prioridad)
  networkUpdate();

  // 2. Envíos pendientes: /dispatch si quedó marcado
  if (isNetworkConnected() && dispatchPending) {
    if (sendDispatchEvent("pelotas:state-changed", true)) {
      dispatchPending = false;
      DBG(F("✅ Dispatch enviado: juego completado"));
    } else {
      onServerDisconnected();
    }
  }

  // 3. Lógica del juego (solo si está corriendo y no completado)
  if (isGameRunning() && !isGameCompleted()) {
    scanButtons();
  }

  // 4. Actualizar LEDs de estado
  updateSystemStatus();
}