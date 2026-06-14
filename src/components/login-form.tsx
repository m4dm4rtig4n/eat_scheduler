"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        // Rechargement complet du document (plutôt que router.replace + refresh).
        // Le cookie de session posé par /api/auth/login est alors garanti
        // présent sur la requête de navigation, donc le proxy voit la session
        // et ne redirige pas vers /login. Évite la page blanche au login.
        window.location.assign("/");
        return;
      }

      if (response.status === 429) {
        const minutes = Math.ceil((data.retryAfterSeconds ?? 0) / 60);
        setError(
          `Trop de tentatives. Réessaye dans ${minutes} minute${minutes > 1 ? "s" : ""}.`
        );
      } else if (response.status === 401) {
        const remaining = data.attemptsRemaining;
        setError(
          typeof remaining === "number"
            ? `Mot de passe incorrect. ${remaining} tentative${remaining > 1 ? "s" : ""} restante${remaining > 1 ? "s" : ""}.`
            : "Mot de passe incorrect."
        );
      } else {
        setError("Erreur inattendue.");
      }
    } catch {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        type="password"
        autoFocus
        autoComplete="current-password"
        placeholder="Mot de passe"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={loading}
        required
      />
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={loading || password.length === 0} className="w-full">
        {loading ? "Connexion…" : "Se connecter"}
      </Button>
    </form>
  );
}
