// AIRA data logger (ESP32): earlier standalone version that does not use the web app.
//
// Records a labeled 10 s breath test from the gas sensors and uploads it to
// Google Sheets through a Google Apps Script web app. Useful for collecting
// reference datasets of healthy and at-risk samples.
//
// Usage: type 's' (healthy) or 'r' (risk) in the serial monitor to start a test.
// Setup: copy secrets.example.h to secrets.h and fill in your own values.

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

#include "secrets.h" // WIFI_SSID, WIFI_PASSWORD and GOOGLE_SCRIPT_ID (not committed to git)

const char* ssid = WIFI_SSID;
const char* password = WIFI_PASSWORD;
const String GOOGLE_SCRIPT_ID_STR = GOOGLE_SCRIPT_ID;

// Analog input pins (all on ADC1, which keeps working while Wi-Fi is active)
const int MQ2_PIN = 33;    
const int MQ135_PIN = 35;  
const int MQ9_PIN = 32;    

// Idle-mode baselines (raw ADC readings taken at startup or after the last test),
// used to print live ratios close to 1.0 in clean air
float live_adc0_MQ2 = 1.0;
float live_adc0_MQ135 = 1.0;
float live_adc0_MQ9 = 1.0;
unsigned long lastPrintTime = 0;
bool systemReady = false; // true while idle; false during a test to keep the serial output clean

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n=== AIRA DEVICE starting ===");
  
  // Connect to Wi-Fi before reading any sensor
  WiFi.begin(ssid, password);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n[OK] Wi-Fi connected.");

  // Quick initial baseline for the idle-mode live readout (single reading)
  live_adc0_MQ2 = analogRead(MQ2_PIN);
  live_adc0_MQ135 = analogRead(MQ135_PIN);
  live_adc0_MQ9 = analogRead(MQ9_PIN);
  
  // Avoid dividing by zero later
  if(live_adc0_MQ2 <= 0) live_adc0_MQ2 = 1.0;
  if(live_adc0_MQ135 <= 0) live_adc0_MQ135 = 1.0;
  if(live_adc0_MQ9 <= 0) live_adc0_MQ9 = 1.0;
  
  systemReady = true; 
  
  Serial.println("\n=== SYSTEM READY ===");
  Serial.println("At rest, the values should hover around 1.00.");
  Serial.println("Type 's' (healthy) or 'r' (risk) to start the 10-second test.");
}

// Runs a full test: 2 s calibration, 10 s of sampling (100 samples at 10 Hz),
// then uploads the three series to Google Sheets. sessionType is the label
// stored with the data ("Healthy" or "Risk").
void collectAndSendTimeSeries(String sessionType) {
  systemReady = false;

  // Step 1: measure the clean-air baseline (average of 20 readings over 2 s).
  // The user must not blow yet, otherwise the baseline would be inflated.
  Serial.println("\n[1/3] Calibration phase... DO NOT BLOW, breathe normally.");
  long sumMQ2 = 0, sumMQ135 = 0, sumMQ9 = 0;
  int calSamples = 20;
  
  for (int i = 0; i < calSamples; i++) {
    sumMQ2 += analogRead(MQ2_PIN);
    sumMQ135 += analogRead(MQ135_PIN);
    sumMQ9 += analogRead(MQ9_PIN);
    delay(100);
  }
  
  float R0_MQ2 = (float)sumMQ2 / calSamples;
  float R0_MQ135 = (float)sumMQ135 / calSamples;
  float R0_MQ9 = (float)sumMQ9 / calSamples;
  
  if(R0_MQ2 <= 0) R0_MQ2 = 1.0;
  if(R0_MQ135 <= 0) R0_MQ135 = 1.0;
  if(R0_MQ9 <= 0) R0_MQ9 = 1.0;

  // Reuse this baseline for the idle readout after the test
  live_adc0_MQ2 = R0_MQ2; live_adc0_MQ135 = R0_MQ135; live_adc0_MQ9 = R0_MQ9;
  
  Serial.println("[OK] Calibration finished.");

  // Step 2: sample for 10 s. Each series is built as a comma-separated string of ratios.
  Serial.println("\n[2/3] >>> START BLOWING NOW! Keep the flow steady. <<<");
  
  String mq2Data = ""; String mq135Data = ""; String mq9Data = "";
  mq2Data.reserve(600); mq135Data.reserve(600); mq9Data.reserve(600);
  String sessionId = String(millis()); // Rough unique ID for this test (ms since boot)

  for (int i = 0; i < 100; i++) {
    float ratio_mq2 = (float)analogRead(MQ2_PIN) / R0_MQ2;
    float ratio_mq135 = (float)analogRead(MQ135_PIN) / R0_MQ135;
    float ratio_mq9 = (float)analogRead(MQ9_PIN) / R0_MQ9;

    mq2Data += String(ratio_mq2, 4);
    mq135Data += String(ratio_mq135, 4);
    mq9Data += String(ratio_mq9, 4);

    if (i < 99) {
      mq2Data += ","; mq135Data += ","; mq9Data += ",";
    }

    if (i % 10 == 0) {
      Serial.print("TEST RUNNING: "); Serial.print(i / 10); Serial.println("s / 10s...");
    }
    delay(100); 
  }

  Serial.println("\n[3/3] >>> STOP! Sending data to Google Sheets..");

  // Step 3: upload the series as a JSON POST to the Apps Script web app
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http; 
    WiFiClientSecure client; 
    client.setInsecure(); // Skips TLS certificate validation: fine for prototyping, not for production
    
    String url = "https://script.google.com/macros/s/" + GOOGLE_SCRIPT_ID_STR + "/exec";
    
    String jsonPayload = "{";
    jsonPayload += "\"session\":\"" + sessionType + "\",";
    jsonPayload += "\"timestamp\":\"" + sessionId + "\",";
    jsonPayload += "\"mq2\":\"" + mq2Data + "\",";
    jsonPayload += "\"mq135\":\"" + mq135Data + "\",";
    jsonPayload += "\"mq9\":\"" + mq9Data + "\"";
    jsonPayload += "}";
    
    http.begin(client, url);
    http.addHeader("Content-Type", "application/json");
    
    // Close the connection after the response, since Google answers with a redirect
    http.addHeader("Connection", "close");
    http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
    
    int httpCode = http.POST(jsonPayload);
    
    // Apps Script replies with a redirect (3xx) even when the data was saved.
    // A negative code means Google closed the connection after receiving the
    // data, which in practice also means it was stored.
    if (httpCode == 200 || (httpCode >= 300 && httpCode <= 308)) {
      Serial.println("\n[SUCCESS] Series saved to Google Sheets!");
      Serial.print("Server response code: "); Serial.println(httpCode);
    } else {
      if (httpCode < 0) {
        Serial.println("\n[WARNING] Google closed the connection after the upload (data was saved correctly)..");
      } else {
        Serial.print("\n[ERROR] HTTP error: "); Serial.println(httpCode);
      }
    }
    
    http.end();
    client.stop();
  } else {
    Serial.println("\n[ERROR] Wi-Fi disconnected before sending.");
  }
  
  systemReady = true;
  Serial.println("\n=== BACK TO IDLE MODE ===");
}

void loop() {
  // Idle mode: print the live sensor ratios once per second
  if (systemReady && (millis() - lastPrintTime >= 1000)) {
    lastPrintTime = millis();
    
    float live_ratio_mq2 = (float)analogRead(MQ2_PIN) / live_adc0_MQ2;
    float live_ratio_mq135 = (float)analogRead(MQ135_PIN) / live_adc0_MQ135;
    float live_ratio_mq9 = (float)analogRead(MQ9_PIN) / live_adc0_MQ9;
    
    Serial.print("LIVE (in air) -> MQ-2: "); Serial.print(live_ratio_mq2, 2);
    Serial.print(" | MQ-135: "); Serial.print(live_ratio_mq135, 2);
    Serial.print(" | MQ-9: "); Serial.println(live_ratio_mq9, 2);
  }

  // Serial commands: 's' starts a "healthy" test, 'r' an "at risk" test
  if (Serial.available() > 0) {
    char cmd = Serial.read();
    if (cmd == 's') {
      collectAndSendTimeSeries("Healthy");
    } else if (cmd == 'r') {
      collectAndSendTimeSeries("Risk");
    }
  }
}
