#include <WiFi.h>
#include <HTTPClient.h>

// =========================
// WiFi Configuration
// =========================
const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Replace with your computer's local IP address
const char* SERVER_URL = "http://YOUR_COMPUTER_IP:5000/api/readings";

// =========================
// Sensor Pins
// =========================
#define PH_PIN 34
#define TDS_PIN 35
#define TEMP_PIN 32

// =========================
// Reading interval
// =========================
unsigned long previousMillis = 0;
const long interval = 5000;

// =========================
// Setup
// =========================
void setup() {
  Serial.begin(115200);

  pinMode(PH_PIN, INPUT);
  pinMode(TDS_PIN, INPUT);
  pinMode(TEMP_PIN, INPUT);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("Connecting to WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi connected!");
  Serial.print("ESP32 IP: ");
  Serial.println(WiFi.localIP());
}

// =========================
// Read pH
// =========================
float readPH() {
  int rawValue = analogRead(PH_PIN);

  float voltage = rawValue * (3.3 / 4095.0);

  // IMPORTANT:
  // Calibrate this formula using your actual pH module.
  float phValue = 7.0 + ((2.5 - voltage) / 0.18);

  return phValue;
}

// =========================
// Read TDS
// =========================
float readTDS() {
  int rawValue = analogRead(TDS_PIN);

  float voltage = rawValue * (3.3 / 4095.0);

  // Basic prototype estimation.
  // Calibrate with your actual TDS sensor.
  float tdsValue = voltage * 500.0;

  return tdsValue;
}

// =========================
// Read Temperature
// =========================
float readTemperature() {
  int rawValue = analogRead(TEMP_PIN);

  float voltage = rawValue * (3.3 / 4095.0);

  // Placeholder conversion.
  // Replace according to your actual temperature sensor.
  float temperature = voltage * 100.0;

  return temperature;
}

// =========================
// Send data to backend
// =========================
void sendData(float temperature, float ph, float tds) {

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected!");
    return;
  }

  HTTPClient http;

  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  String jsonData = "{";
  jsonData += "\"temperature\":" + String(temperature, 2) + ",";
  jsonData += "\"ph\":" + String(ph, 2) + ",";
  jsonData += "\"tds\":" + String(tds, 2);
  jsonData += "}";

  int responseCode = http.POST(jsonData);

  Serial.print("Server response: ");
  Serial.println(responseCode);

  http.end();
}

// =========================
// Main Loop
// =========================
void loop() {

  unsigned long currentMillis = millis();

  if (currentMillis - previousMillis >= interval) {

    previousMillis = currentMillis;

    float temperature = readTemperature();
    float ph = readPH();
    float tds = readTDS();

    Serial.println("-------------------------");
    Serial.print("Temperature: ");
    Serial.println(temperature);

    Serial.print("pH: ");
    Serial.println(ph);

    Serial.print("TDS: ");
    Serial.println(tds);

    sendData(temperature, ph, tds);
  }
}
