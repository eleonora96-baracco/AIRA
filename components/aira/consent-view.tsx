'use client'

import { useState } from 'react'
import type { PatientData } from '@/app/page'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Wind, FileText, ShieldCheck, ArrowLeft } from 'lucide-react'

interface ConsentViewProps {
  patientData: PatientData
  onAccept: () => void
  onCancel: () => void
}

const CONSENT_SECTIONS = [
  {
    title: '1. Objeto del cribado',
    body: 'El presente documento regula el consentimiento informado para la realización de una prueba de cribado pulmonar no invasivo mediante el dispositivo AIRA. La prueba consiste en el análisis de los biomarcadores gaseosos (compuestos orgánicos volátiles) presentes en el aire exhalado por el paciente durante un periodo aproximado de 10 segundos.',
  },
  {
    title: '2. Naturaleza orientativa de la prueba',
    body: 'El paciente reconoce y acepta que el resultado de AIRA tiene carácter exclusivamente orientativo y de cribado. En ningún caso constituye un diagnóstico médico definitivo ni sustituye la valoración de un facultativo. Un resultado de riesgo implicará la derivación al centro de atención correspondiente para la realización de pruebas complementarias.',
  },
  {
    title: '3. Tratamiento de datos personales',
    body: 'Los datos de salud recogidos durante el cribado serán tratados de forma confidencial conforme al Reglamento (UE) 2016/679 (RGPD) y a la Ley Orgánica 3/2018 de Protección de Datos. Los datos podrán incorporarse a la historia clínica del paciente dentro de la red sanitaria CatSalut con la finalidad de su seguimiento asistencial.',
  },
  {
    title: '4. Voluntariedad y revocación',
    body: 'La participación en el cribado es totalmente voluntaria. El paciente podrá revocar su consentimiento en cualquier momento, antes o durante la prueba, sin necesidad de justificación y sin que ello suponga perjuicio alguno en su atención sanitaria.',
  },
  {
    title: '5. Riesgos y molestias',
    body: 'La prueba es no invasiva e indolora. La única acción requerida es exhalar de forma constante en la boquilla del dispositivo. No se conocen riesgos asociados a su realización más allá de una posible leve sensación de hiperventilación durante la espiración prolongada.',
  },
]

export function ConsentView({ patientData, onAccept, onCancel }: ConsentViewProps) {
  const [hasRead, setHasRead] = useState(false)
  const [acceptsData, setAcceptsData] = useState(false)
  const [signature, setSignature] = useState('')

  const canProceed = hasRead && acceptsData && signature.trim().length >= 3

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Wind className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-foreground">AIRA Cloud</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="space-y-6">
          {/* Page Title */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Consentimiento Informado</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              El paciente debe leer y aceptar los términos antes de iniciar la prueba de cribado
            </p>
          </div>

          {/* Patient reference */}
          {patientData.cip && (
            <div className="rounded-lg border border-border/50 bg-muted/40 px-4 py-3 text-sm">
              <span className="text-muted-foreground">Paciente (CIP): </span>
              <span className="font-medium text-foreground">{patientData.cip}</span>
            </div>
          )}

          {/* Terms Card */}
          <Card className="border-border/50 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Términos y Condiciones de la Prueba AIRA
              </CardTitle>
              <CardDescription>
                Documento de consentimiento informado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-80 rounded-lg border border-border/50 bg-muted/20 p-4">
                <div className="space-y-5 pr-3">
                  {CONSENT_SECTIONS.map((section) => (
                    <div key={section.title} className="space-y-1.5">
                      <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">{section.body}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Acceptance Card */}
          <Card className="border-border/50 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Declaración del Paciente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="consent-read"
                  checked={hasRead}
                  onCheckedChange={(checked) => setHasRead(checked === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="consent-read" className="text-sm font-normal leading-relaxed">
                  He leído y comprendido la información facilitada sobre la prueba de cribado pulmonar
                  AIRA y su carácter orientativo.
                </Label>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="consent-data"
                  checked={acceptsData}
                  onCheckedChange={(checked) => setAcceptsData(checked === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="consent-data" className="text-sm font-normal leading-relaxed">
                  Consiento de forma libre y voluntaria la realización de la prueba y el tratamiento de
                  mis datos de salud conforme al RGPD.
                </Label>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="signature" className="text-sm font-medium">
                  Firma del paciente (nombre y apellidos)
                </Label>
                <Input
                  id="signature"
                  type="text"
                  placeholder="Ej: María López García"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  className="font-medium"
                />
                <p className="text-xs text-muted-foreground">
                  Al escribir su nombre completo, el paciente firma electrónicamente este consentimiento.
                </p>
              </div>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row-reverse">
                <Button
                  onClick={onAccept}
                  disabled={!canProceed}
                  className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/25 sm:flex-1"
                  size="lg"
                >
                  Aceptar e Iniciar Cribado
                </Button>
                <Button
                  onClick={onCancel}
                  variant="outline"
                  className="w-full h-12 sm:w-auto"
                  size="lg"
                >
                  Cancelar
                </Button>
              </div>

              {!canProceed && (
                <p className="text-center text-xs text-muted-foreground">
                  Debe aceptar ambas casillas y firmar para poder continuar.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
