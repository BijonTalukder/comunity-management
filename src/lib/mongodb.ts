import "server-only";
import mongoose, { type Mongoose } from "mongoose";
import { env } from "@/lib/env";

/**
 * Next.js hot-reloads modules in development and reuses the same process
 * across requests in production, so the connection (and any in-flight connect
 * promise) is cached on `globalThis` to guarantee exactly one pool.
 */
type MongooseCache = {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
};

const globalForMongoose = globalThis as typeof globalThis & {
  __mongooseCache?: MongooseCache;
};

const cache: MongooseCache = (globalForMongoose.__mongooseCache ??= {
  conn: null,
  promise: null,
});

mongoose.set("strictQuery", true);
// Indexes are declared on the schemas; let Mongoose build them in development
// but never block production requests on index creation.
mongoose.set("autoIndex", process.env.NODE_ENV !== "production");

export async function connectToDatabase(): Promise<Mongoose> {
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    cache.promise = mongoose
      .connect(env.mongodbUri, {
        dbName: env.mongodbDbName,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 10_000,
        bufferCommands: false,
      })
      .catch((error) => {
        // Clear the cached promise so the next request can retry instead of
        // permanently rejecting with a stale failure.
        cache.promise = null;
        throw error;
      });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}

/** Ensures every schema's declared indexes exist. Safe to call repeatedly. */
export async function syncIndexes(): Promise<void> {
  const conn = await connectToDatabase();
  await Promise.all(
    Object.values(conn.models).map((model) => model.syncIndexes().catch(() => undefined)),
  );
}
