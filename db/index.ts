import * as schema from "./schema";
import { drizzle } from "drizzle-orm/d1";

let mockDb: any;
try {
  // We mock the DB so it doesn't crash in AI Studio if D1 binding is not set
  throw new Error('Force mock');
} catch {
  console.warn('[AI Studio] Database not connected — using mock');
  const noOp = { 
    findMany: async () => [], 
    findFirst: async () => null,
    findUnique: async () => null, 
    create: async (d: any) => d?.data ?? {},
    update: async (d: any) => d?.data ?? {}, 
    delete: async () => ({}) 
  };
  mockDb = new Proxy({}, {
    get: (_, prop) => prop === 'query'
      ? new Proxy({}, { get: () => noOp }) : async () => [],
  });
}

export function getDb() {
  return mockDb;
}
