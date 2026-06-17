'use client'

import type { PatientData, SimulationMode } from '@/app/page'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Wind, CheckCircle2, AlertTriangle, Send, RotateCcw, FileText, User } from 'lucide-react'

interface VerdictViewProps {
  simulationMode: SimulationMode
  patientData: PatientData
  onDerivation: () => void
  onNewScreening: () => void
}

export function VerdictView({
  simulationMode,
  patientData,
  onDerivation,
  onNewScreening,
}: VerdictViewProps) {
  const isHealthy = simulationMode !== 'risk'

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Wind className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-foreground">AIRA Cloud</span>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4 text-primary" />
            <span>Resultado del Análisis</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="space-y-6">
          {/* Patient Summary */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-primary" />
                Datos del Paciente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                <p className="text-muted-foreground">CIP</p>
                <p className="font-medium">{patientData.cip || 'N/A'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Verdict Card */}
          {isHealthy ? (
            <Card className="border-[#4A7C59]/50 bg-[#4A7C59]/5 shadow-lg shadow-[#4A7C59]/10">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#4A7C59]/20">
                    <CheckCircle2 className="h-7 w-7 text-[#4A7C59]" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-[#4A7C59]">Resultado: SANO</CardTitle>
                    <CardDescription className="text-[#4A7C59]/80">
                      Clasificación de bajo riesgo
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="border-[#4A7C59]/30 bg-[#4A7C59]/10">
                  <CheckCircle2 className="h-4 w-4 text-[#4A7C59]" />
                  <AlertTitle className="text-[#4A7C59]">No se detectan biomarcadores de riesgo gaseoso</AlertTitle>
                  <AlertDescription className="text-[#4A7C59]/90">
                    El análisis de Compuestos Orgánicos Volátiles (COVs) en el aire exhalado no presenta 
                    patrones asociados a patologías pulmonares. El paciente puede ser dado de alta con 
                    seguimiento rutinario según protocolo CatSalut.
                  </AlertDescription>
                </Alert>

                {/* Send Report Button */}
                <Button
                  onClick={onDerivation}
                  className="w-full h-12 bg-[#4A7C59] hover:bg-[#3D6649] shadow-lg shadow-[#4A7C59]/25"
                  size="lg"
                >
                  <Send className="mr-2 h-5 w-5" />
                  Enviar Informe
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Registro del resultado en el sistema de gestión sanitario CatSalut
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-[#C55A43]/50 bg-[#C55A43]/5 shadow-lg shadow-[#C55A43]/10">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#C55A43]/20 animate-pulse">
                    <AlertTriangle className="h-7 w-7 text-[#C55A43]" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-[#C55A43]">ALERTA: Patrón de Riesgo Detectado</CardTitle>
                    <CardDescription className="text-[#C55A43]/80">
                      Requiere derivación clínica.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert variant="destructive" className="border-[#C55A43]/50 bg-[#C55A43]/10">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Detectado patrón de COVs compatible con Estadio I</AlertTitle>
                  <AlertDescription>
                    El análisis de sensores MOS-MEMS ha identificado un perfil de biomarcadores gaseosos 
                    (especialmente elevación significativa en MQ-135/VOCs) que requiere confirmación 
                    diagnóstica mediante pruebas complementarias. Se recomienda activar protocolo clínico.
                  </AlertDescription>
                </Alert>

                {/* Derivation Button */}
                <Button
                  onClick={onDerivation}
                  className="w-full h-12 bg-[#C55A43] hover:bg-[#B04A35] shadow-lg shadow-[#C55A43]/25"
                  size="lg"
                >
                  <Send className="mr-2 h-5 w-5" />
                  Enviar Informe 
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Derivación inteligente al sistema de gestión sanitario CatSalut
                </p>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-center pt-4">
            <Button variant="outline" onClick={onNewScreening} size="lg">
              <RotateCcw className="mr-2 h-4 w-4" />
              Nuevo Cribado
            </Button>
          </div>

          {/* Footer Info */}
          <div className="text-center pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              Este resultado es orientativo y no sustituye el diagnóstico médico profesional. 
              Sistema AIRA certificado para uso en la red sanitaria CatSalut.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
