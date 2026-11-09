import { ReminderRecord, WorkspaceRecord } from "./db-repo";

const REMINDERS_CACHE_KEY = "remidify_cached_reminders";
const WORKSPACES_CACHE_KEY = "remidify_cached_workspaces";
const MUTATION_QUEUE_KEY = "remidify_mutation_queue";

export interface PendingMutation {
  id: string;
  type: "create" | "patch" | "delete";
  url: string;
  payload?: any;
  createdAt: number;
}

export function getCachedReminders(): ReminderRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(REMINDERS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed.map((r: any) => ({
      ...r,
      dueAt: new Date(r.dueAt),
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
    }));
  } catch {
    return [];
  }
}

export function setCachedReminders(reminders: ReminderRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(REMINDERS_CACHE_KEY, JSON.stringify(reminders));
  } catch (e) {
    console.error("[Cache] Failed to cache reminders:", e);
  }
}

export function getCachedWorkspaces(): WorkspaceRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WORKSPACES_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setCachedWorkspaces(workspaces: WorkspaceRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(WORKSPACES_CACHE_KEY, JSON.stringify(workspaces));
  } catch (e) {
    console.error("[Cache] Failed to cache workspaces:", e);
  }
}

export function enqueueOfflineMutation(
  type: "create" | "patch" | "delete",
  url: string,
  payload?: any
): void {
  if (typeof window === "undefined") return;
  try {
    const existing: PendingMutation[] = JSON.parse(
      localStorage.getItem(MUTATION_QUEUE_KEY) || "[]"
    );
    existing.push({
      id: crypto.randomUUID(),
      type,
      url,
      payload,
      createdAt: Date.now(),
    });
    localStorage.setItem(MUTATION_QUEUE_KEY, JSON.stringify(existing));
  } catch (e) {
    console.error("[OfflineQueue] Failed to enqueue mutation:", e);
  }
}

export function getPendingMutationCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const existing = JSON.parse(
      localStorage.getItem(MUTATION_QUEUE_KEY) || "[]"
    );
    return existing.length;
  } catch {
    return 0;
  }
}

export async function syncPendingMutations(): Promise<number> {
  if (typeof window === "undefined" || !navigator.onLine) return 0;

  try {
    const raw = localStorage.getItem(MUTATION_QUEUE_KEY);
    if (!raw) return 0;

    const queue: PendingMutation[] = JSON.parse(raw);
    if (queue.length === 0) return 0;

    const failed: PendingMutation[] = [];
    let syncedCount = 0;

    for (const item of queue) {
      try {
        const method =
          item.type === "create"
            ? "POST"
            : item.type === "patch"
              ? "PATCH"
              : "DELETE";

        const res = await fetch(item.url, {
          method,
          headers: item.payload ? { "Content-Type": "application/json" } : {},
          body: item.payload ? JSON.stringify(item.payload) : undefined,
        });

        if (res.ok) {
          syncedCount++;
        } else {
          failed.push(item);
        }
      } catch {
        failed.push(item);
      }
    }

    if (failed.length > 0) {
      localStorage.setItem(MUTATION_QUEUE_KEY, JSON.stringify(failed));
    } else {
      localStorage.removeItem(MUTATION_QUEUE_KEY);
    }

    return syncedCount;
  } catch (err) {
    console.error("[OfflineQueue] Sync error:", err);
    return 0;
  }
}

