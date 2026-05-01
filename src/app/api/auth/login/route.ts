import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  checkPassword,
  createSessionToken,
  isAuthEnabled,
} from "@/lib/auth";
import { clearFails, getBanStatus, registerFail } from "@/lib/auth-ban";

export const runtime = "nodejs";

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

export async function POST(request: NextRequest) {
  if (!isAuthEnabled()) {
    return NextResponse.json({ ok: true, disabled: true });
  }

  const ip = clientIp(request);
  const preStatus = getBanStatus(ip);
  if (preStatus.banned) {
    return NextResponse.json(
      { error: "banned", retryAfterSeconds: preStatus.retryAfterSeconds },
      { status: 429, headers: { "Retry-After": String(preStatus.retryAfterSeconds) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const password = (body as { password?: unknown })?.password;
  if (typeof password !== "string") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (!checkPassword(password)) {
    const status = registerFail(ip);
    if (status.banned) {
      return NextResponse.json(
        { error: "banned", retryAfterSeconds: status.retryAfterSeconds },
        { status: 429, headers: { "Retry-After": String(status.retryAfterSeconds) } }
      );
    }
    return NextResponse.json(
      { error: "invalid_password", attemptsRemaining: status.attemptsRemaining },
      { status: 401 }
    );
  }

  clearFails(ip);
  const token = createSessionToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
