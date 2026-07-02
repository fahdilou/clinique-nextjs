"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { signIn } from "@/lib/actions/auth";
import { HeartPulse, Stethoscope, Activity, Pill, Syringe, Cross, Thermometer } from "lucide-react";

const FLOATING_ICONS = [
  { Icon: HeartPulse, top: "10%", left: "15%", delay: 0, duration: 6 },
  { Icon: Stethoscope, top: "20%", left: "80%", delay: 1, duration: 8 },
  { Icon: Activity, top: "70%", left: "10%", delay: 2, duration: 7 },
  { Icon: Pill, top: "80%", left: "85%", delay: 0.5, duration: 9 },
  { Icon: Syringe, top: "40%", left: "5%", delay: 1.5, duration: 6.5 },
  { Icon: Cross, top: "55%", left: "90%", delay: 2.5, duration: 7.5 },
  { Icon: Thermometer, top: "15%", left: "50%", delay: 3, duration: 8.5 },
  { Icon: HeartPulse, top: "85%", left: "45%", delay: 3.5, duration: 7 },
];

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center p-4">
      {/* Fond dégradé animé */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/80 to-cyan-800 animate-gradient" />

      {/* Overlay avec pattern SVG médical */}
      <div className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M30 28h-4v-4h-2v4h-4v2h4v4h2v-4h4v-2z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Cercles pulsants en fond */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-300/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "2s" }} />
      <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "1s" }} />

      {/* Icônes médicales flottantes */}
      {FLOATING_ICONS.map(({ Icon, top, left, delay, duration }, i) => (
        <div
          key={i}
          className="absolute text-white/20 animate-float"
          style={{
            top, left,
            animationDelay: `${delay}s`,
            animationDuration: `${duration}s`,
          }}
        >
          <Icon className="w-12 h-12 md:w-16 md:h-16" />
        </div>
      ))}

      {/* Ligne ECG animée en bas */}
      <div className="absolute bottom-10 left-0 right-0 h-16 flex items-center justify-center overflow-hidden opacity-30">
        <svg viewBox="0 0 1200 100" className="w-full h-full">
          <path
            d="M0 50 L200 50 L220 20 L240 80 L260 30 L280 50 L500 50 L520 10 L540 90 L560 30 L580 50 L800 50 L820 20 L840 70 L860 40 L880 50 L1200 50"
            stroke="white" strokeWidth="2" fill="none"
            strokeDasharray="1500"
            strokeDashoffset="1500"
            className="animate-ecg"
          />
        </svg>
      </div>

      {/* Carte de login */}
      <Card className="relative w-full max-w-md backdrop-blur-sm bg-card/95 border-white/20 shadow-2xl">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-white/20">
            <HeartPulse className="h-8 w-8 animate-heartbeat" />
          </div>
          <CardTitle className="text-2xl">Gestion Clinique</CardTitle>
          <CardDescription>Connectez-vous à votre espace</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={(fd) =>
              start(async () => {
                const res = await signIn(fd);
                if (res?.error) setError(res.error);
              })
            }
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required placeholder="vous@clinique.com" autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input id="password" name="password" type="password" required placeholder="••••••••" autoComplete="current-password" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Connexion..." : "Se connecter"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
