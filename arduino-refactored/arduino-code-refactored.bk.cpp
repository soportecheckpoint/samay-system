// ============================================================
// JUEGO: "Buttons" (10 botones) - Versión Refactorizada
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

#define NUM_BUTTONS 10
enum Btn { BOTON1=0,BOTON2,BOTON3,BOTON4,BOTON5,BOTON6,BOTON7,BOTON8,BOTON9,BOTON10 };

// Configuración de la combinación correcta
const unsigned char CORRECT_BUTTONS[] = { BOTON1, BOTON3 };   // ejemplo: 1 y 3 encendidos
const unsigned char NUM_CORRECT = sizeof(CORRECT_BUTTONS)/sizeof(CORRECT_BUTTONS[0]);

// Pines físicos
const unsigned char buttonPins[NUM_BUTTONS] = {21,20,19,18,17,16,15,14,2,3};
const unsigned char ledPinsBtn[NUM_BUTTONS] = {24,26,28,30,32,34,36,38,40,42};

// LEDs de estado
#define LED_ROJO     5
#define LED_AMARILLO 6
#define LED_VERDE    7
#define LED_GAME     9
#define LED_READY    4

// ============================================================
// SECCIÓN 2: VARIABLES GLOBALES DEL JUEGO
// ============================================================

// Estado del juego
bool gameRunning = false;
bool readyActive = false;
unsigned long readyStartMs = 0;
const unsigned long READY_DELAY_MS = 10000;

bool buttonState[NUM_BUTTONS] = {0};
unsigned long debounceTime[NUM_BUTTONS] = {0};
const unsigned long DEBOUNCE_MS = 50;
int lastPressedButton = -1;

// ============================================================
// SECCIÓN 3: LÓGICA DEL JUEGO (Funciones puras)
// ============================================================

void gameInit() {
  memset(buttonState, 0, sizeof(buttonState));
  memset(debounceTime, 0, sizeof(debounceTime));
  lastPressedButton = -1;
  gameRunning = false;
  readyActive = false;
}

void gameStart() {
  memset(buttonState, 0, sizeof(buttonState));
  memset(debounceTime, 0, sizeof(debounceTime));
  lastPressedButton = -1;
  
  digitalWrite(LED_GAME, LOW);
  gameRunning = true;
  readyActive = true;
  readyStartMs = millis();
  digitalWrite(LED_READY, HIGH);
  
  DBG(F("🎮 JUEGO iniciado - READY: cuenta 10s (no bloqueante)"));
}

void gameStop() {
  gameRunning = false;
  readyActive = false;
  digitalWrite(LED_GAME, LOW);
  digitalWrite(LED_READY, LOW);
  DBG(F("⏹️ Juego detenido"));
}

void gameRestart() {
  gameStop();
  memset(buttonState, 0, sizeof(buttonState));
  memset(debounceTime, 0, sizeof(debounceTime));
  lastPressedButton = -1;
  
  // Actualizar LEDs de botones
  for (int i=0; i<NUM_BUTTONS; i++)
    digitalWrite(ledPinsBtn[i], buttonState[i] ? HIGH : LOW);
    
  DBG(F("🔄 Juego reiniciado"));
}

bool isGameRunning() { return gameRunning; }
bool isReadyActive() { return readyActive; }
int getLastPressed() { return lastPressedButton; }

bool readyCountdownFinished() {
  if (!readyActive) return true;
  
  if (millis() - readyStartMs >= READY_DELAY_MS) {
    readyActive = false;
    digitalWrite(LED_READY, LOW);
    DBG(F("✅ READY finalizado - Botones activos"));
    return true;
  }
  return false;
}

bool isButtonInCorrect(unsigned char idx) {
  for (unsigned char k=0; k<NUM_CORRECT; k++) 
    if (idx == CORRECT_BUTTONS[k]) return true;
  return false;
}

bool isGameCompleted() {
  // Todos los botones correctos deben estar presionados
  for (unsigned char k=0; k<NUM_CORRECT; k++) 
    if (!buttonState[CORRECT_BUTTONS[k]]) return false;
  
  // Ningún botón incorrecto debe estar presionado
  for (unsigned char i=0; i<NUM_BUTTONS; i++) 
    if (!isButtonInCorrect(i) && buttonState[i]) return false;
  
  return true;
}

bool scanButtons(bool& completedNow) {
  bool anyChange = false;
  completedNow = false;
  
  static unsigned long lastScan = 0;
  if (millis() - lastScan < 5) return false;
  lastScan = millis();

  // Leer cada botón con debounce
  for (int i=0; i<NUM_BUTTONS; i++) {
    bool pressedNow = (digitalRead(buttonPins[i]) == LOW);  // PULLUP → LOW = presionado
    
    if (pressedNow && (millis() - debounceTime[i] > DEBOUNCE_MS)) {
      debounceTime[i] = millis();
      buttonState[i] = !buttonState[i];  // toggle
      lastPressedButton = i;
      anyChange = true;
      
      // Actualizar LED del botón
      digitalWrite(ledPinsBtn[i], buttonState[i] ? HIGH : LOW);
      
      #if DEBUG
        Serial.print(F("🔘 Botón ")); Serial.print(i+1);
        Serial.print(F(" → ")); Serial.println(buttonState[i] ? F("ON") : F("OFF"));
      #endif
    }
  }

  // Verificar completitud
  completedNow = isGameCompleted();
  if (completedNow) {
    digitalWrite(LED_GAME, HIGH);
    DBG(F("✅ JUEGO COMPLETADO - Esperando restart"));
  }

  return anyChange || completedNow;
}

// ============================================================
// SECCIÓN 4: INTERFAZ DE RED (Variables y funciones)
// ============================================================

// Configuración de red
const unsigned char ETH_CS = 46;
unsigned char mac[] = {0x02,0xAB,0xCD,0xEF,0x12,0x34};
IPAddress serverIp(192,168,18,164);
const unsigned int serverPort = 3001;
IPAddress ipLocal(192,168,18,120), dnsServer(192,168,18,1),
          gateway(192,168,18,1), subnet(255,255,255,0);

// Servidor local
const unsigned int ARD_PORT = 8080;
EthernetServer controlServer(ARD_PORT);

// Estado de conexión
bool connectedOK = false;
unsigned long nextReconnectMs = 0;
const unsigned long RECONNECT_MS = 1000;
unsigned long lastHeartbeat = 0;
const unsigned long HEARTBEAT_INTERVAL_MS = 5000;

// Endpoints
const char* ARDUINO_ID = "buttons-arduino";
const char* CONNECT_PATH = "/connect";
const char* DISPATCH_PATH = "/dispatch";
const char* HEARTBEAT_PATH = "/heartbeat";
const char* PONG_PATH = "/Pong";

// Keep-alive connection
EthernetClient backendConn;

void networkInit() {
  pinMode(ETH_CS, OUTPUT);
  digitalWrite(ETH_CS, HIGH);
  
  Ethernet.init(ETH_CS);
  SPI.begin();
  SPI.setClockDivider(SPI_CLOCK_DIV2);

  Ethernet.begin(mac, ipLocal, dnsServer, gateway, subnet);
  delay(200);

  Serial.print(F("🌐 IP local: "));
  Serial.println(Ethernet.localIP());
  
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
  DBG(F("✅ Conexión servidor establecida/recuperada"));
}

void onServerDisconnected() {
  connectedOK = false;
  scheduleReconnectSoon();
  DBG(F("❌ Desconectado del servidor"));
}

bool postJsonToServer(const char* path, const String& body) {
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
  bool result = postJsonToServer(CONNECT_PATH, body);
  if (result) onServerConnected();
  else onServerDisconnected();
  return result;
}

bool sendHeartbeat() {
  String body = "{\"arduinoId\":\"" + String(ARDUINO_ID) + "\"}";
  return postJsonToServer(HEARTBEAT_PATH, body);
}

void updateHeartbeat() {
  if (connectedOK && millis() - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeat = millis();
    if (!sendHeartbeat()) {
      DBG(F("⚠️ Heartbeat falló"));
      onServerDisconnected();
    }
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

bool sendDispatchEvent(const char* eventName, const bool state[], int lastPressed, bool completed) {
  String body;
  body.reserve(320);

  body += "{\"arduinoId\":\""; body += ARDUINO_ID; body += "\",";
  body += "\"event\":\""; body += eventName; body += "\",";
  body += "\"data\":{";

  body += "\"buttons\":[";
  for (int i = 0; i < NUM_BUTTONS; i++) {
    body += "{\"id\":"; body += (i+1); body += ",\"pressed\":";
    body += (state[i] ? "true" : "false"); body += "}";
    if (i < NUM_BUTTONS-1) body += ",";
  }
  body += "],";

  int lp = (lastPressed >= 0 && lastPressed < NUM_BUTTONS) ? (lastPressed + 1) : 0;
  body += "\"lastPressed\":"; body += lp; body += ",";
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
    unsigned long t2 = micros();
    
    float t1_ms = t1 / 1000.0, t2_ms = t2 / 1000.0, dt_ms = t2_ms - t1_ms;
    c.println(F("HTTP/1.1 200 OK"));
    c.println(F("Content-Type: text/plain"));
    c.println(F("Connection: close"));
    c.println();
    c.print(F("PONG SENT time="));
    c.print(timeVal);
    c.print(F(" t1_ms="));
    c.print(t1_ms, 3);
    c.print(F(" t2_ms="));
    c.print(t2_ms, 3);
    c.print(F(" dt_ms="));
    c.println(dt_ms, 3);
    c.stop();
  } else {
    sendHttpResponse400(c, F("Falta parametro time= en /Ping"));
    c.stop();
  }
}

void handleControlGet(EthernetClient& c, const String& path) {
  int q = path.indexOf('?');
  String qs = (q >= 0) ? path.substring(q+1) : "";
  qs.replace("%22", "\"");
  
  if (qs.indexOf("command=restart") >= 0) {
    gameRestart();
    sendHttpResponse200(c, "restart");
    c.stop();
  } else if (qs.indexOf("command=start") >= 0) {
    gameStart();
    sendHttpResponse200(c, "start");
    c.stop();
  } else if (qs.indexOf("command=stop") >= 0) {
    gameStop();
    sendHttpResponse200(c, "stop");
    c.stop();
  } else {
    sendHttpResponse400(c, F("Falta ?command=start|stop|restart"));
    c.stop();
  }
}

void handleControlPost(EthernetClient& c) {
  // Implementar parsing de body JSON si es necesario
  sendHttpResponse200(c, "post_control");
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
  updateHeartbeat();
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
  pinMode(LED_READY, OUTPUT);
  digitalWrite(LED_GAME, LOW);
  digitalWrite(LED_READY, LOW);
  setStatusLeds(false, false, false);

  for (int i=0; i<NUM_BUTTONS; i++) pinMode(buttonPins[i], INPUT_PULLUP);
  for (int i=0; i<NUM_BUTTONS; i++) {
    pinMode(ledPinsBtn[i], OUTPUT);
    digitalWrite(ledPinsBtn[i], LOW);
  }
}

void updateSystemStatus() {
  if (!isNetworkConnected())
    setStatusLeds(true, false, false);    // 🔴 sin conexión
  else if (!isGameRunning())
    setStatusLeds(false, true, false);    // 🟡 esperando start
  else
    setStatusLeds(false, false, true);    // 🟢 ejecutando
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

  // 2. Lógica del juego (solo si está corriendo)
  if (isGameRunning()) {
    if (!readyCountdownFinished()) return;

    bool completedNow = false;
    if (scanButtons(completedNow)) {
      if (isNetworkConnected()) {
        sendDispatchEvent("buttons:state-changed", 
                         buttonState, 
                         getLastPressed(), 
                         completedNow);
      }
    }

    if (completedNow) {
      gameStop();
      digitalWrite(LED_GAME, HIGH);
      Serial.println(F("🎉 JUEGO COMPLETADO - Esperando restart"));
    }
  }

  // 3. Actualizar LEDs de estado
  updateSystemStatus();
}