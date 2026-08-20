import "server-only";
import { env } from "@/lib/env";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { hashPassword } from "@/lib/auth";

const globalForBootstrap = globalThis as typeof globalThis & {
  __adminBootstrap?: Promise<void>;
};

async function bootstrapDefaultAdmin(): Promise<void> {
  await connectToDatabase();
  const { name, email, password } = env.defaultAdmin;

  const existing = await User.findOne({ email }).select("_id").lean();
  if (existing) return;

  const passwordHash = await hashPassword(password);

  try {
    // The unique index on `email` is the real guard: if two processes race,
    // the loser gets a duplicate-key error and simply does nothing.
    await User.create({
      name,
      email,
      passwordHash,
      role: "SUPER_ADMIN",
      isActive: true,
    });
    console.info(`[bootstrap] Created default super admin: ${email}`);
  } catch (error) {
    const code = (error as { code?: number }).code;
    if (code === 11000) return;
    throw error;
  }
}

/**
 * Ensures a super admin exists. The in-flight promise is cached on
 * `globalThis` so concurrent requests share one attempt rather than each
 * hashing a password and racing to insert.
 */
export function ensureDefaultAdmin(): Promise<void> {
  globalForBootstrap.__adminBootstrap ??= bootstrapDefaultAdmin().catch((error) => {
    // Drop the cached promise so a transient failure (e.g. database not yet
    // reachable) can be retried on the next request.
    globalForBootstrap.__adminBootstrap = undefined;
    throw error;
  });
  return globalForBootstrap.__adminBootstrap;
}
