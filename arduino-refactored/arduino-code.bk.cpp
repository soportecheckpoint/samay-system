// ============================================================
// JUEGO: "Buttons" (10 botones) con Ping→Pong low-latency
// Fix timeout: elimina delay(10000) (READY no bloqueante con millis)
// - /control robusto (headers + Content-Length + body exacto, tiempos cortos)
// - /Ping prioridad, /Pong keep-alive, POST fire-and-forget, cola de dispatch
// ENC28J60: CS = D46 (ajústalo si usas otro)
// ============================================================

#include <SPI.h>
#include <EthernetENC.h>
#include <EthernetUdp.h>

// ====== DEBUG ======
#define DEBUG 1
#if DEBUG
  #define DBG(x)   do{ Serial.println(x); }while(0)
  #define DBGF(...) do{ char b[160]; snprintf(_b, sizeof(_b), __VA_ARGS_); Serial.println(_b);}while(0)
#else
  #define DBG(x)    do{}while(0)
  #define DBGF(...) do{}while(0)
#endif

/* ===== (Opcional) UDP Ping ===== */
#define ENABLE_UDP_PING 0
const uint16_t UDP_PING_PORT = 8081;
EthernetUDP Udp;

/* ===== RED / SERVIDOR CENTRAL ===== */
const uint8_t ETH_CS = 46;    // CS del ENC28J60
byte mac[] = {0x02,0xAB,0xCD,0xEF,0x12,0x34};

IPAddress serverIp(192,168,18,164);    // Backend
const uint16_t serverPort = 3001;

IPAddress ipLocal(192,168,18,120), dnsServer(192,168,18,1),
          gateway(192,168,18,1), subnet(255,255,255,0);

/* ===== ENDPOINTS ===== */
const char* ARDUINO_ID     = "buttons-arduino";
const char* CONNECT_PATH   = "/connect";
const char* DISPATCH_PATH  = "/dispatch";
const char* HEARTBEAT_PATH = "/heartbeat";
const char* PONG_PATH      = "/Pong";   // cámbialo a "/pong" si tu backend usa minúsculas

/* ===== SERVIDOR LOCAL ===== */
const uint16_t ARD_PORT = 8080;
EthernetServer controlServer(ARD_PORT);

/* ===== LEDS DE ESTADO ===== */
// 🔴 sin conexión | 🟡 esperando START | 🟢 ejecutando
#define LED_ROJO     5
#define LED_AMARILLO 6
#define LED_VERDE    7
#define LED_GAME     9
#define LED_READY    4   // LED READY (cuenta atrás no bloqueante)

static inline void setLeds(bool rojo, bool amarillo, bool verde) {
  digitalWrite(LED_ROJO, rojo ? HIGH : LOW);
  digitalWrite(LED_AMARILLO, amarillo ? HIGH : LOW);
  digitalWrite(LED_VERDE, verde ? HIGH : LOW);
}

/* ===== HEARTBEAT / RECONEXIÓN ===== */
unsigned long lastHb = 0;
const unsigned long HB_MS = 5000;

bool connectedOK = false;
unsigned long nextReconnectMs = 0;
const unsigned long RECONNECT_MS = 1000;

static inline void scheduleReconnectSoon()  { nextReconnectMs = millis(); }
static inline void scheduleReconnectLater() { nextReconnectMs = millis() + RECONNECT_MS; }
static inline void onConnectedOK() {
  connectedOK = true;
  nextReconnectMs = 0;
  DBG(F("✅ Conexión establecida/recuperada"));
}

static inline void updateLedStatus();

/* ===== UTILIDADES ===== */
String iso8601Uptime() {
  unsigned long ms = millis();
  unsigned long s  = ms / 1000UL;
  unsigned long hh = (s / 3600UL) % 24UL;
  unsigned long mm = (s / 60UL) % 60UL;
  unsigned long ss = s % 60UL;
  char buf[40];
  snprintf(buf, sizeof(buf), "1970-01-01T%02lu:%02lu:%02lu.000Z", hh, mm, ss);
  return String(buf);
}

/* ===== HTTP SALIENTE (POST JSON) - fire & forget ===== */
bool postJsonTo(const IPAddress& host, uint16_t port, const char* path, const String& body) {
  EthernetClient cli;
  cli.setTimeout(150);  // corto
  if (!cli.connect(host, port)) {
    DBG(F("❌ No conecta TCP para POST"));
    return false;
  }
  cli.print(F("POST ")); cli.print(path); cli.println(F(" HTTP/1.1"));
  cli.print(F("Host: ")); cli.print(host); cli.print(F(":")); cli.println(port);
  cli.println(F("User-Agent: Arduino"));
  cli.println(F("Content-Type: application/json"));
  cli.print  (F("Content-Length: ")); cli.println(body.length());
  cli.println(F("Connection: close"));
  cli.println();
  cli.print(body);

  unsigned long t0 = millis();
  while (cli.connected() && millis() - t0 < 50) while (cli.available()) cli.read();
  cli.stop();
  return true;
}

/* ===== /connect /heartbeat ===== */
bool sendConnect() {
  IPAddress my = Ethernet.localIP();
  String myIp = String(my[0]) + "." + String(my[1]) + "." + String(my[2]) + "." + String(my[3]);
  String body = "{\"id\":\"" + String(ARDUINO_ID) + "\",\"ip\":\"" + myIp + "\",\"port\":" + String(ARD_PORT) + "}";
  DBG(F("Body /connect:")); DBG(body);
  return postJsonTo(serverIp, serverPort, CONNECT_PATH, body);
}
bool sendHeartbeat() {
  String body = "{\"arduinoId\":\"" + String(ARDUINO_ID) + "\"}";
  return postJsonTo(serverIp, serverPort, HEARTBEAT_PATH, body);
}

/* ===== DISPATCH (evento BOTONES) ===== */
bool sendDispatchButtons(const char* eventName,
                         const bool state[], int lastPressed,
                         bool completed)
{
  String body;
  body.reserve(320);

  body += "{\"arduinoId\":\""; body += ARDUINO_ID; body += "\",";       // id
  body += "\"event\":\""; body += eventName; body += "\",";             // evento
  body += "\"data\":{";                                                // data

  body += "\"buttons\":[";
  for (int i = 0; i < 10; i++) {
    body += "{\"id\":"; body += (i+1); body += ",\"pressed\":";
    body += (state[i] ? "true" : "false"); body += "}";
    if (i < 9) body += ",";
  }
  body += "],";

  int lp = (lastPressed >= 0 && lastPressed < 10) ? (lastPressed + 1) : 0;
  body += "\"lastPressed\":"; body += lp; body += ",";
  body += "\"completed\":"; body += (completed ? "true" : "false");
  body += "}}";

  DBG(F("Body /dispatch:")); DBG(body);
  return postJsonTo(serverIp, serverPort, DISPATCH_PATH, body);
}

/* ===== BOTONES (10 unidades) ===== */
#define NUM_BUTTONS 10
enum Btn { BOTON1=0,BOTON2,BOTON3,BOTON4,BOTON5,BOTON6,BOTON7,BOTON8,BOTON9,BOTON10 };

// --- CONFIGURA AQUÍ la combinación correcta ---
const uint8_t CORRECT_BUTTONS[] = { BOTON1, BOTON3 };   // ejemplo: 1 y 3 encendidos
const uint8_t NUM_CORRECT = sizeof(CORRECT_BUTTONS)/sizeof(CORRECT_BUTTONS[0]);

const uint8_t buttonPins[NUM_BUTTONS] = {21,20,19,18,17,16,15,14,2,3};
const uint8_t ledPinsBtn[NUM_BUTTONS] = {24,26,28,30,32,34,36,38,40,42};

bool lastState[NUM_BUTTONS] = {0};
unsigned long debounceTime[NUM_BUTTONS] = {0};
const unsigned long DEBOUNCE_MS = 50;

static inline bool isInCorrect(uint8_t idx){
  for (uint8_t k=0;k<NUM_CORRECT;k++) if (idx==CORRECT_BUTTONS[k]) return true;
  return false;
}
bool completedButtons(const bool st[]){
  for (uint8_t k=0;k<NUM_CORRECT;k++) if (!st[CORRECT_BUTTONS[k]]) return false;
  for (uint8_t i=0;i<NUM_BUTTONS;i++) if (!isInCorrect(i) && st[i]) return false;
  return true;
}
void applyButtonLeds() {
  for (int i=0;i<NUM_BUTTONS;i++)
    digitalWrite(ledPinsBtn[i], lastState[i] ? HIGH : LOW);
}
void resetStates(bool value=false) {
  for (int i=0;i<NUM_BUTTONS;i++) lastState[i]=value;
  applyButtonLeds();
}

/* ===== ESTADO DE JUEGO y READY no bloqueante ===== */
bool gameRunning = false;          // espera {"command":"start"}
volatile bool dispatchPending = false;

// READY no bloqueante:
bool readyActive = false;
unsigned long readyStartMs = 0;
const unsigned long READY_DELAY_MS = 10000;   // 10 s no bloqueante

static inline void startReadyCountdown() {
  readyActive = true;
  readyStartMs = millis();
  digitalWrite(LED_READY, HIGH);
  DBG(F("💡 READY: cuenta 10s iniciada (no bloqueante)"));
}
static inline void cancelReady() {
  readyActive = false;
  digitalWrite(LED_READY, LOW);
}
static inline bool readyFinished() {
  if (!readyActive) return true;
  if (millis() - readyStartMs >= READY_DELAY_MS) {
    readyActive = false;
    digitalWrite(LED_READY, LOW);
    DBG(F("✅ READY finalizado"));
    return true;
  }
  return false;
}

static inline void onGameCompleted() {
  dispatchPending = true;         // cola para enviar /dispatch fuera del camino crítico
  gameRunning = false;
  digitalWrite(LED_GAME, HIGH);
  cancelReady();
  updateLedStatus();
}

static inline void updateLedStatus() {
  if (!connectedOK)            setLeds(true,  false, false); // 🔴 sin conexión
  else if (!gameRunning)       setLeds(false, true,  false); // 🟡 esperando start
  else                         setLeds(false, false, true ); // 🟢 ejecutando
}

/* ===== Conexión keep-alive para /Pong ===== */
EthernetClient backend;  // reutilizable para GET /Pong

bool ensureBackend() {
  if (backend.connected()) return true;
  backend.stop();
  backend.setTimeout(100);                 // corto
  if (!backend.connect(serverIp, serverPort)) {
    DBG(F("❌ No conecta backend keep-alive"));
    return false;
  }
  return true;
}
void backendDrain(unsigned long ms = 10) {
  unsigned long t0 = millis();
  while (backend.available() && millis() - t0 < ms) (void)backend.read();
}

/* ===== LATENCIA: /Ping y /Pong ===== */
bool extractTimeNumber(const String& s, String& timeVal) {
  int i = s.indexOf("time=");
  if (i < 0) return false;
  i += 5;
  timeVal = "";
  while (i < (int)s.length()) {
    char ch = s[i];
    if (ch >= '0' && ch <= '9') { timeVal += ch; i++; }
    else break;
  }
  return timeVal.length() > 0;
}
void sendPongKeepAlive(const String& timeVal, unsigned long t1_us, unsigned long t2_us) {
  float t1_ms = t1_us / 1000.0;
  float t2_ms = t2_us / 1000.0;
  float dt_ms = t2_ms - t1_ms;

  if (!ensureBackend()) return;

  String url = String(PONG_PATH) + "?time=" + timeVal +
               "&t1_ms=" + String(t1_ms,3) +
               "&t2_ms=" + String(t2_ms,3) +
               "&dt_ms=" + String(dt_ms,3);

  backend.print(F("GET ")); backend.print(url); backend.println(F(" HTTP/1.1"));
  backend.print(F("Host: ")); backend.println(serverIp);
  backend.println(F("Connection: keep-alive"));
  backend.println();

  backendDrain(10);  // dreno breve, no bloquear
}

/* ===== RESPUESTAS HTTP ===== */
void sendHTTP200(EthernetClient& c,const String& cmd){
  String ts = iso8601Uptime();
  c.println(F("HTTP/1.1 200 OK"));
  c.println(F("Content-Type: application/json; charset=utf-8"));
  c.println(F("Connection: close"));
  c.println();
  c.print(F("{\"status\":\"ok\",\"command\":\"")); c.print(cmd);
  c.print(F("\",\"timestamp\":\"")); c.print(ts); c.println(F("\"}"));
}
void sendHTTP400(EthernetClient& c,const __FlashStringHelper* msg){
  c.println(F("HTTP/1.1 400 Bad Request"));
  c.println(F("Content-Type: text/plain; charset=utf-8"));
  c.println(F("Connection: close"));
  c.println(); c.println(msg);
}

/* ===== Lectura robusta de headers ===== */
int readHeadersAndGetContentLength(EthernetClient& c, unsigned long timeoutMs = 600) {
  String headers = "";
  unsigned long t0 = millis();
  while (c.connected() && millis() - t0 < timeoutMs) {
    if (!c.available()) { delay(1); continue; }
    char ch = c.read();
    headers += ch;
    if (headers.endsWith("\r\n\r\n")) break;     // fin de headers
  }
  if (!headers.endsWith("\r\n\r\n")) return -1;  // no llegó bien

  String hLower = headers; hLower.toLowerCase();
  int idx = hLower.indexOf("content-length:");
  if (idx < 0) return 0;                         // sin body
  int eol = hLower.indexOf("\r\n", idx);
  String val = headers.substring(idx + 15, eol);
  val.trim();
  return val.toInt();
}

/* ===== /control (POST JSON) con body exacto y rápido ===== */
void handleControlRequest(EthernetClient& c, int contentLength){
  if (contentLength < 0) { sendHTTP400(c, F("Headers incompletos")); c.stop(); return; }
  if (contentLength > 512){ sendHTTP400(c, F("Content-Length invalido")); c.stop(); return; }

  char body[513]; int n=0; unsigned long t0=millis();
  while(n<contentLength && millis()-t0<600){ if(c.available()) body[n++]=c.read(); }
  body[n]=0;

  Serial.print(F("[/control] Body: ")); Serial.println(body);
  if (n < contentLength) { sendHTTP400(c, F("Body incompleto")); c.stop(); return; }

  String b=body; b.replace(" ",""); b.replace("\r",""); b.replace("\n","");

  if(b.indexOf("\"command\":\"start\"")>=0){
    resetStates(false);
    digitalWrite(LED_GAME,LOW);
    gameRunning=true;
    startReadyCountdown();              // READY sin bloquear
    sendHTTP200(c,"start"); c.stop(); updateLedStatus(); return;
  }
  if(b.indexOf("\"command\":\"stop\"")>=0){
    gameRunning=false;
    cancelReady();
    sendHTTP200(c,"stop"); c.stop(); updateLedStatus(); return;
  }
  if(b.indexOf("\"command\":\"restart\"")>=0){
    gameRunning=false;
    resetStates(false);
    digitalWrite(LED_GAME,LOW);
    cancelReady();
    sendHTTP200(c,"restart"); c.stop(); updateLedStatus(); return;
  }

  sendHTTP400(c,F("JSON no reconocido. Usa {\"command\":\"start|stop|restart\"}"));
  c.stop();
}

/* ===== SETUP ===== */
void setup(){
  Serial.begin(115200);
  pinMode(LED_ROJO,OUTPUT); pinMode(LED_AMARILLO,OUTPUT);
  pinMode(LED_VERDE,OUTPUT); pinMode(LED_GAME,OUTPUT);
  pinMode(LED_READY,OUTPUT);
  digitalWrite(LED_GAME,LOW); digitalWrite(LED_READY,LOW);
  setLeds(false,false,false);

  for(int i=0;i<NUM_BUTTONS;i++) pinMode(buttonPins[i],INPUT_PULLUP);
  for(int i=0;i<NUM_BUTTONS;i++){ pinMode(ledPinsBtn[i],OUTPUT); digitalWrite(ledPinsBtn[i],LOW); }

  pinMode(ETH_CS,OUTPUT); digitalWrite(ETH_CS,HIGH);
  Ethernet.init(ETH_CS);

  // SPI rápido (Mega 16MHz → 8MHz)
  SPI.begin(); SPI.setClockDivider(SPI_CLOCK_DIV2);

  Ethernet.begin(mac,ipLocal,dnsServer,gateway,subnet);
  delay(200);

  Serial.print(F("IP local: ")); Serial.println(Ethernet.localIP());
  if(sendConnect()) onConnectedOK(); else { connectedOK=false; scheduleReconnectSoon(); }

  lastHb=millis();
  controlServer.begin();
  updateLedStatus();

  #if ENABLE_UDP_PING
    Udp.begin(UDP_PING_PORT);
    DBGF("UDP Ping activo en puerto %u", UDP_PING_PORT);
  #endif
}

/* ===== LOOP ===== */
void loop(){
  // 1) Servidor local PRIMERO: Ping y control
  if (EthernetClient c = controlServer.available()) {
    c.setTimeout(100);
    String req = c.readStringUntil('\n'); req.trim();
    if (req.length()) { DBGF("⇐ %s", req.c_str()); }

    int s1=req.indexOf(' '), s2=req.indexOf(' ',s1+1);
    if(s1>=0&&s2>=0){
      String method=req.substring(0,s1);
      String path  =req.substring(s1+1,s2);

      int contentLength = readHeadersAndGetContentLength(c, 600);

      // --- GET /Ping?time=... (prioridad) ---
      if(method=="GET" && (path.startsWith("/Ping")||path.startsWith("/ping"))){
        String timeVal; unsigned long t1=micros(); bool ok=extractTimeNumber(path,timeVal);
        if(ok){
          unsigned long t2=micros();
          sendPongKeepAlive(timeVal, t1, t2);

          float t1_ms=t1/1000.0, t2_ms=t2/1000.0, dt_ms=t2_ms-t1_ms;
          c.println(F("HTTP/1.1 200 OK"));
          c.println(F("Content-Type: text/plain"));
          c.println(F("Connection: close"));
          c.println();
          c.print(F("PONG SENT time=")); c.print(timeVal);
          c.print(F(" t1_ms=")); c.print(t1_ms,3);
          c.print(F(" t2_ms=")); c.print(t2_ms,3);
          c.print(F(" dt_ms=")); c.println(dt_ms,3);
          c.stop();
        } else { sendHTTP400(c, F("Falta parametro time= en /Ping")); c.stop(); }
      }
      // --- GET /control?command=... (atajo) ---
      else if (method=="GET" && path.startsWith("/control")) {
        int q = path.indexOf('?');
        String qs = (q>=0)? path.substring(q+1) : "";
        qs.replace("%22","\"");
        if (qs.indexOf("command=restart")>=0) {
          gameRunning=false; resetStates(false); digitalWrite(LED_GAME,LOW);
          cancelReady(); sendHTTP200(c,"restart"); c.stop(); updateLedStatus();
        } else if (qs.indexOf("command=start")>=0) {
          resetStates(false); digitalWrite(LED_GAME,LOW); gameRunning=true;
          startReadyCountdown(); sendHTTP200(c,"start"); c.stop(); updateLedStatus();
        } else if (qs.indexOf("command=stop")>=0) {
          gameRunning=false; cancelReady(); sendHTTP200(c,"stop"); c.stop(); updateLedStatus();
        } else { sendHTTP400(c, F("Falta ?command=start|stop|restart")); c.stop(); }
      }
      // --- POST /control (robusto y rápido) ---
      else if(method=="POST" && path=="/control"){
        handleControlRequest(c, contentLength);
      }
      else { sendHTTP400(c,F("Usa POST /control o GET /Ping?time=123")); c.stop(); }
    } else c.stop();
  }

  // (Opcional) UDP Ping
  #if ENABLE_UDP_PING
  {
    int psize = Udp.parsePacket();
    if (psize > 0) {
      char buf[128]; int n = Udp.read(buf, min(psize, (int)sizeof(buf)-1)); buf[n]=0;
      String s = buf; String timeVal;
      unsigned long t1 = micros();
      bool ok = extractTimeNumber(s, timeVal);
      if (ok) {
        unsigned long t2 = micros();
        float t1_ms=t1/1000.0, t2_ms=t2/1000.0, dt_ms=t2_ms-t1_ms;
        char reply[128];
        snprintf(reply, sizeof(reply), "PONG time=%s t1_ms=%.3f t2_ms=%.3f dt_ms=%.3f",
                 timeVal.c_str(), t1_ms, t2_ms, dt_ms);
        Udp.beginPacket(Udp.remoteIP(), Udp.remotePort());
        Udp.write((const uint8_t*)reply, strlen(reply));
        Udp.endPacket();
      }
    }
  }
  #endif

  // 2) Envíos no urgentes (cola)
  if (connectedOK && dispatchPending) {
    if (sendDispatchButtons("buttons:state-changed", lastState, -1, true))
      dispatchPending = false;
    else { connectedOK=false; scheduleReconnectSoon(); }
  }

  // 3) Heartbeat (no bloqueante)
  if (connectedOK && millis()-lastHb>=HB_MS) {
    lastHb = millis();
    bool hb = sendHeartbeat();
    DBG(hb?F("Heartbeat OK"):F("Heartbeat falló"));
    if(!hb){ connectedOK=false; scheduleReconnectSoon(); }
  }

  // 4) Reintentos de conexión
  if(!connectedOK && (long)(millis()-nextReconnectMs)>=0){
    DBG(F("↻ Intentando /connect..."));
    if(sendConnect()) onConnectedOK(); else scheduleReconnectLater();
  }

  // 5) LEDs de estado
  updateLedStatus();

  // ===== LÓGICA DEL JUEGO =====
  if(!gameRunning) return;

  // Espera READY no bloqueante
  if (!readyFinished()) return;

  // Lectura / toggle / dispatch
  static unsigned long lastScan = 0;
  if (millis() - lastScan < 5) return;  // pequeña cadencia
  lastScan = millis();

  bool anyChange=false;
  int lastPressedIdx=-1;

  for(int i=0;i<NUM_BUTTONS;i++){
    bool pressedNow = (digitalRead(buttonPins[i]) == LOW); // PULLUP → LOW = presionado
    if(pressedNow && (millis()-debounceTime[i]>DEBOUNCE_MS)){
      debounceTime[i]=millis();
      lastState[i] = !lastState[i];           // toggle
      anyChange = true;
      lastPressedIdx = i;
      digitalWrite(ledPinsBtn[i], lastState[i]?HIGH:LOW);
      #if DEBUG
        Serial.print(F("Botón ")); Serial.print(i+1);
        Serial.print(F(" → ")); Serial.println(lastState[i]?F("ON"):F("OFF"));
      #endif
    }
  }

  bool completedNow = completedButtons(lastState);
  digitalWrite(LED_GAME, completedNow ? HIGH : LOW);

  if(anyChange || completedNow){
    if(connectedOK){
      sendDispatchButtons("buttons:state-changed", lastState, lastPressedIdx, completedNow);
    }
  }

  if(completedNow){
    Serial.println(F("🟢 BOTONES completo — esperando comando restart"));
    onGameCompleted();  // marca y sale; /dispatch final se envía por la cola
  }
}