import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

function createDbClient() {
  if (!connectionString) {
    // Allows Next.js static analysis/build to complete gracefully without runtime crash
    return null as unknown as ReturnType<typeof drizzle<typeof schema>>;
  }
  const client = neon(connectionString);
  return drizzle(client, { schema });
}

export const db = createDbClient();
export { schema };
