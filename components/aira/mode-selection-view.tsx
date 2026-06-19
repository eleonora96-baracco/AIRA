'use client'

import type { OperatingMode } from '@/app/page'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Wind, GraduationCap, Cpu, ChevronRight, Wifi, FlaskConical } from 'lucide-react'

interface ModeSelectionViewProps {
  onSelectMode: (mode: OperatingMode) => void
}

export function ModeSelectionView({ onSelectMode }: ModeSelectionViewProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-3xl space-y-8">
        {/* Logo and Brand */}
        <div className="flex flex-col items-center space-y-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25">
            <Wind className="h-10 w-10 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">AIRA Cloud</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Seleccione el modo de funcionamiento del sistema
            </p>
          </div>
        </div>

        {/* Mode Options */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Academic Mode */}
          <Card className="group flex flex-col border-border/50 shadow-lg transition-all hover:border-primary/50 hover:shadow-xl">
            <CardHeader>
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl">Modo Académico</CardTitle>
              <CardDescription>
                Funcionamiento sin dispositivo conectado, ideal para formación y demostraciones.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between gap-6">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-primary" />
                  Datos de sensores simulados
                </li>
                <li className="flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-primary" />
                  Sin conexión WebSocket al ESP32
                </li>
              </ul>
              <Button
                type="button"
                size="lg"
                className="w-full"
                onClick={() => onSelectMode('academic')}
              >
                Continuar en modo académico
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Real Mode */}
          <Card className="group flex flex-col border-border/50 shadow-lg transition-all hover:border-primary/50 hover:shadow-xl">
            <CardHeader>
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Cpu className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl">Modo Real</CardTitle>
              <CardDescription>
                Funcionamiento con el dispositivo AIRA conectado y comunicación en tiempo real.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between gap-6">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Wifi className="h-4 w-4 text-primary" />
                  Conexión WebSocket al dispositivo ESP32
                </li>
                <li className="flex items-center gap-2">
                  <Wifi className="h-4 w-4 text-primary" />
                  Lectura de sensores MOS-MEMS en directo
                </li>
              </ul>
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="w-full"
                onClick={() => onSelectMode('real')}
              >
                Continuar en modo real
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          © 2026 AIRA Medical Technologies · v1.0.0
        </p>
      </div>
    </div>
  )
}
