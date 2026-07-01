'use client'

import { Wind, Loader2 } from 'lucide-react'

interface AnalyzingViewProps {
  // Segundos restantes del análisis (cuenta atrás desde 45)
  secondsLeft: number
  totalSeconds: number
}

export function AnalyzingView({ secondsLeft, totalSeconds }: AnalyzingViewProps) {
  const progress = ((totalSeconds - secondsLeft) / totalSeconds) * 100
  const radius = 90
  const circumference = 2 * Math.PI * radius

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
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>Procesando muestra</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-8 px-4 py-20 text-center">
        {/* Circular progress with countdown */}
        <div className="relative flex h-56 w-56 items-center justify-center">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 200 200">
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-muted"
            />
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              className="text-primary transition-[stroke-dashoffset] duration-1000 ease-linear"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (progress / 100) * circumference}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-5xl font-bold tabular-nums text-foreground">{secondsLeft}</span>
            <span className="text-sm text-muted-foreground">segundos</span>
          </div>
        </div>

        {/* Message */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground text-balance">
              Esperando el resultado...
            </h1>
          </div>
          <p className="max-w-md text-pretty text-muted-foreground">
            El sistema está analizando los datos capturados de los sensores. Por favor, espera unos
            instantes mientras se procesa el resultado del cribado.
          </p>
        </div>
      </main>
    </div>
  )
}
