import "server-only";

/**
 * Server-side environment access. Values are read lazily so that a missing
 * variable surfaces as a clear error at the point of use rather than crashing
 * the whole module graph at import time.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable "${name}". Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() !== "" ? value : fallback;
}

export const env = {
  get mongodbUri() {
    return required("MONGODB_URI");
  },
  get mongodbDbName() {
    return required("MONGODB_DB_NAME");
  },
  get authSecret() {
    const secret = required("AUTH_SECRET");
    if (secret.length < 32) {
      throw new Error("AUTH_SECRET must be at least 32 characters long.");
    }
    return secret;
  },
  get sessionMaxAgeSeconds() {
    const days = Number(optional("SESSION_MAX_AGE_DAYS", "7"));
    return (Number.isFinite(days) && days > 0 ? days : 7) * 24 * 60 * 60;
  },
  get defaultAdmin() {
    return {
      name: optional("DEFAULT_ADMIN_NAME", "Super Admin"),
      email: optional("DEFAULT_ADMIN_EMAIL", "admin@example.com").toLowerCase(),
      password: optional("DEFAULT_ADMIN_PASSWORD", "ChangeThisPassword123"),
    };
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
};

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Community Manager";
