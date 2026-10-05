// AIRA firmware (ESP32): reads the gas sensors, classifies the breath sample ON
// THE DEVICE and sends the readings plus the verdict to the web app over WebSocket.
//
// Flow: connect to Wi-Fi -> calibrate the sensors in clean air -> wait for the
// "START" command from the web app -> stream 100 samples (10 s at 10 Hz) ->
// extract features -> run the model -> send the verdict.
//
// The model included here is a DEMO PLACEHOLDER, not a trained model. See
// "Plugging in a trained model" below to use your own (e.g. from Edge Impulse).
//
// Setup: copy secrets.example.h to secrets.h and fill in your Wi-Fi credentials.

#include <WiFi.h>
#include <WebSockets_Generic.h>
#include <WebSocketsServer_Generic.h> // Provides the WebSocket server class
#include <ArduinoJson.h>

#include "secrets.h" // WIFI_SSID and WIFI_PASSWORD (not committed to git)

// ====================================================================
// NETWORK
// ====================================================================
const char* ssid     = WIFI_SSID;
const char* password = WIFI_PASSWORD;

// Must match the port the web app connects to (NEXT_PUBLIC_ESP32_WS_PORT, default 81)
WebSocketsServer webSocket = WebSocketsServer(81);

// ====================================================================
// HARDWARE
// ====================================================================
// Analog input pins. Pins 32-35 are on ADC1, which keeps working while Wi-Fi is active.
const int PIN_MQ2    = 34;
const int PIN_MQ135  = 35;
const int PIN_MQ9    = 32;

// 100 samples every 100 ms = 10 s, matching the acquisition countdown in the web app
const int TOTAL_SAMPLES = 100;
const int SAMPLE_INTERVAL_MS = 100;

// Average raw ADC reading in clean air, per sensor (set by calibrateBaselines()).
// Readings are divided by these, so output values are ratios close to 1.0 at rest.
float baselineMQ2   = 1.0;
float baselineMQ135 = 1.0;
float baselineMQ9   = 1.0;

// Set by the WebSocket handler and consumed in loop(), so the streaming
// runs outside the network callback
bool isAcquisitionTriggered = false;

// ====================================================================
// MODEL
// ====================================================================
#define MODEL_NAME "Demo model (placeholder)"
#define MODEL_IS_PLACEHOLDER true // Set to false once a trained model is plugged in

const float SAMPLE_DT = SAMPLE_INTERVAL_MS / 1000.0; // seconds between samples
const int SLOPE_SAMPLES = 20;                         // initial slope is fitted on the first 2 s

// Features per sensor: peak ratio, initial slope (ratio/s), area under the curve (ratio*s)
const int FEATURES_PER_SENSOR = 3;
const int NUM_FEATURES = 3 * FEATURES_PER_SENSOR;

// Placeholder model: logistic regression over the features, ordered
// [mq2 peak, slope, AUC | mq135 peak, slope, AUC | mq9 peak, slope, AUC].
// Hand-picked values, tuned only for the web app's simulated profiles; they have
// no clinical meaning. Keep them in sync with WEIGHTS / REFS in lib/classifier.ts.
const float MODEL_WEIGHTS[NUM_FEATURES] = {0.5, 0, 0,  1.5, 0.5, 0.15,  0.5, 0, 0};
const float MODEL_REFS[NUM_FEATURES]    = {2.0, 0, 0,  2.5, 0.5, 20.0,  2.0, 0, 0};

// Ratio series of the current acquisition (one value per sample, per sensor)
float seriesMQ2[TOTAL_SAMPLES];
float seriesMQ135[TOTAL_SAMPLES];
float seriesMQ9[TOTAL_SAMPLES];

// ====================================================================
// Measures the clean-air baseline: average of 20 readings over ~2 s.
// Falls back to 1.0 if the average is 0, to avoid dividing by zero later.
// ====================================================================
void calibrateBaselines() {
  Serial.println("[AIRA] Starting baseline calibration in clean air...");
  long sumMQ2 = 0, sumMQ135 = 0, sumMQ9 = 0;
  int calibrationSamples = 20; 
  
  for (int i = 0; i < calibrationSamples; i++) {
    sumMQ2   += analogRead(PIN_MQ2);
    sumMQ135 += analogRead(PIN_MQ135);
    sumMQ9   += analogRead(PIN_MQ9);
    delay(100);
  }
  
  baselineMQ2   = (sumMQ2 / calibrationSamples) > 0 ? (sumMQ2 / calibrationSamples) : 1.0;
  baselineMQ135 = (sumMQ135 / calibrationSamples) > 0 ? (sumMQ135 / calibrationSamples) : 1.0;
  baselineMQ9   = (sumMQ9 / calibrationSamples) > 0 ? (sumMQ9 / calibrationSamples) : 1.0;
  
  Serial.printf("[AIRA] Calibration complete. Baselines - MQ2: %.1f, MQ135: %.1f, MQ9: %.1f\n", 
                baselineMQ2, baselineMQ135, baselineMQ9);
}

// ====================================================================
// Computes the 3 features of one sensor series: peak, initial slope and AUC.
// ====================================================================
void extractFeatures(const float* series, float* out) {
  // Peak: highest ratio reached
  float peak = series[0];
  for (int i = 1; i < TOTAL_SAMPLES; i++) {
    if (series[i] > peak) peak = series[i];
  }

  // Initial slope: least-squares line over the first SLOPE_SAMPLES points
  float sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (int i = 0; i < SLOPE_SAMPLES; i++) {
    float x = i * SAMPLE_DT;
    sx += x; sy += series[i]; sxx += x * x; sxy += x * series[i];
  }
  float slope = (SLOPE_SAMPLES * sxy - sx * sy) / (SLOPE_SAMPLES * sxx - sx * sx);

  // Area under the curve: trapezoidal integral over the whole window
  float auc = 0;
  for (int i = 1; i < TOTAL_SAMPLES; i++) {
    auc += (series[i - 1] + series[i]) / 2.0 * SAMPLE_DT;
  }

  out[0] = peak; out[1] = slope; out[2] = auc;
}

// ====================================================================
// Model inference: returns the probability that the sample is "risk".
//
// --- Plugging in a trained model --------------------------------------
// To replace this placeholder with a model trained in Edge Impulse:
//   1. Export the project as an "Arduino library" and install the .zip in the Arduino IDE.
//   2. #include <YOUR_PROJECT_inferencing.h>
//   3. Fill a float buffer with the raw window, one frame per sample with the axes
//      interleaved (mq2, mq135, mq9, mq2, mq135, ...), in the same order and window
//      length as your impulse. Edge Impulse's processing block computes the features
//      itself, so extractFeatures() above is not needed.
//   4. Run it:
//        signal_t signal;
//        numpy::signal_from_buffer(buffer, EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE, &signal);
//        ei_impulse_result_t result;
//        run_classifier(&signal, &result, false);
//      result.classification[i].label and .value hold the probability of each class.
//   5. Return the probability of your "risk" class and set MODEL_NAME and
//      MODEL_IS_PLACEHOLDER above. Check the example sketches generated with your
//      library for the exact names.
// ----------------------------------------------------------------------
// ====================================================================
float classifyWindow(const float* features) {
  float z = 0;
  for (int i = 0; i < NUM_FEATURES; i++) {
    z += MODEL_WEIGHTS[i] * (features[i] - MODEL_REFS[i]);
  }
  return 1.0 / (1.0 + exp(-z)); // logistic function
}

// ====================================================================
// Reads the sensors and broadcasts one JSON message per sample to all
// connected clients, e.g. {"time":0.1,"mq2":1.05,"mq135":1.20,"mq9":0.98}.
// Once the window is complete, classifies it and sends the verdict as a final
// message, e.g. {"result":{"label":"risk","scores":{"healthy":0.03,"risk":0.97},
// "model":"...","placeholder":true}}. Both formats are what the web app expects.
// Blocks for ~10 s.
// ====================================================================
void executeScreeningSession() {
  Serial.println("\n[AIRA - HARDWARE] >>> Blowing started! Generating and streaming data...");
  
  int sentCount = 0;

  for (int i = 0; i < TOTAL_SAMPLES; i++) {
    float rawMQ2   = analogRead(PIN_MQ2);
    float rawMQ135 = analogRead(PIN_MQ135);
    float rawMQ9   = analogRead(PIN_MQ9);
    
    float currentTime = (float)i / 10.0; // seconds since the start of the acquisition
    float ratioMQ2   = rawMQ2 / baselineMQ2;
    float ratioMQ135 = rawMQ135 / baselineMQ135;
    float ratioMQ9   = rawMQ9 / baselineMQ9;

    seriesMQ2[i]   = ratioMQ2;
    seriesMQ135[i] = ratioMQ135;
    seriesMQ9[i]   = ratioMQ9;
    
    char jsonBuffer[96];
    snprintf(jsonBuffer, sizeof(jsonBuffer), 
             "{\"time\":%.1f,\"mq2\":%.2f,\"mq135\":%.2f,\"mq9\":%.2f}", 
             currentTime, ratioMQ2, ratioMQ135, ratioMQ9);
    
    webSocket.broadcastTXT(jsonBuffer);
    sentCount++;
    
    // Log to serial only once per second to avoid slowing down the sampling
    if (i % 10 == 0) {
      Serial.printf("[AIRA - TX] Time: %.1fs | Progress: %d%% | JSON sent: %s\n", 
                    currentTime, i, jsonBuffer);
    }
    
    // Non-blocking wait that lets FreeRTOS run other tasks (e.g. the Wi-Fi stack)
    vTaskDelay(pdMS_TO_TICKS(SAMPLE_INTERVAL_MS));
  }
  
  Serial.printf("[AIRA - HARDWARE] >>> Blowing finished. Total samples sent: %d\n", sentCount);

  // On-device inference
  float features[NUM_FEATURES];
  extractFeatures(seriesMQ2,   &features[0]);
  extractFeatures(seriesMQ135, &features[FEATURES_PER_SENSOR]);
  extractFeatures(seriesMQ9,   &features[2 * FEATURES_PER_SENSOR]);

  float pRisk = classifyWindow(features);
  float pHealthy = 1.0 - pRisk;

  char resultJson[192];
  snprintf(resultJson, sizeof(resultJson),
           "{\"result\":{\"label\":\"%s\",\"scores\":{\"healthy\":%.3f,\"risk\":%.3f},"
           "\"model\":\"%s\",\"placeholder\":%s}}",
           pRisk >= 0.5 ? "risk" : "healthy", pHealthy, pRisk,
           MODEL_NAME, MODEL_IS_PLACEHOLDER ? "true" : "false");
  webSocket.broadcastTXT(resultJson);
  Serial.printf("[AIRA - MODEL] Verdict sent: %s\n\n", resultJson);
}

// ====================================================================
// Handles WebSocket events. A "START" text message triggers an acquisition.
// The web app also sends "STOP" at the end of its countdown; it is ignored
// because the stream already stops after TOTAL_SAMPLES.
// ====================================================================
void webSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.printf("[AIRA - NET] [%d] Frontend disconnected.\n", num);
      break;
      
    case WStype_CONNECTED: {
      IPAddress ip = webSocket.remoteIP(num);
      Serial.printf("[AIRA - NET] [%d] Frontend connected. Client IP: %d.%d.%d.%d\n", 
                    num, ip[0], ip[1], ip[2], ip[3]);
      break;
    }
    
    case WStype_TEXT:
      String message = (char*)payload;
      Serial.printf("[AIRA - RX] Message received from the web app: %s\n", message.c_str());
      
      if (message == "START") {
        isAcquisitionTriggered = true;
      }
      break;
  }
}

// ====================================================================
void setup() {
  Serial.begin(115200);
  analogReadResolution(12); // 12-bit ADC: raw values from 0 to 4095
  
  WiFi.begin(ssid, password);
  Serial.print("[AIRA] Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n[AIRA] Wi-Fi connected.");
  // This is the address to set as NEXT_PUBLIC_ESP32_IP in the web app
  Serial.print("[AIRA] Device IP address: ");
  Serial.println(WiFi.localIP());

  calibrateBaselines();

  webSocket.begin();
  webSocket.onEvent(webSocketEvent);
  
  Serial.println("[AIRA] Native WebSocket server running on port 81.");
}

// ====================================================================
void loop() {
  // Must be called often: accepts connections and dispatches incoming messages
  webSocket.loop();

  if (isAcquisitionTriggered) {
    isAcquisitionTriggered = false;
    executeScreeningSession();
  }
  
  delay(1);
}
