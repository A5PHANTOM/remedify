import { db, schema } from "@/db";
import { eq, and, desc, asc, lte, gte, isNull } from "drizzle-orm";

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

export interface ReminderRecord {
  id: string;
  userId: string;
  workspaceId: string;
  title: string;
  note: string | null;
  dueAt: Date;
  status: "open" | "done";
  priority: number;
  repeatRule: "daily" | "weekly" | "monthly" | null;
  notifiedAt: Date | null;
  snoozedCount: number;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  workspace?: {
    name: string;
    colour: string;
    emoji: string;
  };
}

export interface ActivityLogRecord {
  id: string;
  reminderId: string | null;
  userId: string;
  action: string;
  oldValue: any;
  newValue: any;
  createdAt: Date;
}

export interface PushSubscriptionRecord {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string | null;
  createdAt: Date;
}

// In-memory fallback cache for development when DATABASE_URL is not yet provided
const memoryStore = {
  users: new Map<string, UserRecord>(),
  verificationTokens: new Map<string, { identifier: string; token: string; expires: Date }>(),
  workspaces: new Map<string, WorkspaceRecord>(),
  reminders: new Map<string, ReminderRecord>(),
  activityLog: [] as ActivityLogRecord[],
  pushSubs: new Map<string, PushSubscriptionRecord>(),
};

export const dbRepo = {
  // -------------------------------------------------------------------------
  // Users & Verification Tokens
  // -------------------------------------------------------------------------
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

  async findUserByCalendarToken(token: string): Promise<UserRecord | null> {
    const cleanToken = token.trim();
    if (db) {
      const rows = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.calendarToken, cleanToken))
        .limit(1);
      return (rows[0] as unknown as UserRecord) || null;
    }
    for (const u of memoryStore.users.values()) {
      if (u.calendarToken === cleanToken) {
        return u;
      }
    }
    return null;
  },

  async regenerateCalendarToken(userId: string): Promise<string> {
    const newToken = crypto.randomUUID().replace(/-/g, "");
    if (db) {
      await db
        .update(schema.users)
        .set({ calendarToken: newToken })
        .where(eq(schema.users.id, userId));
    } else {
      const u = memoryStore.users.get(userId);
      if (u) {
        u.calendarToken = newToken;
      }
    }
    return newToken;
  },

  async getCalendarReminders(userId: string): Promise<ReminderRecord[]> {
    // Only return open reminders from workspaces that have syncToCalendar = true
    const workspaces = await this.getWorkspaces(userId);
    const syncedWsIds = new Set(
      workspaces.filter((w) => w.syncToCalendar).map((w) => w.id)
    );
    const allOpen = await this.getReminders(userId, { status: "open" });
    return allOpen.filter((r) => syncedWsIds.has(r.workspaceId));
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

    await this.ensureMainWorkspace(userId);
    return newUser;
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

  // -------------------------------------------------------------------------
  // Workspaces
  // -------------------------------------------------------------------------
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

  async getWorkspaces(userId: string): Promise<WorkspaceRecord[]> {
    await this.ensureMainWorkspace(userId);

    if (db) {
      const rows = await db
        .select()
        .from(schema.workspaces)
        .where(and(eq(schema.workspaces.userId, userId), eq(schema.workspaces.archived, false)))
        .orderBy(asc(schema.workspaces.sortOrder), asc(schema.workspaces.createdAt));
      return rows as unknown as WorkspaceRecord[];
    }

    return Array.from(memoryStore.workspaces.values())
      .filter((ws) => ws.userId === userId && !ws.archived)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async getWorkspaceById(userId: string, workspaceId: string): Promise<WorkspaceRecord | null> {
    if (db) {
      const rows = await db
        .select()
        .from(schema.workspaces)
        .where(and(eq(schema.workspaces.id, workspaceId), eq(schema.workspaces.userId, userId)))
        .limit(1);
      return (rows[0] as unknown as WorkspaceRecord) || null;
    }
    const ws = memoryStore.workspaces.get(workspaceId);
    return ws && ws.userId === userId ? ws : null;
  },

  async createWorkspace(
    userId: string,
    data: {
      name: string;
      colour?: string;
      emoji?: string;
      syncToCalendar?: boolean;
    }
  ): Promise<WorkspaceRecord> {
    const id = crypto.randomUUID();
    const now = new Date();
    const newWs: WorkspaceRecord = {
      id,
      userId,
      name: data.name.trim(),
      colour: data.colour || "#0A84FF",
      emoji: data.emoji || "📁",
      isMain: false,
      archived: false,
      syncToCalendar: data.syncToCalendar ?? true,
      sortOrder: 1,
      createdAt: now,
    };

    if (db) {
      const [inserted] = await db
        .insert(schema.workspaces)
        .values({
          id: newWs.id,
          userId: newWs.userId,
          name: newWs.name,
          colour: newWs.colour,
          emoji: newWs.emoji,
          isMain: false,
          archived: false,
          syncToCalendar: newWs.syncToCalendar,
          sortOrder: newWs.sortOrder,
          createdAt: now,
        })
        .returning();
      return inserted as unknown as WorkspaceRecord;
    }

    memoryStore.workspaces.set(id, newWs);
    return newWs;
  },

  async updateWorkspace(
    userId: string,
    workspaceId: string,
    updates: Partial<WorkspaceRecord>
  ): Promise<WorkspaceRecord | null> {
    const existing = await this.getWorkspaceById(userId, workspaceId);
    if (!existing) return null;

    // Prevent renaming or archiving the Main workspace
    if (existing.isMain) {
      if (updates.archived) return null;
      if (updates.name && updates.name !== "Main") return null;
    }

    const updated: WorkspaceRecord = {
      ...existing,
      ...updates,
    };

    if (db) {
      await db
        .update(schema.workspaces)
        .set({
          name: updated.name,
          colour: updated.colour,
          emoji: updated.emoji,
          archived: updated.archived,
          syncToCalendar: updated.syncToCalendar,
          sortOrder: updated.sortOrder,
        })
        .where(and(eq(schema.workspaces.id, workspaceId), eq(schema.workspaces.userId, userId)));
    } else {
      memoryStore.workspaces.set(workspaceId, updated);
    }

    return updated;
  },

  async deleteWorkspace(
    userId: string,
    workspaceId: string,
    reassignToMain: boolean = true
  ): Promise<boolean> {
    const existing = await this.getWorkspaceById(userId, workspaceId);
    if (!existing || existing.isMain) {
      return false; // Cannot delete Main workspace
    }

    const mainWs = await this.ensureMainWorkspace(userId);

    if (db) {
      if (reassignToMain) {
        await db
          .update(schema.reminders)
          .set({ workspaceId: mainWs.id })
          .where(and(eq(schema.reminders.workspaceId, workspaceId), eq(schema.reminders.userId, userId)));
      } else {
        await db
          .delete(schema.reminders)
          .where(and(eq(schema.reminders.workspaceId, workspaceId), eq(schema.reminders.userId, userId)));
      }

      await db
        .delete(schema.workspaces)
        .where(and(eq(schema.workspaces.id, workspaceId), eq(schema.workspaces.userId, userId)));
    } else {
      for (const [rId, rem] of memoryStore.reminders.entries()) {
        if (rem.workspaceId === workspaceId && rem.userId === userId) {
          if (reassignToMain) {
            memoryStore.reminders.set(rId, { ...rem, workspaceId: mainWs.id });
          } else {
            memoryStore.reminders.delete(rId);
          }
        }
      }
      memoryStore.workspaces.delete(workspaceId);
    }

    return true;
  },

  // -------------------------------------------------------------------------
  // Reminders
  // -------------------------------------------------------------------------
  async getReminders(
    userId: string,
    filters?: {
      workspaceId?: string;
      status?: "open" | "done" | "all";
      dueBefore?: Date;
    }
  ): Promise<ReminderRecord[]> {
    const workspaces = await this.getWorkspaces(userId);
    const wsMap = new Map(workspaces.map((w) => [w.id, w]));
    const mainWs = workspaces.find((w) => w.isMain);

    const isMainFilter = !filters?.workspaceId || filters.workspaceId === mainWs?.id;
    const targetStatus = filters?.status || "open";

    if (db) {
      const conditions = [eq(schema.reminders.userId, userId)];

      if (!isMainFilter && filters?.workspaceId) {
        conditions.push(eq(schema.reminders.workspaceId, filters.workspaceId));
      }

      if (targetStatus !== "all") {
        conditions.push(eq(schema.reminders.status, targetStatus));
      }

      const rows = await db
        .select()
        .from(schema.reminders)
        .where(and(...conditions))
        .orderBy(asc(schema.reminders.dueAt));

      return (rows as unknown as ReminderRecord[]).map((r) => {
        const ws = wsMap.get(r.workspaceId);
        return {
          ...r,
          dueAt: new Date(r.dueAt),
          createdAt: new Date(r.createdAt),
          updatedAt: new Date(r.updatedAt),
          completedAt: r.completedAt ? new Date(r.completedAt) : null,
          notifiedAt: r.notifiedAt ? new Date(r.notifiedAt) : null,
          workspace: ws ? { name: ws.name, colour: ws.colour, emoji: ws.emoji } : undefined,
        };
      });
    }

    const results: ReminderRecord[] = [];
    for (const r of memoryStore.reminders.values()) {
      if (r.userId !== userId) continue;
      if (!isMainFilter && filters?.workspaceId && r.workspaceId !== filters.workspaceId) continue;
      if (targetStatus !== "all" && r.status !== targetStatus) continue;

      const ws = wsMap.get(r.workspaceId);
      results.push({
        ...r,
        workspace: ws ? { name: ws.name, colour: ws.colour, emoji: ws.emoji } : undefined,
      });
    }

    return results.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  },

  async getReminderById(userId: string, reminderId: string): Promise<ReminderRecord | null> {
    if (db) {
      const rows = await db
        .select()
        .from(schema.reminders)
        .where(and(eq(schema.reminders.id, reminderId), eq(schema.reminders.userId, userId)))
        .limit(1);
      if (!rows[0]) return null;
      const r = rows[0] as unknown as ReminderRecord;
      const ws = await this.getWorkspaceById(userId, r.workspaceId);
      return {
        ...r,
        dueAt: new Date(r.dueAt),
        workspace: ws ? { name: ws.name, colour: ws.colour, emoji: ws.emoji } : undefined,
      };
    }
    const r = memoryStore.reminders.get(reminderId);
    if (!r || r.userId !== userId) return null;
    const ws = memoryStore.workspaces.get(r.workspaceId);
    return {
      ...r,
      workspace: ws ? { name: ws.name, colour: ws.colour, emoji: ws.emoji } : undefined,
    };
  },

  async createReminder(data: {
    userId: string;
    workspaceId: string;
    title: string;
    note?: string | null;
    dueAt: Date;
    priority?: number;
    repeatRule?: "daily" | "weekly" | "monthly" | null;
  }): Promise<ReminderRecord> {
    const id = crypto.randomUUID();
    const now = new Date();
    const newReminder: ReminderRecord = {
      id,
      userId: data.userId,
      workspaceId: data.workspaceId,
      title: data.title.trim(),
      note: data.note?.trim() || null,
      dueAt: data.dueAt,
      status: "open",
      priority: data.priority ?? 0,
      repeatRule: data.repeatRule || null,
      notifiedAt: null,
      snoozedCount: 0,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    if (db) {
      await db.insert(schema.reminders).values({
        id: newReminder.id,
        userId: newReminder.userId,
        workspaceId: newReminder.workspaceId,
        title: newReminder.title,
        note: newReminder.note,
        dueAt: newReminder.dueAt,
        status: newReminder.status,
        priority: newReminder.priority,
        repeatRule: newReminder.repeatRule,
        notifiedAt: null,
        snoozedCount: 0,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      });

      // Write activity log
      await db.insert(schema.activityLog).values({
        reminderId: id,
        userId: data.userId,
        action: "created",
        oldValue: null,
        newValue: newReminder,
        createdAt: now,
      });
    } else {
      memoryStore.reminders.set(id, newReminder);
      memoryStore.activityLog.push({
        id: crypto.randomUUID(),
        reminderId: id,
        userId: data.userId,
        action: "created",
        oldValue: null,
        newValue: newReminder,
        createdAt: now,
      });
    }

    const ws = await this.getWorkspaceById(data.userId, data.workspaceId);
    return {
      ...newReminder,
      workspace: ws ? { name: ws.name, colour: ws.colour, emoji: ws.emoji } : undefined,
    };
  },

  async updateReminder(
    userId: string,
    reminderId: string,
    updates: Partial<ReminderRecord>,
    action: string = "edited"
  ): Promise<ReminderRecord | null> {
    const existing = await this.getReminderById(userId, reminderId);
    if (!existing) return null;

    const now = new Date();
    const updated: ReminderRecord = {
      ...existing,
      ...updates,
      updatedAt: now,
    };

    // If marked as done, stamp completedAt
    if (updates.status === "done" && existing.status !== "done") {
      updated.completedAt = now;
    } else if (updates.status === "open" && existing.status === "done") {
      updated.completedAt = null;
    }

    // Reset notifiedAt when snoozed or rescheduled so reminder will notify again
    if (updates.dueAt && updates.dueAt.getTime() !== existing.dueAt.getTime()) {
      updated.notifiedAt = null;
    }

    if (db) {
      await db
        .update(schema.reminders)
        .set({
          title: updated.title,
          note: updated.note,
          dueAt: updated.dueAt,
          status: updated.status,
          priority: updated.priority,
          repeatRule: updated.repeatRule,
          notifiedAt: updated.notifiedAt,
          snoozedCount: updated.snoozedCount,
          completedAt: updated.completedAt,
          workspaceId: updated.workspaceId,
          updatedAt: now,
        })
        .where(and(eq(schema.reminders.id, reminderId), eq(schema.reminders.userId, userId)));

      await db.insert(schema.activityLog).values({
        reminderId,
        userId,
        action,
        oldValue: existing,
        newValue: updated,
        createdAt: now,
      });
    } else {
      memoryStore.reminders.set(reminderId, updated);
      memoryStore.activityLog.push({
        id: crypto.randomUUID(),
        reminderId,
        userId,
        action,
        oldValue: existing,
        newValue: updated,
        createdAt: now,
      });
    }

    return updated;
  },

  async deleteReminder(userId: string, reminderId: string): Promise<boolean> {
    const existing = await this.getReminderById(userId, reminderId);
    if (!existing) return false;

    const now = new Date();
    if (db) {
      await db.insert(schema.activityLog).values({
        reminderId,
        userId,
        action: "deleted",
        oldValue: existing,
        newValue: null,
        createdAt: now,
      });

      await db
        .delete(schema.reminders)
        .where(and(eq(schema.reminders.id, reminderId), eq(schema.reminders.userId, userId)));
    } else {
      memoryStore.activityLog.push({
        id: crypto.randomUUID(),
        reminderId,
        userId,
        action: "deleted",
        oldValue: existing,
        newValue: null,
        createdAt: now,
      });
      memoryStore.reminders.delete(reminderId);
    }

    return true;
  },

  async getActivityLog(userId: string, reminderId?: string): Promise<ActivityLogRecord[]> {
    if (db) {
      const conditions = [eq(schema.activityLog.userId, userId)];
      if (reminderId) {
        conditions.push(eq(schema.activityLog.reminderId, reminderId));
      }
      const rows = await db
        .select()
        .from(schema.activityLog)
        .where(and(...conditions))
        .orderBy(desc(schema.activityLog.createdAt));
      return rows as unknown as ActivityLogRecord[];
    }

    return memoryStore.activityLog
      .filter((log) => log.userId === userId && (!reminderId || log.reminderId === reminderId))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  // -------------------------------------------------------------------------
  // Push Subscriptions & Dispatch
  // -------------------------------------------------------------------------
  async savePushSubscription(
    userId: string,
    data: {
      endpoint: string;
      p256dh: string;
      auth: string;
      userAgent?: string | null;
    }
  ): Promise<PushSubscriptionRecord> {
    const now = new Date();
    const id = crypto.randomUUID();
    const subRecord: PushSubscriptionRecord = {
      id,
      userId,
      endpoint: data.endpoint,
      p256dh: data.p256dh,
      auth: data.auth,
      userAgent: data.userAgent || null,
      createdAt: now,
    };

    if (db) {
      await db
        .insert(schema.pushSubs)
        .values({
          id: subRecord.id,
          userId: subRecord.userId,
          endpoint: subRecord.endpoint,
          p256dh: subRecord.p256dh,
          auth: subRecord.auth,
          userAgent: subRecord.userAgent,
          createdAt: now,
        })
        .onConflictDoUpdate({
          target: schema.pushSubs.endpoint,
          set: {
            userId: subRecord.userId,
            p256dh: subRecord.p256dh,
            auth: subRecord.auth,
            userAgent: subRecord.userAgent,
          },
        });
      return subRecord;
    }

    memoryStore.pushSubs.set(data.endpoint, subRecord);
    return subRecord;
  },

  async removePushSubscription(endpoint: string): Promise<boolean> {
    if (db) {
      await db
        .delete(schema.pushSubs)
        .where(eq(schema.pushSubs.endpoint, endpoint));
      return true;
    }
    return memoryStore.pushSubs.delete(endpoint);
  },

  async getPushSubscriptionsForUser(userId: string): Promise<PushSubscriptionRecord[]> {
    if (db) {
      const rows = await db
        .select()
        .from(schema.pushSubs)
        .where(eq(schema.pushSubs.userId, userId));
      return rows as unknown as PushSubscriptionRecord[];
    }

    return Array.from(memoryStore.pushSubs.values()).filter(
      (s) => s.userId === userId
    );
  },

  async getDueRemindersForDispatch(): Promise<
    Array<ReminderRecord & { user: UserRecord }>
  > {
    const now = new Date();

    if (db) {
      const rows = await db
        .select({
          reminder: schema.reminders,
          user: schema.users,
        })
        .from(schema.reminders)
        .innerJoin(schema.users, eq(schema.reminders.userId, schema.users.id))
        .where(
          and(
            eq(schema.reminders.status, "open"),
            lte(schema.reminders.dueAt, now),
            isNull(schema.reminders.notifiedAt)
          )
        );

      return rows.map((r) => ({
        ...(r.reminder as unknown as ReminderRecord),
        dueAt: new Date(r.reminder.dueAt),
        createdAt: new Date(r.reminder.createdAt),
        updatedAt: new Date(r.reminder.updatedAt),
        completedAt: r.reminder.completedAt ? new Date(r.reminder.completedAt) : null,
        notifiedAt: r.reminder.notifiedAt ? new Date(r.reminder.notifiedAt) : null,
        user: r.user as unknown as UserRecord,
      }));
    }

    const dueList: Array<ReminderRecord & { user: UserRecord }> = [];
    for (const r of memoryStore.reminders.values()) {
      if (r.status === "open" && r.dueAt <= now && !r.notifiedAt) {
        const user = memoryStore.users.get(r.userId);
        if (user) {
          dueList.push({
            ...r,
            user,
          });
        }
      }
    }
    return dueList;
  },

  async markReminderNotified(reminderId: string): Promise<void> {
    const now = new Date();
    if (db) {
      await db
        .update(schema.reminders)
        .set({ notifiedAt: now })
        .where(eq(schema.reminders.id, reminderId));
    } else {
      const r = memoryStore.reminders.get(reminderId);
      if (r) {
        r.notifiedAt = now;
      }
    }
  },
};
