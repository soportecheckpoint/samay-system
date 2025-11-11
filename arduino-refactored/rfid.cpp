// ============================================================
// JUEGO: "Buttons" (10 botones) - Versión Refactorizada
// Separación clara: Lógica del juego vs Interfaz de red
// ============================================================

// Nota: Este código está diseñado para Arduino IDE
// Las librerías Arduino.h, SPI.h, EthernetENC.h se asumen incluidas

#include <SPI.h>
#include <EthernetENC.h>
#include <EthernetUdp.h>
#include <MFRC522.h>
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

// RFID Readers (5 lectores)
const int NUM_READERS = 5;
const uint8_t CS_PINS[NUM_READERS]  = { 19, 20, 21, 24, 22 };
const uint8_t RST_PINS[NUM_READERS] = { 14, 15, 16, 17, 18 };

// LEDs de estado
#define LED_ROJO     5
#define LED_AMARILLO 6
#define LED_VERDE    7
#define LED_GAME     9

// ============================================================
// SECCIÓN 2: VARIABLES GLOBALES DEL JUEGO
// ============================================================

// Instancias de lectores RFID
MFRC522* rc[NUM_READERS];

// Estado del juego
bool gameRunning = false;
bool completedLatch = false;

// Estado de tarjetas RFID
String lastUID[NUM_READERS] = {"","","","",""};
unsigned long lastTime[NUM_READERS] = {0,0,0,0,0};
const unsigned long REPEAT_TIMEOUT = 800;

// ============================================================
// SECCIÓN 3: LÓGICA DEL JUEGO (Funciones puras)
// ============================================================

String uidToHex(const MFRC522::Uid &u) {
  String s = "";
  for (byte i = 0; i < u.size; i++) {
    if (u.uidByte[i] < 0x10) s += "0";
    s += String(u.uidByte[i], HEX);
    if (i < u.size - 1) s += ":";
  }
  s.toUpperCase();
  return s;
}

bool verificarCompletado() {
  // Todos los lectores deben tener una tarjeta
  for (int i = 0; i < NUM_READERS; i++) 
    if (lastUID[i] == "") return false;
  
  // Todas las tarjetas deben ser diferentes
  for (int i = 0; i < NUM_READERS; i++)
    for (int j = i + 1; j < NUM_READERS; j++)
      if (lastUID[i] == lastUID[j]) return false;
  
  return true;
}

void resetRonda() {
  for (int i = 0; i < NUM_READERS; i++) {
    lastUID[i] = "";
    lastTime[i] = 0;
  }
  Serial.println(F("{\"info\":\"reset\",\"msg\":\"Listo para nueva ronda\"}"));
}

void gameInit() {
  resetRonda();
  gameRunning = false;
  completedLatch = false;
}

void gameStart() {
  resetRonda();
  completedLatch = false;
  gameRunning = true;
  digitalWrite(LED_GAME, LOW);
  DBG(F("🎮 JUEGO iniciado"));
}

void gameStop() {
  gameRunning = false;
  digitalWrite(LED_GAME, LOW);
  DBG(F("⏹️ Juego detenido"));
}

void gameRestart() {
  resetRonda();
  completedLatch = false;
  gameRunning = true;
  digitalWrite(LED_GAME, LOW);
  DBG(F("🔄 Juego reiniciado"));
}

bool isGameRunning() { return gameRunning; }

bool scanRFID(bool& completedNow) {
  bool anyChange = false;
  completedNow = false;
  
  for (int i = 0; i < NUM_READERS; i++) {
    MFRC522 &r = *rc[i];
    
    // Verificación rápida sin bloqueo
    if (!r.PICC_IsNewCardPresent()) continue;
    if (!r.PICC_ReadCardSerial()) continue;
    
    String uid = uidToHex(r.uid);
    unsigned long now = millis();
    
    // Evitar lecturas repetidas
    if (uid == lastUID[i] && (now - lastTime[i] < REPEAT_TIMEOUT)) {
      r.PICC_HaltA();
      continue;
    }
    
    lastUID[i] = uid;
    lastTime[i] = now;
    anyChange = true;
    
    #if DEBUG
      Serial.print(F("🏷️ Lector ")); Serial.print(i+1);
      Serial.print(F(" → ")); Serial.println(uid);
    #endif
    
    r.PICC_HaltA();
    r.PCD_StopCrypto1();  // Liberar recursos para siguiente lectura
  }
  
  // Verificar completitud
  completedNow = verificarCompletado();
  if (completedNow) {
    digitalWrite(LED_GAME, HIGH);
    DBG(F("✅ RFID COMPLETADO - Esperando restart"));
  }
  
  return anyChange || completedNow;
}

// ============================================================
// SECCIÓN 4: INTERFAZ DE RED (Variables y funciones)
// ============================================================

// ============================================================
// CONFIGURACIÓN DE RED - PRODUCCIÓN
// ============================================================
// Device: Arduino Buttons Game
// MAC: AA:BB:CC:DD:EE:A1 (única para este dispositivo)
// IP:  Asignada por DHCP (reserva recomendada: 192.168.18.101)
// Server: 192.168.18.164:3001
// Gateway: 192.168.18.1
// Subnet: 255.255.255.0
// ============================================================

// Configuración de red
const unsigned char ETH_CS = 69;
unsigned char mac[] = {0xAA,0xBB,0xCC,0xDD,0xEE,0xA3};  // MAC única - RFID Arduino
IPAddress serverIp(192,168,18,164);
const unsigned int serverPort = 3001;

// IP estática de fallback (si DHCP falla)
IPAddress ipFallback(192,168,18,115);
IPAddress dnsServer(192,168,18,1);
IPAddress gateway(192,168,18,1);
IPAddress subnet(255,255,255,0);

// Servidor local
const unsigned int ARD_PORT = 8080;
EthernetServer controlServer(ARD_PORT);

// Estado de conexión
bool connectedOK = false;
unsigned long nextReconnectMs = 0;
unsigned long reconnectDelayMs = 1000;
uint8_t failCount = 0;
const uint8_t MAX_FAILS_BEFORE_REINIT = 3;
const unsigned long RECONNECT_MAX_MS = 20000;
unsigned long lastPingReceivedMs = 0;
const unsigned long PING_TIMEOUT_MS = 8000;  // 8 segundos

// Endpoints
const char* ARDUINO_ID = "rfid";
const char* CONNECT_PATH = "/connect";
const char* DISPATCH_PATH = "/dispatch";

// Keep-alive connection
EthernetClient backendConn;

void networkInit() {
  DBG(F("  ↳ Configurando Ethernet..."));
  pinMode(ETH_CS, OUTPUT);
  digitalWrite(ETH_CS, HIGH);
  
  Ethernet.init(ETH_CS);
  // SPI ya fue inicializado en setupHardware()

  DBG(F("  ↳ Configurando IP estática..."));
  // Usar IP estática directamente (sin DHCP) para conexión instantánea
  Ethernet.begin(mac, ipFallback, dnsServer, gateway, subnet);
  delay(50);  // Delay mínimo para estabilización
  
  DBG(F("  ↳ Iniciando servidor local..."));
  controlServer.begin();
  DBG(F("  ↳ Red lista"));
}

bool isNetworkConnected() { return connectedOK; }

void setStatusLeds(bool red, bool yellow, bool green) {
  digitalWrite(LED_ROJO, red ? HIGH : LOW);
  digitalWrite(LED_AMARILLO, yellow ? HIGH : LOW);
  digitalWrite(LED_VERDE, green ? HIGH : LOW);
}

void resetReconnect() {
  reconnectDelayMs = 1000;
  failCount = 0;
}

void scheduleReconnectSoon() {
  nextReconnectMs = millis();
}

void scheduleReconnectLater() {
  nextReconnectMs = millis() + reconnectDelayMs;
}

void scheduleReconnectBackoff() {
  reconnectDelayMs = (reconnectDelayMs < RECONNECT_MAX_MS)
    ? reconnectDelayMs * 2 : RECONNECT_MAX_MS;
  nextReconnectMs = millis() + reconnectDelayMs;
}

void reinitEthernet() {
  DBG(F("⚙️ Reinicializando Ethernet..."));
  pinMode(ETH_CS, OUTPUT);
  digitalWrite(ETH_CS, HIGH);
  
  Ethernet.init(ETH_CS);
  // No reiniciar SPI, solo Ethernet

  Ethernet.begin(mac, ipFallback, dnsServer, gateway, subnet);
  delay(100);  // Delay reducido para reinicialización
  
  controlServer.begin();
  DBG(F("✅ Ethernet reinicializado"));
}

void onServerConnected() {
  connectedOK = true;
  nextReconnectMs = 0;
  lastPingReceivedMs = millis();
  resetReconnect();
  DBG(F("✅ Conexión servidor establecida/recuperada"));
}

void onServerDisconnected() {
  connectedOK = false;
  scheduleReconnectSoon();
  DBG(F("❌ Desconectado del servidor"));
}

bool postJsonToServer(const char* path, const String& body) {
  EthernetClient cli;
  cli.setTimeout(500);  // Timeout corto para fire-and-forget
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
  
  // Fire-and-forget: enviamos y cerramos rápidamente
  cli.flush();  // Asegura que se envíe todo
  cli.stop();
  return true;
}

bool sendConnect() {
  IPAddress my = Ethernet.localIP();
  String myIp = String(my[0]) + "." + String(my[1]) + "." + String(my[2]) + "." + String(my[3]);
  String body = "{\"id\":\"" + String(ARDUINO_ID) + "\",\"ip\":\"" + myIp + "\",\"port\":" + String(ARD_PORT) + "}";
  
  DBG(F("📤 /connect:")); DBG(body);
  
  // Intentar conectar con timeout más corto
  EthernetClient cli;
  cli.setTimeout(1000);  // Solo 1 segundo para no bloquear mucho
  
  if (!cli.connect(serverIp, serverPort)) {
    DBG(F("❌ No conecta a servidor"));
    onServerDisconnected();
    return false;
  }
  
  // Enviar request
  cli.print(F("POST ")); cli.print(CONNECT_PATH); cli.println(F(" HTTP/1.1"));
  cli.print(F("Host: ")); cli.print(serverIp); cli.print(F(":")); cli.println(serverPort);
  cli.println(F("User-Agent: Arduino"));
  cli.println(F("Content-Type: application/json"));
  cli.print(F("Content-Length: ")); cli.println(body.length());
  cli.println(F("Connection: close"));
  cli.println();
  cli.print(body);
  
  // Esperar respuesta máximo 800ms
  unsigned long t0 = millis();
  while (!cli.available() && (millis() - t0 < 800)) {
    delay(10);
  }
  
  // Leer respuesta
  while (cli.available()) cli.read();
  cli.stop();
  
  onServerConnected();
  return true;
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
      // Iniciar el juego automáticamente al reconectar
      if (!isGameRunning()) {
        gameStart();
        DBG(F("🎮 Juego iniciado tras reconexión"));
      }
    } else {
      failCount++;
      if (failCount >= MAX_FAILS_BEFORE_REINIT) {
        reinitEthernet();
        failCount = 0;
      }
      scheduleReconnectBackoff();
    }
  }
}

bool sendDispatchEvent(const char* eventName, const String uids[], bool completed) {
  int detectedCount = 0;
  for (int i = 0; i < NUM_READERS; i++) 
    if (uids[i] != "") detectedCount++;
  
  String body;
  body.reserve(360);

  body += "{\"arduinoId\":\""; body += ARDUINO_ID; body += "\",";
  body += "\"event\":\""; body += eventName; body += "\",";
  body += "\"data\":{";

  body += "\"badges\":[";
  for (int i = 0; i < NUM_READERS; i++) {
    body += "{\"id\":\"Lector"; body += (i+1);
    body += "\",\"name\":\""; body += uids[i];
    body += "\",\"slot\":"; body += (i+1);
    body += ",\"detected\":"; body += (uids[i] != "" ? "true" : "false");
    body += "}";
    if (i < NUM_READERS - 1) body += ",";
  }
  body += "],";

  body += "\"totalBadges\":"; body += NUM_READERS; body += ",";
  body += "\"detectedBadges\":"; body += detectedCount; body += ",";
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
    resetReconnect();
    scheduleReconnectSoon();
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
  DBG(F("  ↳ Configurando LEDs..."));
  pinMode(LED_ROJO, OUTPUT);
  pinMode(LED_AMARILLO, OUTPUT);
  pinMode(LED_VERDE, OUTPUT);
  pinMode(LED_GAME, OUTPUT);
  digitalWrite(LED_GAME, LOW);
  setStatusLeds(false, false, false);

  DBG(F("  ↳ Inicializando bus SPI..."));
  SPI.begin();
  SPI.setClockDivider(SPI_CLOCK_DIV2);

  DBG(F("  ↳ Inicializando lectores RFID..."));
  // Inicializar lectores RFID
  for (int i = 0; i < NUM_READERS; i++) {
    DBGF("     - Lector %d (CS:%d, RST:%d)...", i+1, CS_PINS[i], RST_PINS[i]);
    pinMode(CS_PINS[i], OUTPUT);
    digitalWrite(CS_PINS[i], HIGH);
    pinMode(RST_PINS[i], OUTPUT);
    digitalWrite(RST_PINS[i], HIGH);
    rc[i] = new MFRC522(CS_PINS[i], RST_PINS[i]);
    rc[i]->PCD_Init();
    delay(50);  // Pequeño delay entre inicializaciones
    DBGF("     ✓ Lector %d OK", i+1);
  }
  DBG(F("  ↳ Hardware listo"));
}

void updateSystemStatus() {
  if (!isNetworkConnected())
    setStatusLeds(true, false, false);    // 🔴 sin conexión
  else if (completedLatch)
    setStatusLeds(false, true, false);    // 🟡 completado
  else if (isGameRunning())
    setStatusLeds(false, false, true);    // 🟢 ejecutando
  else
    setStatusLeds(false, true, false);    // 🟡 esperando start
}

void setup() {
  Serial.begin(115200);
  delay(1000);  // Esperar a que Serial esté listo
  
  DBG(F(""));
  DBG(F("========================================"));
  DBG(F("  🎮 RFID Game - Iniciando..."));
  DBG(F("========================================"));
  
  DBG(F("📌 Inicializando hardware..."));
  setupHardware();
  
  DBG(F("🎯 Inicializando juego..."));
  gameInit();
  
  DBG(F("🌐 Inicializando red..."));
  networkInit();
  
  IPAddress myIp = Ethernet.localIP();
  Serial.print(F("📍 IP Local: ")); Serial.println(myIp);
  
  DBG(F("🔗 Intentando conexión al servidor..."));
  if (sendConnect()) {
    DBG(F("✅ Conexión inicial exitosa"));
    // Iniciar el juego automáticamente al conectar
    gameStart();
    DBG(F("🎮 Juego iniciado automáticamente"));
  } else {
    DBG(F("⚠️ Fallo en conexión inicial - reintentará automáticamente"));
  }

  updateSystemStatus();
  DBG(F("✅ Setup completado - entrando en loop"));
  DBG(F("========================================"));
}

void loop() {
  // 1. Actualizar interfaz de red (siempre máxima prioridad)
  networkUpdate();

  // 2. Actualizar LEDs de estado
  updateSystemStatus();

  // 3. Si el juego está completado o no corriendo, no escanear RFID
  if (completedLatch || !isGameRunning()) {
    delay(10);  // Pequeño delay para no saturar CPU
    return;
  }

  // 4. Escanear lectores RFID
  bool completedNow = false;
  if (scanRFID(completedNow)) {
    if (isNetworkConnected()) {
      sendDispatchEvent("rfid:state-changed", lastUID, completedNow);
    }
  }

  // 5. Si se completó ahora, marcar el latch
  if (completedNow) {
    completedLatch = true;
    gameRunning = false;
    digitalWrite(LED_GAME, HIGH);
    Serial.println(F("🟢 RFID COMPLETADO — esperando restart"));
  }

  // 6. Pequeño delay para no saturar el bus SPI (reducido para mejor respuesta)
  delay(50);
}