#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Adafruit_NeoPixel.h>

// ====== CONFIG ======
const char* WIFI_SSID = "TU_SSID";
const char* WIFI_PASS = "TU_PASSWORD";

// IP de tu PC corriendo Flask (misma red local)
const char* STATE_URL = "http://192.168.1.50:5000/api/state";

// WS2812
#define LED_PIN   5
#define LED_COUNT 8
Adafruit_NeoPixel strip(LED_COUNT, LED_PIN, NEO_GRB + NEO_KHZ800);

// Polling
unsigned long lastPoll = 0;
const unsigned long POLL_MS = 400; // 250–1000ms típico
long lastRev = -1;

// ====== UTIL ======
uint32_t parseHexColor(const char* s) {
  // Espera "#RRGGBB"
  if (!s || s[0] != '#' || strlen(s) != 7) return strip.Color(0,0,0);

  auto hex2 = [](char c)->int {
    if (c >= '0' && c <= '9') return c - '0';
    if (c >= 'a' && c <= 'f') return 10 + (c - 'a');
    if (c >= 'A' && c <= 'F') return 10 + (c - 'A');
    return 0;
  };

  int r = hex2(s[1])*16 + hex2(s[2]);
  int g = hex2(s[3])*16 + hex2(s[4]);
  int b = hex2(s[5])*16 + hex2(s[6]);
  return strip.Color(r, g, b);
}

void applyState(uint32_t color, int count) {
  count = constrain(count, 0, LED_COUNT);
  for (int i = 0; i < LED_COUNT; i++) {
    strip.setPixelColor(i, (i < count) ? color : 0);
  }
  strip.show();
}

bool fetchAndUpdate() {
  if (WiFi.status() != WL_CONNECTED) return false;

  HTTPClient http;
  http.begin(STATE_URL);
  int code = http.GET();
  if (code != 200) {
    http.end();
    return false;
  }

  String body = http.getString();
  http.end();

  StaticJsonDocument<256> doc;
  DeserializationError err = deserializeJson(doc, body);
  if (err) return false;

  const char* colorStr = doc["color"] | "#000000";
  int count = doc["count"] | 0;
  long rev = doc["rev"] | 0;

  // Si no cambió, no re-escribas la tira (menos parpadeo y menos CPU)
  if (rev == lastRev) return true;
  lastRev = rev;

  uint32_t color = parseHexColor(colorStr);
  applyState(color, count);
  return true;
}

void ensureWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < 8000) {
    delay(150);
  }
}

void setup() {
  Serial.begin(115200);

  strip.begin();
  strip.setBrightness(80); // 0-255 (ajusta)
  strip.show();            // apaga al inicio

  ensureWiFi();
}

void loop() {
  ensureWiFi();

  unsigned long now = millis();
  if (now - lastPoll >= POLL_MS) {
    lastPoll = now;
    fetchAndUpdate();
  }
}
