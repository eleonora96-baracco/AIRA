'use client'

import type { PatientData } from '@/app/page'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Wind, Cpu, User, Play, LogOut } from 'lucide-react'

interface DashboardViewProps {
  patientData: PatientData
  setPatientData: (data: PatientData) => void
  isDeviceConnected: boolean
  onStartScreening: () => void
  onLogout: () => void
}

export function DashboardView({
  patientData,
  setPatientData,
  isDeviceConnected,
  onStartScreening,
  onLogout,
}: DashboardViewProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Wind className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-foreground">AIRA Cloud</span>
          </div>

          {/* Operator Info & Device Status */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-foreground">Farmacia Comunitaria</p>
              <p className="text-xs text-muted-foreground">Llc. García · Barcelona</p>
            </div>

            {/* Device Status Badge */}
            <Badge
              variant={isDeviceConnected ? 'default' : 'destructive'}
              className={`gap-2 ${isDeviceConnected ? 'bg-[#4A7C59] hover:bg-[#4A7C59]' : ''}`}
            >
              <span className={`h-2 w-2 rounded-full ${isDeviceConnected ? 'bg-[#68D391] animate-pulse' : 'bg-[#C55A43]'}`} />
              <Cpu className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {isDeviceConnected ? 'Dispositivo AIRA Conectado' : 'Desconectado'}
              </span>
            </Badge>

            {/* Logout Button */}
            <Button variant="ghost" size="icon" onClick={onLogout} title="Cerrar sesión">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="space-y-8">
          {/* Page Title */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Panel de Cribado</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Detección temprana de cáncer de pulmón mediante análisis de aire exhalado
            </p>
          </div>

          {/* Patient Data Form */}
          <Card className="border-border/50 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Datos del Paciente
              </CardTitle>
              <CardDescription>
                Introduzca los datos del paciente para iniciar el proceso de cribado patológico
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* CIP Field */}
              <div className="space-y-2">
                <Label htmlFor="patient-cip" className="text-sm font-medium">
                  Código de Identificación del Paciente (CIP)
                </Label>
                <Input
                  id="patient-cip"
                  type="text"
                  placeholder="Ej: BARA1234567890"
                  value={patientData.cip}
                  onChange={(e) => setPatientData({ ...patientData, cip: e.target.value })}
                />
              </div>

              {/* Start Screening Button */}
              <Button
                onClick={onStartScreening}
                className="w-full h-14 text-lg font-semibold shadow-lg shadow-primary/25"
                size="lg"
                disabled={!isDeviceConnected}
              >
                <Play className="mr-2 h-5 w-5" />
                INICIAR CRIBADO PATOLÓGICO
              </Button>

              {!isDeviceConnected && (
                <p className="text-center text-sm text-muted-foreground">
                  Esperando conexión con el dispositivo ESP32...
                </p>
              )}
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex items-start gap-4 pt-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Wind className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">Protocolo de Cribado AIRA</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  El paciente deberá exhalar de forma constante durante 10 segundos en el dispositivo 
                  de análisis. Los sensores MOS-MEMS detectarán biomarcadores gaseosos (COVs) 
                  asociados a patologías pulmonares en estadios tempranos.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
