import { auth } from "@/auth";
import { dbRepo, UserRecord } from "./db-repo";

/**
 * Robustly resolves the authenticated user from the database.
 * If the JWT session contains an email, this ensures the user exists in PostgreSQL,
 * guarantees a valid foreign-key ID, and initializes the default "Main" workspace.
 */
export async function getCurrentUser(): Promise<UserRecord | null> {
  try {
    const session = await auth();
    const email = session?.user?.email?.toLowerCase().trim();
    if (!email) {
      return null;
    }

    // Lookup by email
    let user = await dbRepo.findUserByEmail(email);

    // If not found in DB, create or retrieve
    if (!user) {
      user = await dbRepo.createOrGetUser(
        email,
        session?.user?.name || null,
        session?.user?.image || null
      );
    }

    // Ensure default "Main" workspace exists
    if (user?.id) {
      await dbRepo.ensureMainWorkspace(user.id);
    }

    return user;
  } catch (err) {
    console.error("[getCurrentUser] Error resolving user:", err);
    return null;
  }
}
