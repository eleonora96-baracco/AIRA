import type { SensorDataPoint } from '@/app/page'

// =====================================================================
// Verdict types and helpers.
//
// In "real" mode the verdict is produced ON THE DEVICE: the ESP32 runs the
// classification model after the 10 s breath window and sends the result to
// the web app over the WebSocket (see parseDeviceResult). The web app only
// displays it.
//
// In "academic" mode there is no device, so `classifier` below SIMULATES the
// on-device inference using the same features and weights as the firmware
// placeholder model (firmware/aira_streaming). Both are DEMO PLACEHOLDERS,
// not trained or validated models. Keep the weights in sync with the firmware.
// To use a real model, replace the placeholder in the firmware (see the
// "Plugging in a trained model" notes in aira_streaming.ino).
// =====================================================================

export type ClassLabel = 'healthy' | 'risk' | 'inconclusive'

export interface ClassificationResult {
  label: ClassLabel
  /** Probability of the predicted class, from 0 to 1 (0 when inconclusive) */
  confidence: number
  /** Probability per class */
  scores: { healthy: number; risk: number }
  modelName: string
  /** True for the demo model, so the UI can say the result is not real */
  isPlaceholder: boolean
  /** Explains why the result is inconclusive */
  reason?: string
}

export interface Classifier {
  name: string
  /** Receives one full acquisition (time-ordered samples) and returns the predicted class */
  classify(samples: SensorDataPoint[]): Promise<ClassificationResult>
}

/** Sampling rate of the acquisition (the ESP32 firmware sends 10 samples per second) */
export const SAMPLE_RATE_HZ = 10
/** Samples in a full acquisition window: 10 s at 10 Hz */
export const WINDOW_SAMPLES = 100
/** Below this many samples the acquisition is considered incomplete */
export const MIN_SAMPLES = 50
/** Samples used to fit the initial slope: the first 2 s of the window */
const SLOPE_SAMPLES = 20

export function inconclusiveResult(reason: string, modelName = 'N/A'): ClassificationResult {
  return {
    label: 'inconclusive',
    confidence: 0,
    scores: { healthy: 0, risk: 0 },
    modelName,
    isPlaceholder: false,
    reason,
  }
}

/**
 * Validates the verdict message sent by the ESP32, e.g.
 *   { "label": "risk", "scores": { "healthy": 0.03, "risk": 0.97 },
 *     "model": "My model v1", "placeholder": false }
 * Anything malformed becomes an "inconclusive" result instead of a wrong verdict.
 */
export function parseDeviceResult(raw: any): ClassificationResult {
  const healthy = Number(raw?.scores?.healthy)
  const risk = Number(raw?.scores?.risk)
  const modelName = typeof raw?.model === 'string' ? raw.model : 'Unknown device model'

  if ((raw?.label !== 'healthy' && raw?.label !== 'risk') || !Number.isFinite(healthy) || !Number.isFinite(risk)) {
    return inconclusiveResult('El dispositivo devolvió un resultado no válido.', modelName)
  }

  return {
    label: raw.label,
    confidence: Math.max(healthy, risk),
    scores: { healthy, risk },
    modelName,
    isPlaceholder: raw.placeholder === true,
  }
}

// ---------------------------------------------------------------------
// Simulated on-device model (academic mode only)
// ---------------------------------------------------------------------

/** Features of one sensor: highest ratio reached, initial slope (ratio/s) and area under the curve (ratio*s) */
function extractFeatures(series: number[]) {
  const dt = 1 / SAMPLE_RATE_HZ

  const peak = Math.max(...series)

  // Least-squares line over the first SLOPE_SAMPLES points
  const n = Math.min(SLOPE_SAMPLES, series.length)
  let sx = 0, sy = 0, sxx = 0, sxy = 0
  for (let i = 0; i < n; i++) {
    const x = i * dt
    sx += x
    sy += series[i]
    sxx += x * x
    sxy += x * series[i]
  }
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx)

  // Trapezoidal integral over the whole window
  let auc = 0
  for (let i = 1; i < series.length; i++) auc += ((series[i - 1] + series[i]) / 2) * dt

  return [peak, slope, auc]
}

// Feature order: [mq2 peak, slope, AUC | mq135 peak, slope, AUC | mq9 peak, slope, AUC].
// Hand-picked values, tuned only so the simulated "healthy" and "risk" profiles
// separate. They mean nothing clinically. MUST match W / REF in the firmware.
const WEIGHTS = [0.5, 0, 0, 1.5, 0.5, 0.15, 0.5, 0, 0]
const REFS = [2.0, 0, 0, 2.5, 0.5, 20.0, 2.0, 0, 0]

const MODEL_NAME = 'Demo model (placeholder)'

async function classifyWithPlaceholder(samples: SensorDataPoint[]): Promise<ClassificationResult> {
  if (samples.length < MIN_SAMPLES) {
    return inconclusiveResult(`Muestras insuficientes: ${samples.length} recibidas, mínimo ${MIN_SAMPLES}.`, MODEL_NAME)
  }

  const window = samples.slice(0, WINDOW_SAMPLES)
  const features = [
    ...extractFeatures(window.map((s) => s.mq2)),
    ...extractFeatures(window.map((s) => s.mq135)),
    ...extractFeatures(window.map((s) => s.mq9)),
  ]

  // Logistic regression -> probability of "risk"
  const z = features.reduce((sum, x, i) => sum + WEIGHTS[i] * (x - REFS[i]), 0)
  const risk = 1 / (1 + Math.exp(-z))
  const healthy = 1 - risk

  return {
    label: risk >= 0.5 ? 'risk' : 'healthy',
    confidence: Math.max(risk, healthy),
    scores: { healthy, risk },
    modelName: MODEL_NAME,
    isPlaceholder: true,
  }
}

/** Simulates the device's on-board inference (used in academic mode only) */
export const classifier: Classifier = {
  name: MODEL_NAME,
  classify: classifyWithPlaceholder,
}
