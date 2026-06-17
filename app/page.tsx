'use client'

import { useState, useEffect, useCallback } from 'react'

import { LoginView } from '@/components/aira/login-view'
import { DashboardView } from '@/components/aira/dashboard-view'
import { AcquisitionView } from '@/components/aira/acquisition-view'
import { VerdictView } from '@/components/aira/verdict-view'
import { ConsentView } from '@/components/aira/consent-view'

export type AppView = 'login' | 'dashboard' | 'consent' | 'acquisition' | 'verdict'
export type SimulationMode = 'healthy' | 'risk' | null

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
  const [currentView, setCurrentView] = useState<AppView>('login')
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
      // Countdown finished - transition to verdict
      setCurrentView('verdict')
    }
  }, [currentView, countdown])

  // WebSocket connection for real ESP32 hardware (commented for mockup)
  useEffect(() => {
    /*
    // =====================================================
    // HARDWARE READY: WebSocket connection to ESP32
    // Uncomment this block when connecting to real hardware
    // =====================================================
    
    const WS_URL = 'ws://192.168.1.XX/ws' // Replace XX with your ESP32 IP
    
    let ws: WebSocket | null = null
    
    const connectWebSocket = () => {
      ws = new WebSocket(WS_URL)
      
      ws.onopen = () => {
        console.log('[AIRA] WebSocket connected to ESP32')
        setIsDeviceConnected(true)
      }
      
      ws.onclose = () => {
        console.log('[AIRA] WebSocket disconnected')
        setIsDeviceConnected(false)
        // Attempt reconnection after 3 seconds
        setTimeout(connectWebSocket, 3000)
      }
      
      ws.onerror = (error) => {
        console.error('[AIRA] WebSocket error:', error)
        setIsDeviceConnected(false)
      }
      
      ws.onmessage = (event) => {
        try {
          // Expected JSON format from ESP32:
          // { "data": [{ "time": 0.1, "mq2": 1.5, "mq135": 2.0, "mq9": 1.2 }, ...] }
          // The payload should contain ~100 entries for a 10-second reading
          const payload = JSON.parse(event.data)
          
          if (payload.data && Array.isArray(payload.data)) {
            const parsedData: SensorDataPoint[] = payload.data.map((entry: any) => ({
              time: parseFloat(entry.time) || 0,
              mq2: parseFloat(entry.mq2) || 0,
              mq135: parseFloat(entry.mq135) || 0,
              mq9: parseFloat(entry.mq9) || 0,
            }))
            
            setSensorData(parsedData)
            console.log('[AIRA] Received sensor data:', parsedData.length, 'entries')
          }
        } catch (error) {
          console.error('[AIRA] Error parsing WebSocket message:', error)
        }
      }
    }
    
    connectWebSocket()
    
    return () => {
      if (ws) {
        ws.close()
      }
    }
    */

    // Simulated device connection for demo
    const connectionTimer = setTimeout(() => {
      setIsDeviceConnected(true)
    }, 1500)

    return () => clearTimeout(connectionTimer)
  }, [])

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
    setSensorData(generateSensorData(null))
    setSimulationMode(null)
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
    setPatientData({ cip: '', edad: '', genero: '', tabaquismo: false })
    setSensorData([])
    setSimulationMode(null)
    setCurrentView('dashboard')
  }

  // Handle logout
  const handleLogout = () => {
    setPatientData({ cip: '', edad: '', genero: '', tabaquismo: false })
    setSensorData([])
    setSimulationMode(null)
    setCurrentView('login')
  }

  return (
    <div className="min-h-screen bg-background">
      {currentView === 'login' && <LoginView onLogin={handleLogin} />}
      
      {currentView === 'dashboard' && (
        <DashboardView
          patientData={patientData}
          setPatientData={setPatientData}
          isDeviceConnected={isDeviceConnected}
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
