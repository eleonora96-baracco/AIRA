'use client'

import type { SensorDataPoint, SimulationMode, OperatingMode } from '@/app/page'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts'
import { Wind, Activity, Heart, AlertTriangle, Play, Cpu } from 'lucide-react'

interface AcquisitionViewProps {
  countdown: number
  sensorData: SensorDataPoint[]
  simulationMode: SimulationMode
  operatingMode: OperatingMode
  testStarted: boolean
  isDeviceConnected: boolean
  onStartTest: () => void
  onSimulate: (mode: 'healthy' | 'risk') => void
}

const chartConfig = {
  mq2: {
    label: 'MQ-2 (Hidrocarburos/Alcohol)',
    color: 'hsl(var(--chart-1))',
  },
  mq135: {
    label: 'MQ-135 (VOCs/Calidad Aire)',
    color: 'hsl(var(--chart-2))',
  },
  mq9: {
    label: 'MQ-9 (Monóxido de Carbono)',
    color: 'hsl(var(--chart-3))',
  },
} satisfies ChartConfig

export function AcquisitionView({
  countdown,
  sensorData,
  simulationMode,
  operatingMode,
  testStarted,
  isDeviceConnected,
  onStartTest,
  onSimulate,
}: AcquisitionViewProps) {
  const progress = ((10 - countdown) / 10) * 100
  const circumference = 2 * Math.PI * 80

  // Sample count and latest values for the live readout (real mode)
  const isReal = operatingMode === 'real'
  const sampleCount = sensorData.length
  const latest = sampleCount > 0 ? sensorData[sampleCount - 1] : null

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
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {testStarted ? (
              <>
                <Activity className="h-4 w-4 animate-pulse text-primary" />
                <span>Adquisición de datos en curso...</span>
              </>
            ) : (
              <>
                <Cpu className="h-4 w-4 text-primary" />
                <span>Listo para iniciar la prueba</span>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="space-y-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative flex h-48 w-48 items-center justify-center">
              <svg className="absolute h-48 w-48 -rotate-90 transform">
                <circle
                  cx="96"
                  cy="96"
                  r="80"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-muted/30"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="80"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  className="text-primary transition-all duration-1000 ease-linear"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - (progress / 100) * circumference}
                />
              </svg>
              <div className="flex flex-col items-center">
                <span className={`text-6xl font-bold text-foreground ${countdown <= 3 ? 'animate-countdown text-primary' : ''}`}>
                  {countdown}
                </span>
                <span className="text-sm text-muted-foreground">segundos</span>
              </div>
            </div>

            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="flex items-center gap-3 py-4 px-6">
                <Heart className="h-5 w-5 text-primary animate-pulse" />
                <p className="text-sm text-foreground">
                  {testStarted
                    ? 'El paciente debe exhalar de forma constante en el dispositivo durante la adquisición de datos...'
                    : 'Cuando el paciente esté listo, pulsa «Iniciar prueba» para comenzar la captura.'}
                </p>
              </CardContent>
            </Card>

            {/* Start button, shown only before the test begins */}
            {!testStarted && (
              <div className="flex flex-col items-center gap-2">
                <Button
                  size="lg"
                  onClick={onStartTest}
                  disabled={isReal && !isDeviceConnected}
                  className="gap-2 px-8"
                >
                  <Play className="h-5 w-5" />
                  Iniciar prueba
                </Button>
                {isReal && !isDeviceConnected && (
                  <p className="text-xs text-destructive">
                    Esperando conexión con el dispositivo para poder iniciar...
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Live readout of incoming samples (real mode only) */}
          {isReal && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="flex flex-col items-center justify-center py-4">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${sampleCount > 0 ? 'bg-[#4A7C59] animate-pulse' : 'bg-muted-foreground'}`} />
                    <span className="text-2xl font-bold tabular-nums text-foreground">{sampleCount}</span>
                  </div>
                  <span className="mt-1 text-xs text-muted-foreground">Muestras recibidas</span>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="flex flex-col items-center justify-center py-4">
                  <span className="text-2xl font-bold tabular-nums text-foreground">
                    {latest ? latest.mq2.toFixed(2) : '—'}
                  </span>
                  <span className="mt-1 text-xs text-muted-foreground">MQ-2</span>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="flex flex-col items-center justify-center py-4">
                  <span className="text-2xl font-bold tabular-nums text-foreground">
                    {latest ? latest.mq135.toFixed(2) : '—'}
                  </span>
                  <span className="mt-1 text-xs text-muted-foreground">MQ-135</span>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="flex flex-col items-center justify-center py-4">
                  <span className="text-2xl font-bold tabular-nums text-foreground">
                    {latest ? latest.mq9.toFixed(2) : '—'}
                  </span>
                  <span className="mt-1 text-xs text-muted-foreground">MQ-9</span>
                </CardContent>
              </Card>
            </div>
          )}

          <Card className="border-border/50 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5 text-primary" />
                Señales de Sensores MOS-MEMS en Tiempo Real
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <LineChart
                  data={sensorData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                  <XAxis
                    dataKey="time"
                    type="number"
                    domain={isReal ? ['dataMin', 'dataMax'] : [0, 'dataMax']}
                    tickFormatter={(value) => `${Number(value).toFixed(1)}s`}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    label={{ value: 'Tiempo (s)', position: 'insideBottom', offset: -10, fontSize: 12 }}
                  />
                  <YAxis
                    domain={isReal ? [0, 'auto'] : [0, simulationMode === 'risk' ? 8 : 3]}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    label={{ value: 'Ratio', angle: -90, position: 'insideLeft', fontSize: 12 }}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(value) => `Tiempo: ${Number(value).toFixed(1)}s`}
                        formatter={(value, name) => [
                          `${Number(value).toFixed(2)}`,
                          chartConfig[name as keyof typeof chartConfig]?.label || name,
                        ]}
                      />
                    }
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    formatter={(value) => chartConfig[value as keyof typeof chartConfig]?.label || value}
                  />
                  <Line
                    type="monotone"
                    dataKey="mq2"
                    stroke="var(--color-mq2)"
                    strokeWidth={2}
                    dot={false}
                    name="mq2"
                  />
                  <Line
                    type="monotone"
                    dataKey="mq135"
                    stroke="var(--color-mq135)"
                    strokeWidth={2}
                    dot={false}
                    name="mq135"
                  />
                  <Line
                    type="monotone"
                    dataKey="mq9"
                    stroke="var(--color-mq9)"
                    strokeWidth={2}
                    dot={false}
                    name="mq9"
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Simulation controls, available only in academic mode once the test has started */}
          {operatingMode === 'academic' && testStarted && (
          <Card className="border-border/50 bg-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <AlertTriangle className="h-4 w-4" />
                Controles de Simulación (Solo Demostración)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant={simulationMode === 'healthy' ? 'default' : 'outline'}
                  onClick={() => onSimulate('healthy')}
                  className={simulationMode === 'healthy' ? 'bg-[#4A7C59] hover:bg-[#3D6B4A]' : ''}
                >
                  Simular Sano
                </Button>
                <Button
                  variant={simulationMode === 'risk' ? 'default' : 'outline'}
                  onClick={() => onSimulate('risk')}
                  className={simulationMode === 'risk' ? 'bg-[#D99B26] hover:bg-[#C08B20]' : ''}
                >
                  Simular Riesgo
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Use estos botones para visualizar patrones de datos simulados. En producción, 
                los datos vendrán del dispositivo ESP32 a través de WebSocket.
              </p>
            </CardContent>
          </Card>
          )}
        </div>
      </main>
    </div>
  )
}
