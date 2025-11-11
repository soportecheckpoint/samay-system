// ============================================================
// JUEGO DE CABLES — Reconexión robusta + latch al completar
//  - ENC28J60 (CS = D46)  **no uses D46 para LEDs**
//  - LEDs: D5 rojo (sin conexión), D6 amarillo (pausado/latcheado),
//          D7 verde (midiendo), D9 LED del juego al completar
//  - Envía /dispatch SOLO cuando completed=true (una sola vez)
//  - Tras completar: espera {"command":"restart"} por POST /control
//  - Reconexión por timeout de ping
// ============================================================

#include <SPI.h>
#include <EthernetENC.h>

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

// ===== JUEGO: CABLES (A0–A4) =====
const int   N_SAMPLES = 10;
const float RREF      = 20000.0f;
const uint8_t APIN[5] = { A0, A1, A2, A3, A4 };
const float R_MIN[5]  = { 3250, 4750, 6750, 9800, 15100 };
const float R_MAX[5]  = { 3390, 4880, 6850, 10200, 15300 };

// LEDs de estado
#define LED_ROJO     5
#define LED_AMARILLO 6
#define LED_VERDE    7
#define LED_GAME     9

// ============================================================
// SECCIÓN 2: VARIABLES GLOBALES DEL JUEGO
// ============================================================

bool gameRunning    = true;   // si quieres que espere START, pon false
bool completedLatch = false;

// ============================================================
// SECCIÓN 3: LÓGICA DEL JUEGO (Funciones puras)
// ============================================================

/* Utils medición */
int avgADC(uint8_t pin) {
  long s = 0;
  for (int i = 0; i < N_SAMPLES; i++) {
    s += analogRead(pin);
    delayMicroseconds(300);
  }
  return (int)(s / N_SAMPLES);
}

float adcToOhms(int adc) {
  if (adc <= 0) return 0.0f;
  if (adc >= 1023) return 1e12f;
  return RREF * (float)adc / (1023.0f - (float)adc);
}

void gameInit() {
  completedLatch = false;
  gameRunning = true;
}

void gameStart() {
  gameRunning = true;
  completedLatch = false;
  digitalWrite(LED_GAME, LOW);
  DBG(F("🎮 JUEGO iniciado"));
}

void gameStop() {
  gameRunning = false;
  DBG(F("⏹️ Juego detenido"));
}

void gameRestart() {
  completedLatch = false;
  gameRunning = true;
  digitalWrite(LED_GAME, LOW);
  DBG(F("🔄 Juego reiniciado"));
}

bool isGameRunning() { return gameRunning; }
bool isCompletedLatch() { return completedLatch; }

bool scanCables(bool& completedNow) {
  completedNow = false;
  
  // Si está pausado o ya completado, no medir
  if (completedLatch || !gameRunning) return false;

  // Medición de cables
  const int total = 5;
  bool allConnected = true;
  
  for (int i = 0; i < total; i++) {
    int adc = avgADC(APIN[i]);
    float R = adcToOhms(adc);
    bool ok = (R >= R_MIN[i] && R <= R_MAX[i]);
    allConnected &= ok;
  }

  if (allConnected) {
    completedNow = true;
    completedLatch = true;
    gameRunning = false;
    digitalWrite(LED_GAME, HIGH);
    DBG(F("✅ JUEGO COMPLETADO - Esperando restart"));
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
// Device: Arduino Connections Game
// MAC: 02:AB:CD:EF:12:34 (única para este dispositivo)
// IP:  192.168.18.101
// Server: 192.168.18.164:3001
// Gateway: 192.168.18.1
// Subnet: 255.255.255.0
// ============================================================

// Configuración de red
const uint8_t ETH_CS = 46;
byte mac[] = {0x02, 0xAB, 0xCD, 0xEF, 0x12, 0x34};

IPAddress serverIp(192, 168, 18, 164);
const uint16_t serverPort = 3001;

IPAddress ipLocal(192, 168, 18, 101), dnsServer(192, 168, 18, 1),
          gateway(192, 168, 18, 1), subnet(255, 255, 255, 0);

// Servidor local
const uint16_t ARD_PORT = 8080;
EthernetServer controlServer(ARD_PORT);

// Estado de conexión
bool connectedOK = false;
unsigned long nextReconnectMs = 0;
const unsigned long RECONNECT_MS = 1000;
unsigned long lastPingReceivedMs = 0;
const unsigned long PING_TIMEOUT_MS = 8000;  // 8 segundos

// Timing para escaneo de cables
unsigned long lastScanMs = 0;
const unsigned long SCAN_INTERVAL_MS = 200;  // Escanear cada 200ms

// Endpoints
const char* ARDUINO_ID = "connections";
const char* CONNECT_PATH = "/connect";
const char* DISPATCH_PATH = "/dispatch";

void networkInit() {
  pinMode(10, OUTPUT);   // SPI master AVR
  pinMode(53, OUTPUT);   // SS del MEGA en OUTPUT para evitar modo slave
  pinMode(ETH_CS, OUTPUT);
  digitalWrite(ETH_CS, HIGH);
  
  Ethernet.init(ETH_CS);
  Ethernet.begin(mac, ipLocal, dnsServer, gateway, subnet);
  delay(400);
  
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

bool postJsonTo(const char* path, const String& body) {
  EthernetClient cli;
  cli.setTimeout(5000);
  if (!cli.connect(serverIp, serverPort)) {
    DBG(F("❌ No conecta TCP."));
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

  unsigned long t0 = millis();
  while (!cli.available() && (millis() - t0 < 3000)) {}
  while (cli.available()) cli.read();
  cli.stop();
  return true;
}

bool sendConnect() {
  IPAddress my = Ethernet.localIP();
  String myIp = String(my[0]) + "." + String(my[1]) + "." + String(my[2]) + "." + String(my[3]);

  String body;
  body.reserve(128);
  body += "{\"id\":\"";
  body += ARDUINO_ID;
  body += "\",";
  body += "\"ip\":\"";
  body += myIp;
  body += "\",";
  body += "\"port\":";
  body += String(ARD_PORT);
  body += "}";
  
  DBG(F("📤 /connect:"));
  DBG(body);
  return postJsonTo(CONNECT_PATH, body);
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

void checkPingTimeout() {
  if (connectedOK && (millis() - lastPingReceivedMs >= PING_TIMEOUT_MS)) {
    DBG(F("⏱️ Timeout: sin PING"));
    onServerDisconnected();
  }
}

void handleReconnection() {
  if (!connectedOK && (long)(millis() - nextReconnectMs) >= 0) {
    DBG(F("↻ Intentando /connect..."));
    if (sendConnect()) {
      onServerConnected();
    } else {
      nextReconnectMs = millis() + RECONNECT_MS;
    }
  }
}

bool sendDispatchCompleted() {
  const int total = 5;
  String body;
  body.reserve(256);
  body += "{\"arduinoId\":\"";
  body += ARDUINO_ID;
  body += "\",";
  body += "\"event\":\"connections:state-changed\",";
  body += "\"data\":{";
  body += "\"connections\":[";
  for (int i = 0; i < total; i++) {
    body += "{\"from\":";
    body += (i + 1);
    body += ",\"connected\":true}";
    if (i < total - 1) body += ",";
  }
  body += "],";
  body += "\"totalConnections\":";
  body += total;
  body += ",";
  body += "\"correctConnections\":";
  body += total;
  body += ",";
  body += "\"completed\":true";
  body += "}}";
  
  DBG(F("📤 /dispatch (completed):"));
  DBG(body);
  return postJsonTo(DISPATCH_PATH, body);
}

String getUptimeISO8601() {
  unsigned long ms = millis();
  unsigned long s = ms / 1000UL;
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
  bool ok = extractTimeParameterFromUrl(path, timeVal);
  
  if (ok) {
    // Actualizar timestamp del último ping recibido
    lastPingReceivedMs = millis();
    
    // Responder 200 OK al cliente
    c.println(F("HTTP/1.1 200 OK"));
    c.println(F("Content-Type: text/plain"));
    c.println(F("Connection: close"));
    c.println();
    c.println(F("OK"));
    
    delay(1);
    c.stop();
    
    DBG(F("🏓 PING recibido"));
  } else {
    sendHttpResponse400(c, F("Falta parametro time= en /Ping"));
    c.stop();
  }
}

void handleControlPost(EthernetClient& c, int contentLength) {
  if (contentLength <= 0 || contentLength > 512) {
    sendHttpResponse400(c, F("Content-Length invalido"));
    c.stop();
    return;
  }

  char body[513];
  int n = 0;
  unsigned long t0 = millis();
  while (n < contentLength && (millis() - t0) < 2000) {
    if (c.available()) body[n++] = c.read();
  }
  body[n] = 0;
  
  String b = body;
  b.replace(" ", "");
  b.replace("\r", "");
  b.replace("\n", "");

  DBG(F("📥 POST body:"));
  DBG(b);

  if (b.indexOf("\"command\":\"restart\"") >= 0) {
    gameRestart();
    sendHttpResponse200(c, "restart");
    c.stop();
    return;
  }
  
  sendHttpResponse400(c, F("JSON no reconocido. Usa {\"command\":\"restart\"}"));
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

    int s1 = req.indexOf(' '), s2 = req.indexOf(' ', s1 + 1);
    if (s1 < 0 || s2 < 0) {
      c.stop();
      return;
    }

    String method = req.substring(0, s1);
    String path = req.substring(s1 + 1, s2);

    if (method == "GET" && (path.startsWith("/Ping") || path.startsWith("/ping"))) {
      handlePingRequest(c, path);
    } else if (method == "POST" && path == "/control") {
      // Leer headers para obtener Content-Length
      int contentLength = 0;
      while (c.connected()) {
        String h = c.readStringUntil('\n');
        if (h.startsWith("Content-Length:")) {
          h.remove(0, 15);
          h.trim();
          contentLength = h.toInt();
        }
        if (h == "\r") break;
      }
      handleControlPost(c, contentLength);
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
  
  analogReference(DEFAULT);
}

void updateSystemStatus() {
  if (!isNetworkConnected())
    setStatusLeds(true, false, false);    // 🔴 sin conexión
  else if (isCompletedLatch())
    setStatusLeds(false, true, false);    // 🟡 completado/pausado
  else if (isGameRunning())
    setStatusLeds(false, false, true);    // 🟢 midiendo
  else
    setStatusLeds(false, true, false);    // 🟡 esperando start
}

void setup() {
  Serial.begin(115200);
  delay(200);

  setupHardware();
  gameInit();
  networkInit();

  Serial.print(F("IP local: "));
  Serial.println(Ethernet.localIP());
  
  if (sendConnect()) {
    onServerConnected();
    DBG(F("✅ Conexión inicial exitosa"));
  } else {
    onServerDisconnected();
    DBG(F("❌ Fallo en conexión inicial"));
  }

  updateSystemStatus();
}

void loop() {
  // 1. Actualizar interfaz de red (siempre máxima prioridad)
  networkUpdate();

  // 2. Actualizar LEDs de estado
  updateSystemStatus();

  // 3. Juego pausado/latcheado → nada
  if (completedLatch || !gameRunning) return;

  // 4. Medición Cables (solo cada SCAN_INTERVAL_MS)
  if ((long)(millis() - lastScanMs) >= (long)SCAN_INTERVAL_MS) {
    lastScanMs = millis();
    
    bool completedNow = false;
    if (scanCables(completedNow)) {
      if (completedNow && connectedOK) {
        sendDispatchCompleted();
      }
    }
  }
  
  // Sin delay bloqueante - el loop corre libre para responder pings rápido
}