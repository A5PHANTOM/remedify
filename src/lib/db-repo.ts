import { db, schema } from "@/db";
import { eq, and } from "drizzle-orm";

export interface UserRecord {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  timezone: string;
  digestTime: string;
  calendarToken: string;
  createdAt: Date;
}

export interface WorkspaceRecord {
  id: string;
  userId: string;
  name: string;
  colour: string;
  emoji: string;
  isMain: boolean;
  archived: boolean;
  syncToCalendar: boolean;
  sortOrder: number;
  createdAt: Date;
}

// In-memory fallback cache for development when DATABASE_URL is not yet provided
const memoryStore = {
  users: new Map<string, UserRecord>(),
  verificationTokens: new Map<string, { identifier: string; token: string; expires: Date }>(),
  workspaces: new Map<string, WorkspaceRecord>(),
};

export const dbRepo = {
  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const normalizedEmail = email.toLowerCase().trim();
    if (db) {
      const rows = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, normalizedEmail))
        .limit(1);
      return (rows[0] as unknown as UserRecord) || null;
    }

    for (const user of memoryStore.users.values()) {
      if (user.email.toLowerCase() === normalizedEmail) {
        return user;
      }
    }
    return null;
  },

  async findUserById(id: string): Promise<UserRecord | null> {
    if (db) {
      const rows = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, id))
        .limit(1);
      return (rows[0] as unknown as UserRecord) || null;
    }
    return memoryStore.users.get(id) || null;
  },

  async createOrGetUser(email: string, name?: string | null, image?: string | null): Promise<UserRecord> {
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await this.findUserByEmail(normalizedEmail);
    if (existing) {
      return existing;
    }

    const userId = crypto.randomUUID();
    const calendarToken = crypto.randomUUID().replace(/-/g, "");
    const newUser: UserRecord = {
      id: userId,
      email: normalizedEmail,
      name: name || normalizedEmail.split("@")[0],
      image: image || null,
      timezone: "UTC",
      digestTime: "08:00",
      calendarToken,
      createdAt: new Date(),
    };

    if (db) {
      await db.insert(schema.users).values({
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        image: newUser.image,
        timezone: newUser.timezone,
        digestTime: newUser.digestTime,
        calendarToken: newUser.calendarToken,
      });
    } else {
      memoryStore.users.set(userId, newUser);
    }

    // Auto-create default "Main" workspace for this user
    await this.ensureMainWorkspace(userId);

    return newUser;
  },

  async ensureMainWorkspace(userId: string): Promise<WorkspaceRecord> {
    if (db) {
      const existing = await db
        .select()
        .from(schema.workspaces)
        .where(and(eq(schema.workspaces.userId, userId), eq(schema.workspaces.isMain, true)))
        .limit(1);

      if (existing[0]) {
        return existing[0] as unknown as WorkspaceRecord;
      }

      const [inserted] = await db
        .insert(schema.workspaces)
        .values({
          userId,
          name: "Main",
          colour: "#0A84FF",
          emoji: "📁",
          isMain: true,
          archived: false,
          syncToCalendar: true,
          sortOrder: 0,
        })
        .returning();

      return inserted as unknown as WorkspaceRecord;
    }

    for (const ws of memoryStore.workspaces.values()) {
      if (ws.userId === userId && ws.isMain) {
        return ws;
      }
    }

    const mainWs: WorkspaceRecord = {
      id: crypto.randomUUID(),
      userId,
      name: "Main",
      colour: "#0A84FF",
      emoji: "📁",
      isMain: true,
      archived: false,
      syncToCalendar: true,
      sortOrder: 0,
      createdAt: new Date(),
    };
    memoryStore.workspaces.set(mainWs.id, mainWs);
    return mainWs;
  },

  async saveVerificationToken(identifier: string, token: string, expires: Date): Promise<void> {
    const key = `${identifier.toLowerCase().trim()}:${token.trim()}`;
    if (db) {
      await db.insert(schema.verificationTokens).values({
        identifier: identifier.toLowerCase().trim(),
        token: token.trim(),
        expires,
      });
      return;
    }
    memoryStore.verificationTokens.set(key, {
      identifier: identifier.toLowerCase().trim(),
      token: token.trim(),
      expires,
    });
  },

  async verifyAndConsumeToken(identifier: string, token: string): Promise<boolean> {
    const normalizedIdentifier = identifier.toLowerCase().trim();
    const cleanToken = token.trim();

    if (db) {
      const records = await db
        .select()
        .from(schema.verificationTokens)
        .where(
          and(
            eq(schema.verificationTokens.identifier, normalizedIdentifier),
            eq(schema.verificationTokens.token, cleanToken)
          )
        );

      if (!records[0]) {
        return false;
      }

      const isExpired = new Date() > new Date(records[0].expires);
      // Clean up token after use (one-time code)
      await db
        .delete(schema.verificationTokens)
        .where(
          and(
            eq(schema.verificationTokens.identifier, normalizedIdentifier),
            eq(schema.verificationTokens.token, cleanToken)
          )
        );

      return !isExpired;
    }

    const key = `${normalizedIdentifier}:${cleanToken}`;
    const tokenRecord = memoryStore.verificationTokens.get(key);
    if (!tokenRecord) {
      return false;
    }

    const isExpired = new Date() > tokenRecord.expires;
    memoryStore.verificationTokens.delete(key);
    return !isExpired;
  },
};
