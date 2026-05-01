import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { isAuthEnabled, SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (!isAuthEnabled()) redirect("/");

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (verifySessionToken(token)) redirect("/");

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">Eat Scheduler</h1>
          <p className="text-sm text-foreground-soft">
            Saisis le mot de passe pour accéder à l'application.
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
