/**
 * Anti-bruteforce : enregistre les échecs de login par IP et bannit
 * temporairement après un certain nombre de tentatives.
 *
 * Stockage en mémoire process. C'est suffisant tant que l'app tourne
 * en mono-replica (cas par défaut avec SQLite + strategy: Recreate).
 */

type FailRecord = {
  count: number;
  firstFailAt: number; // ms epoch
  lastFailAt: number; // ms epoch
  bannedUntil: number | null; // ms epoch, null si pas banni
};

export type BanStatus = {
  banned: boolean;
  /** Secondes avant la fin du ban, 0 si pas banni */
  retryAfterSeconds: number;
  /** Tentatives restantes avant ban, undefined si déjà banni */
  attemptsRemaining?: number;
};

// Configuration via env, valeurs par défaut raisonnables.
const MAX_FAILS = Number(process.env.AUTH_MAX_FAILS ?? 5);
const FAIL_WINDOW_MS = Number(process.env.AUTH_FAIL_WINDOW_MINUTES ?? 15) * 60_000;
const BAN_DURATION_MS = Number(process.env.AUTH_BAN_DURATION_MINUTES ?? 30) * 60_000;

const records = new Map<string, FailRecord>();

function now(): number {
  return Date.now();
}

/**
 * Vérifie si une IP est actuellement bannie sans modifier l'état.
 * Appelé AVANT de comparer le mot de passe pour court-circuiter
 * les requêtes des IPs bannies.
 */
export function getBanStatus(ip: string): BanStatus {
  const record = records.get(ip);
  if (!record) {
    return { banned: false, retryAfterSeconds: 0, attemptsRemaining: MAX_FAILS };
  }

  const t = now();
  if (record.bannedUntil && record.bannedUntil > t) {
    return {
      banned: true,
      retryAfterSeconds: Math.ceil((record.bannedUntil - t) / 1000),
    };
  }

  // Le ban est expiré OU la fenêtre d'échec est dépassée → reset implicite
  if ((record.bannedUntil && record.bannedUntil <= t) || t - record.lastFailAt > FAIL_WINDOW_MS) {
    return { banned: false, retryAfterSeconds: 0, attemptsRemaining: MAX_FAILS };
  }

  return {
    banned: false,
    retryAfterSeconds: 0,
    attemptsRemaining: Math.max(0, MAX_FAILS - record.count),
  };
}

/**
 * Réinitialise les échecs pour une IP. À appeler après un login réussi.
 */
export function clearFails(ip: string): void {
  records.delete(ip);
}

/**
 * Enregistre une tentative échouée pour cette IP et retourne le nouveau statut.
 *
 * TODO: implémenter la logique. Voir le commentaire dans la conversation
 * pour les arbitrages (sliding window, pénalité progressive, etc.).
 *
 * Contraintes :
 *   - Si l'IP n'a pas d'enregistrement OU si la fenêtre FAIL_WINDOW_MS
 *     est dépassée depuis le dernier échec → repartir d'un compteur à 1.
 *   - Sinon incrémenter le compteur existant.
 *   - Si le compteur atteint MAX_FAILS → poser bannedUntil = now + BAN_DURATION_MS.
 *   - Retourner un BanStatus reflétant le nouvel état.
 *
 * @param ip identifiant client (IP ou IP+UA)
 * @returns état après l'incrément
 */
export function registerFail(ip: string): BanStatus {
  const t = now();
  const existing = records.get(ip);

  const isExpiredBan = existing?.bannedUntil != null && existing.bannedUntil <= t;
  const isOutOfWindow = existing != null && t - existing.lastFailAt > FAIL_WINDOW_MS;
  const shouldReset = !existing || isExpiredBan || isOutOfWindow;

  const count = shouldReset ? 1 : existing!.count + 1;
  const firstFailAt = shouldReset ? t : existing!.firstFailAt;
  const bannedUntil = count >= MAX_FAILS ? t + BAN_DURATION_MS : null;

  records.set(ip, { count, firstFailAt, lastFailAt: t, bannedUntil });

  if (bannedUntil) {
    return {
      banned: true,
      retryAfterSeconds: Math.ceil((bannedUntil - t) / 1000),
    };
  }
  return {
    banned: false,
    retryAfterSeconds: 0,
    attemptsRemaining: Math.max(0, MAX_FAILS - count),
  };
}
