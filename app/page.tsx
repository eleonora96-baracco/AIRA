'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

import { ModeSelectionView } from '@/components/aira/mode-selection-view'
import { LoginView } from '@/components/aira/login-view'
import { DashboardView } from '@/components/aira/dashboard-view'
import { AcquisitionView } from '@/components/aira/acquisition-view'
import { AnalyzingView } from '@/components/aira/analyzing-view'
import { VerdictView } from '@/components/aira/verdict-view'
import { ConsentView } from '@/components/aira/consent-view'
import { classifier, inconclusiveResult, parseDeviceResult, type ClassificationResult } from '@/lib/classifier'

// ESP32 connection settings (used in "real" mode only), read from environment
// variables so no device address is hardcoded. Set them in .env.local (see
// .env.example). The firmware runs a native WebSocket server (arduinoWebSockets),
// by default on port 81 at "/".
const ESP32_IP = process.env.NEXT_PUBLIC_ESP32_IP ?? ''
const ESP32_WS_PORT = Number(process.env.NEXT_PUBLIC_ESP32_WS_PORT ?? 81)
const ESP32_WS_PATH = process.env.NEXT_PUBLIC_ESP32_WS_PATH ?? '/'
// Plain-text commands sent to the ESP32 over the WebSocket.
// They must match the commands the firmware expects.
const ESP32_START_CMD = 'START'
const ESP32_STOP_CMD = 'STOP'

export type AppView = 'mode-select' | 'login' | 'dashboard' | 'consent' | 'acquisition' | 'analyzing' | 'verdict'
export type SimulationMode = 'healthy' | 'risk' | null
// 'academic' = no device, simulated data · 'real' = live ESP32 device over WebSocket
export type OperatingMode = 'academic' | 'real' | null

export interface PatientData {
  cip: string
  edad: string
  genero: string
  tabaquismo: boolean
}

export interface SensorDataPoint {
  time: number
  mq2: number
  mq135: number
  mq9: number
}

export default function AIRADashboard() {
  const [currentView, setCurrentView] = useState<AppView>('mode-select')
  const [operatingMode, setOperatingMode] = useState<OperatingMode>(null)
  const [patientData, setPatientData] = useState<PatientData>({
    cip: '',
    edad: '',
    genero: '',
    tabaquismo: false,
  })
  const [sensorData, setSensorData] = useState<SensorDataPoint[]>([])
  const [simulationMode, setSimulationMode] = useState<SimulationMode>(null)
  const [countdown, setCountdown] = useState(10)
  const [isDeviceConnected, setIsDeviceConnected] = useState(false)
  // Stays false until the operator presses "Iniciar prueba"
  const [testStarted, setTestStarted] = useState(false)
  // Duration (seconds) of the analysis screen shown before the verdict
  const ANALYSIS_DURATION = 45
  const [analysisCountdown, setAnalysisCountdown] = useState(ANALYSIS_DURATION)

  // Verdict for the last acquisition; null until it is ready.
  // Real mode: sent by the ESP32. Academic mode: produced by the simulated on-device model.
  const [classification, setClassification] = useState<ClassificationResult | null>(null)

  // Refs so the WebSocket handlers always see the current socket and acquisition state
  // without re-running the connection effect
  const wsRef = useRef<WebSocket | null>(null)
  const isAcquiringRef = useRef(false)
  // Latest samples, so the classification effect can read them without depending on them
  const sensorDataRef = useRef<SensorDataPoint[]>([])
  sensorDataRef.current = sensorData

  // Generates 101 mock samples (0-10 s at 0.1 s steps) for the selected simulation profile.
  // Values are ratios against the clean-air baseline (about 1.0 at rest), like the
  // ones the ESP32 sends.
  const generateSensorData = useCallback((mode: SimulationMode): SensorDataPoint[] => {
    const data: SensorDataPoint[] = []
    for (let i = 0; i <= 100; i++) {
      const time = i / 10
      if (mode === 'healthy') {
        // Healthy profile: flat, close to the baseline
        data.push({
          time,
          mq2: 1.0 + Math.sin(time * 0.5) * 0.08 + Math.random() * 0.08,
          mq135: 1.05 + Math.cos(time * 0.3) * 0.1 + Math.random() * 0.06,
          mq9: 1.0 + Math.sin(time * 0.7) * 0.06 + Math.random() * 0.06,
        })
      } else if (mode === 'risk') {
        // Risk profile: strong rise with MQ-135 (VOC sensor) dominating
        const riskFactor = Math.min(1, time / 5) // Ramps up linearly over the first 5 s
        data.push({
          time,
          mq2: 1.0 + riskFactor * 1.8 + Math.sin(time * 0.8) * 0.3 + Math.random() * 0.15,
          mq135: 1.0 + riskFactor * 4.5 + Math.sin(time * 0.5) * 0.6 + Math.random() * 0.25, // Peaks around 6
          mq9: 1.0 + riskFactor * 1.2 + Math.cos(time * 0.6) * 0.2 + Math.random() * 0.1,
        })
      } else {
        // No profile selected: baseline with a little noise
        data.push({
          time,
          mq2: 1.0 + Math.random() * 0.05,
          mq135: 1.0 + Math.random() * 0.05,
          mq9: 1.0 + Math.random() * 0.05,
        })
      }
    }
    return data
  }, [])

  // Acquisition countdown: ticks once per second after the test starts,
  // then stops the capture and moves on to the analysis screen
  useEffect(() => {
    if (currentView !== 'acquisition') return
    // Do not tick until the operator has started the test
    if (!testStarted) return

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      // Capture finished: stop collecting samples
      isAcquiringRef.current = false
      // Tell the ESP32 to stop streaming
      if (operatingMode === 'real' && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(ESP32_STOP_CMD)
      }
      setAnalysisCountdown(ANALYSIS_DURATION)
      setCurrentView('analyzing')
    }
  }, [currentView, countdown, testStarted, operatingMode])

  // Academic mode only: simulate the device's on-board inference once the analysis starts.
  // In real mode the ESP32 computes the verdict itself and sends it over the WebSocket.
  useEffect(() => {
    if (currentView !== 'analyzing' || operatingMode !== 'academic') return

    let cancelled = false
    classifier
      .classify(sensorDataRef.current)
      .then((result) => {
        if (!cancelled) setClassification(result)
      })
      .catch((error) => {
        console.error('Classification failed:', error)
        if (!cancelled) setClassification(inconclusiveResult('Error al ejecutar el modelo de clasificación.'))
      })

    return () => {
      cancelled = true
    }
  }, [currentView, operatingMode])

  // Analysis countdown: shows the loading screen, then reveals the verdict once it is available
  useEffect(() => {
    if (currentView !== 'analyzing') return

    if (analysisCountdown > 0) {
      const timer = setTimeout(() => setAnalysisCountdown((c) => c - 1), 1000)
      return () => clearTimeout(timer)
    } else if (classification) {
      setCurrentView('verdict')
    } else if (operatingMode === 'real') {
      // The device should have answered long before the analysis screen ends
      setClassification(inconclusiveResult('El dispositivo no devolvió ningún veredicto.'))
    }
  }, [currentView, analysisCountdown, classification, operatingMode])

  // Device connection: simulated in academic mode, live WebSocket in real mode
  useEffect(() => {
    // No mode selected yet (user is still on the mode selection screen)
    if (!operatingMode) {
      setIsDeviceConnected(false)
      return
    }

    // Academic mode: no physical device, so after a short delay we report it as
    // "connected" to let the workflow proceed with simulated data.
    if (operatingMode === 'academic') {
      const connectionTimer = setTimeout(() => {
        setIsDeviceConnected(true)
      }, 1500)

      return () => clearTimeout(connectionTimer)
    }

    // Real mode: live WebSocket connection to the ESP32. Incoming samples are
    // appended to the chart while an acquisition is in progress.
    // Use wss:// when the app is served over HTTPS, since browsers block
    // insecure ws:// connections from secure pages (mixed content).
    if (!ESP32_IP) {
      console.error('NEXT_PUBLIC_ESP32_IP is not set: cannot connect to the ESP32 (see .env.example)')
      return
    }
    const wsProtocol =
      typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss' : 'ws'
    const WS_URL = `${wsProtocol}://${ESP32_IP}:${ESP32_WS_PORT}${ESP32_WS_PATH}`

    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    // Set on cleanup so onclose does not schedule a reconnect
    let closedByCleanup = false

    // Coerces a raw payload entry to numbers, defaulting missing/invalid fields to 0
    const parseSample = (entry: any): SensorDataPoint => ({
      time: parseFloat(entry.time) || 0,
      mq2: parseFloat(entry.mq2) || 0,
      mq135: parseFloat(entry.mq135) || 0,
      mq9: parseFloat(entry.mq9) || 0,
    })

    const connectWebSocket = () => {
      console.log('Connecting to ESP32:', WS_URL)
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('WebSocket connected to ESP32')
        setIsDeviceConnected(true)
      }

      ws.onclose = () => {
        console.log('WebSocket disconnected')
        setIsDeviceConnected(false)
        if (!closedByCleanup) {
          // Retry the connection every 3 seconds
          reconnectTimer = setTimeout(connectWebSocket, 3000)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setIsDeviceConnected(false)
      }

      ws.onmessage = (event) => {
        try {
          // Expected ESP32 message format (one sample per message):
          //   { "time": 0.1, "mq2": 1.5, "mq135": 2.0, "mq9": 1.2 }
          // A batch is also accepted: { "data": [ {...}, {...} ] }
          // After the last sample the device sends the verdict (handled below)
          console.debug('WebSocket message received:', event.data, '| acquiring:', isAcquiringRef.current)
          const payload = JSON.parse(event.data)

          // Verdict computed on the device: { "result": { "label": "risk", "scores": {...}, ... } }
          if (payload.result) {
            setClassification(parseDeviceResult(payload.result))
            return
          }

          // Ignore samples that arrive outside an active acquisition
          if (!isAcquiringRef.current) return

          if (payload.data && Array.isArray(payload.data)) {
            const batch = payload.data.map(parseSample)
            setSensorData((prev) => [...prev, ...batch])
          } else {
            setSensorData((prev) => [...prev, parseSample(payload)])
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error, '| raw:', event.data)
        }
      }
    }

    connectWebSocket()

    return () => {
      closedByCleanup = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      setIsDeviceConnected(false)
    }
  }, [operatingMode])

  const handleSelectMode = (mode: OperatingMode) => {
    setOperatingMode(mode)
    setCurrentView('login')
  }

  const handleLogin = () => {
    setCurrentView('dashboard')
  }

  // Validate the patient ID, then ask for consent before starting
  const handleStartScreening = () => {
    if (!patientData.cip) {
      alert('Datos incompletos - Por favor, introduzca el CIP del paciente')
      return
    }
    setCurrentView('consent')
  }

  // After consent, open the acquisition screen in its "ready" state.
  // The countdown and data capture only begin when the operator presses "Iniciar prueba".
  const handleConsentAccept = () => {
    setCountdown(10)
    setClassification(null)
    setSimulationMode(null)
    setTestStarted(false)
    isAcquiringRef.current = false
    setSensorData([])
    setCurrentView('acquisition')
  }

  // Start the countdown and, in real mode, tell the ESP32 to begin streaming
  const handleStartTest = () => {
    setCountdown(10)
    setClassification(null)
    setSensorData([])
    if (operatingMode === 'real') {
      // Start accepting samples arriving over the WebSocket
      isAcquiringRef.current = true
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(ESP32_START_CMD)
        console.log('Start command sent to ESP32:', ESP32_START_CMD)
      } else {
        console.warn('Could not send start command: WebSocket not connected')
      }
    } else {
      // Academic mode: show baseline data until a simulation profile is chosen
      setSensorData(generateSensorData(null))
    }
    setTestStarted(true)
  }

  // Academic mode only: switch to the chosen simulated profile
  const handleSimulate = (mode: 'healthy' | 'risk') => {
    setSimulationMode(mode)
    setSensorData(generateSensorData(mode))
  }

  // Placeholder: only shows a confirmation, no report is actually sent yet
  const handleDerivation = () => {
    alert('Derivación inteligente enviada correctamente - El informe ha sido enviado al sistema de gestión del CAP')
  }

  // Clear all patient and acquisition state and return to the dashboard
  const handleNewScreening = () => {
    isAcquiringRef.current = false
    setTestStarted(false)
    setPatientData({ cip: '', edad: '', genero: '', tabaquismo: false })
    setSensorData([])
    setSimulationMode(null)
    setClassification(null)
    setCurrentView('dashboard')
  }

  // Clear all state and return to mode selection so the mode can be re-chosen
  const handleLogout = () => {
    isAcquiringRef.current = false
    setTestStarted(false)
    setPatientData({ cip: '', edad: '', genero: '', tabaquismo: false })
    setSensorData([])
    setSimulationMode(null)
    setClassification(null)
    setOperatingMode(null)
    setCurrentView('mode-select')
  }

  return (
    <div className="min-h-screen bg-background">
      {currentView === 'mode-select' && <ModeSelectionView onSelectMode={handleSelectMode} />}

      {currentView === 'login' && (
        <LoginView operatingMode={operatingMode} onLogin={handleLogin} onBack={handleLogout} />
      )}
      
      {currentView === 'dashboard' && (
        <DashboardView
          patientData={patientData}
          setPatientData={setPatientData}
          isDeviceConnected={isDeviceConnected}
          operatingMode={operatingMode}
          onStartScreening={handleStartScreening}
          onLogout={handleLogout}
        />
      )}
      
      {currentView === 'consent' && (
        <ConsentView
          patientData={patientData}
          onAccept={handleConsentAccept}
          onCancel={() => setCurrentView('dashboard')}
        />
      )}
      
      {currentView === 'acquisition' && (
        <AcquisitionView
          countdown={countdown}
          sensorData={sensorData}
          simulationMode={simulationMode}
          operatingMode={operatingMode}
          testStarted={testStarted}
          isDeviceConnected={isDeviceConnected}
          onStartTest={handleStartTest}
          onSimulate={handleSimulate}
        />
      )}
      
      {currentView === 'analyzing' && <AnalyzingView />}

      {currentView === 'verdict' && classification && (
        <VerdictView
          result={classification}
          patientData={patientData}
          onDerivation={handleDerivation}
          onNewScreening={handleNewScreening}
        />
      )}
    </div>
  )
}
