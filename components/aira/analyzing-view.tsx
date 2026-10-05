'use client'

import { Wind, Loader2 } from 'lucide-react'

export function AnalyzingView() {
  return (
    <div className="min-h-screen bg-background">
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

      <main className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-10 px-4 py-24 text-center">
        <div className="relative flex h-40 w-40 items-center justify-center">
          <span className="absolute h-full w-full rounded-full border-4 border-muted" />
          <span className="absolute h-full w-full animate-spin rounded-full border-4 border-transparent border-t-primary" />
          <Wind className="h-12 w-12 text-primary" />
        </div>

        <div className="flex flex-col items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-foreground text-balance">
            Esperando el resultado...
          </h1>
          <p className="max-w-md text-pretty text-muted-foreground">
            El sistema está analizando los datos capturados de los sensores. Por favor, espera unos
            instantes mientras se procesa el resultado del cribado.
          </p>
        </div>
      </main>
    </div>
  )
}
