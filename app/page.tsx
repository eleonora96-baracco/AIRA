'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

import { ModeSelectionView } from '@/components/aira/mode-selection-view'
import { LoginView } from '@/components/aira/login-view'
import { DashboardView } from '@/components/aira/dashboard-view'
import { AcquisitionView } from '@/components/aira/acquisition-view'
import { VerdictView } from '@/components/aira/verdict-view'
import { ConsentView } from '@/components/aira/consent-view'

// =====================================================
// HARDWARE CONFIG (modalidad "real")
// Cambia esta IP por la de tu ESP32 en la red local.
// La ruta /ws es el endpoint WebSocket del firmware.
// =====================================================
const ESP32_IP = '192.168.1.112'
const ESP32_WS_PATH = '/ws'

export type AppView = 'mode-select' | 'login' | 'dashboard' | 'consent' | 'acquisition' | 'verdict'
export type SimulationMode = 'healthy' | 'risk' | null
// 'academic' = sin dispositivo (datos simulados) · 'real' = dispositivo + WebSocket activo
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

  // Refs para la conexión WebSocket en modalidad "real"
  const wsRef = useRef<WebSocket | null>(null)
  const isAcquiringRef = useRef(false)

  // Generate mock sensor data based on simulation mode
  const generateSensorData = useCallback((mode: SimulationMode): SensorDataPoint[] => {
    const data: SensorDataPoint[] = []
    for (let i = 0; i <= 100; i++) {
      const time = i / 10
      if (mode === 'healthy') {
        // Healthy: Low, stable readings between 1.0 and 3.5
        data.push({
          time,
          mq2: 1.5 + Math.sin(time * 0.5) * 0.5 + Math.random() * 0.5,
          mq135: 2.0 + Math.cos(time * 0.3) * 0.7 + Math.random() * 0.3,
          mq9: 1.2 + Math.sin(time * 0.7) * 0.4 + Math.random() * 0.4,
        })
      } else if (mode === 'risk') {
        // Risk: High readings with MQ-135 dominating (VOCs indicator)
        const riskFactor = Math.min(1, time / 5) // Gradually increases
        data.push({
          time,
          mq2: 2.5 + riskFactor * 4 + Math.sin(time * 0.8) * 1.5 + Math.random() * 0.8,
          mq135: 3.0 + riskFactor * 7 + Math.sin(time * 0.5) * 2 + Math.random() * 1.2, // Dominates up to 10+
          mq9: 2.0 + riskFactor * 3 + Math.cos(time * 0.6) * 1 + Math.random() * 0.6,
        })
      } else {
        // Default: baseline readings
        data.push({
          time,
          mq2: 1.0 + Math.random() * 0.5,
          mq135: 1.2 + Math.random() * 0.5,
          mq9: 0.8 + Math.random() * 0.5,
        })
      }
    }
    return data
  }, [])

  // Handle countdown and auto-transition to verdict
  useEffect(() => {
    if (currentView !== 'acquisition') return

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      // Countdown finished - stop collecting samples and transition to verdict
      isAcquiringRef.current = false
      setCurrentView('verdict')
    }
  }, [currentView, countdown])

  // Device / WebSocket connection — behaviour depends on the selected operating mode
  useEffect(() => {
    // No mode selected yet (still on mode-select screen)
    if (!operatingMode) {
      setIsDeviceConnected(false)
      return
    }

    // =====================================================
    // ACADEMIC MODE: no physical device, data is simulated.
    // We mark the device as "connected" so the workflow can run.
    // =====================================================
    if (operatingMode === 'academic') {
      const connectionTimer = setTimeout(() => {
        setIsDeviceConnected(true)
      }, 1500)

      return () => clearTimeout(connectionTimer)
    }

    // =====================================================
    // REAL MODE: live WebSocket connection to the ESP32.
    // Streams one sample per message and appends it to the chart
    // while a screening acquisition is in progress.
    // =====================================================
    // ws:// for local HTTP, wss:// when the app is served over HTTPS
    // (a secure page cannot open an insecure ws:// socket - mixed content).
    const wsProtocol =
      typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss' : 'ws'
    const WS_URL = `${wsProtocol}://${ESP32_IP}${ESP32_WS_PATH}`

    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let closedByCleanup = false

    const parseSample = (entry: any): SensorDataPoint => ({
      time: parseFloat(entry.time) || 0,
      mq2: parseFloat(entry.mq2) || 0,
      mq135: parseFloat(entry.mq135) || 0,
      mq9: parseFloat(entry.mq9) || 0,
    })

    const connectWebSocket = () => {
      console.log('[v0] Conectando al ESP32:', WS_URL)
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('[v0] WebSocket conectado al ESP32')
        setIsDeviceConnected(true)
      }

      ws.onclose = () => {
        console.log('[v0] WebSocket desconectado')
        setIsDeviceConnected(false)
        if (!closedByCleanup) {
          // Reintenta la conexión cada 3 segundos
          reconnectTimer = setTimeout(connectWebSocket, 3000)
        }
      }

      ws.onerror = (error) => {
        console.log('[v0] Error de WebSocket:', error)
        setIsDeviceConnected(false)
      }

      ws.onmessage = (event) => {
        try {
          // Formato esperado del ESP32 (streaming muestra a muestra):
          //   { "time": 0.1, "mq2": 1.5, "mq135": 2.0, "mq9": 1.2 }
          // También se acepta un lote: { "data": [ {...}, {...} ] }
          const payload = JSON.parse(event.data)

          // Solo guardamos datos mientras se está realizando una adquisición
          if (!isAcquiringRef.current) return

          if (payload.data && Array.isArray(payload.data)) {
            const batch = payload.data.map(parseSample)
            setSensorData((prev) => [...prev, ...batch])
          } else {
            setSensorData((prev) => [...prev, parseSample(payload)])
          }
        } catch (error) {
          console.log('[v0] Error al parsear el mensaje del WebSocket:', error)
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

  // Handle operating mode selection (before login)
  const handleSelectMode = (mode: OperatingMode) => {
    setOperatingMode(mode)
    setCurrentView('login')
  }

  // Handle login
  const handleLogin = () => {
    setCurrentView('dashboard')
  }

  // Handle start screening - first require patient consent
  const handleStartScreening = () => {
    if (!patientData.cip) {
      alert('Datos incompletos - Por favor, introduzca el CIP del paciente')
      return
    }
    setCurrentView('consent')
  }

  // Handle consent accepted - begin the acquisition
  const handleConsentAccept = () => {
    setCountdown(10)
    setSimulationMode(null)
    if (operatingMode === 'real') {
      // Real mode: start with an empty chart and let the ESP32 stream fill it
      setSensorData([])
      isAcquiringRef.current = true
    } else {
      setSensorData(generateSensorData(null))
    }
    setCurrentView('acquisition')
  }

  // Handle simulation buttons
  const handleSimulate = (mode: 'healthy' | 'risk') => {
    setSimulationMode(mode)
    setSensorData(generateSensorData(mode))
  }

  // Handle smart derivation
  const handleDerivation = () => {
    alert('Derivación inteligente enviada correctamente - El informe ha sido enviado al sistema de gestión del CAP')
  }

  // Handle new screening (reset)
  const handleNewScreening = () => {
    isAcquiringRef.current = false
    setPatientData({ cip: '', edad: '', genero: '', tabaquismo: false })
    setSensorData([])
    setSimulationMode(null)
    setCurrentView('dashboard')
  }

  // Handle logout — returns to mode selection so the operating mode can be re-chosen
  const handleLogout = () => {
    isAcquiringRef.current = false
    setPatientData({ cip: '', edad: '', genero: '', tabaquismo: false })
    setSensorData([])
    setSimulationMode(null)
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
          onSimulate={handleSimulate}
        />
      )}
      
      {currentView === 'verdict' && (
        <VerdictView
          simulationMode={simulationMode}
          patientData={patientData}
          onDerivation={handleDerivation}
          onNewScreening={handleNewScreening}
        />
      )}
    </div>
  )
}
