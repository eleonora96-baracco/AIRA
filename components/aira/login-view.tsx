'use client'

import { useState } from 'react'
import type { OperatingMode } from '@/app/page'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Wind, Lock, User, GraduationCap, Cpu, ArrowLeft } from 'lucide-react'

interface LoginViewProps {
  operatingMode: OperatingMode
  onLogin: () => void
  onBack: () => void
}

export function LoginView({ operatingMode, onLogin, onBack }: LoginViewProps) {
  const [credentials, setCredentials] = useState({ id: '', password: '' })
  const isAcademic = operatingMode === 'academic'

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Brand */}
        <div className="flex flex-col items-center space-y-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25">
            <Wind className="h-10 w-10 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">AIRA Cloud</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sistema de Cribado Pulmonar No Invasivo
            </p>
          </div>

          {/* Selected operating mode indicator */}
          {operatingMode && (
            <Badge variant="secondary" className="gap-2 px-3 py-1 text-sm">
              {isAcademic ? (
                <GraduationCap className="h-4 w-4" />
              ) : (
                <Cpu className="h-4 w-4" />
              )}
              {isAcademic ? 'Modo Académico · sin dispositivo' : 'Modo Real · dispositivo conectado'}
            </Badge>
          )}
        </div>

        {/* Login Card */}
        <Card className="border-border/50 shadow-xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-center">Acceso Personal Sanitario</CardTitle>
            <CardDescription className="text-center">
              Farmacéutico 
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cip" className="text-sm font-medium">
                  Código de Identificación Sanitaria (CIP / ID)
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="cip"
                    type="text"
                    placeholder="Ej: CAES12345678"
                    value={credentials.id}
                    onChange={(e) => setCredentials({ ...credentials, id: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Contraseña
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={credentials.password}
                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>

              <Button 
                type="button" 
                onClick={onLogin} 
                className="w-full mt-6" 
                size="lg"
              >
                Acceder
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={onBack}
                className="w-full"
                size="sm"
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Cambiar modo de funcionamiento
              </Button>
            </div>

            <div className="mt-6 pt-4 border-t border-border/50">
              <p className="text-xs text-center text-muted-foreground">
                Sistema certificado para uso en la red sanitaria CatSalut
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          © 2026 AIRA Medical Technologies · v1.0.0
        </p>
      </div>
    </div>
  )
}
