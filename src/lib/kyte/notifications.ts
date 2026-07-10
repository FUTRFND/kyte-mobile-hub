import { isNative } from "./native";
import { nextDue, parseDate, type Bill } from "./bills";

export type ReminderPrefs = {
  daysBefore: number[];           // e.g. [7,3,1,0]
  channels: string[];             // e.g. ["push","email"]
  quietStart: number | null;      // 0..23 or null
  quietEnd: number | null;        // 0..23 or null
  smartTiming: boolean;
};

export const DEFAULT_PREFS: ReminderPrefs = {
  daysBefore: [2],
  channels: ["push"],
  quietStart: null,
  quietEnd: null,
  smartTiming: false,
};

function hashId(uuid: string, offset = 0): number {
  let h = 0;
  for (let i = 0; i < uuid.length; i++) h = (h * 31 + uuid.charCodeAt(i)) | 0;
  return Math.abs((h + offset * 1_000_003) % 0x7fffffff);
}

/** Push fireAt out of the quiet-hours window if configured. */
function avoidQuietHours(fireAt: Date, prefs: ReminderPrefs): Date {
  const { quietStart, quietEnd } = prefs;
  if (quietStart == null || quietEnd == null || quietStart === quietEnd) return fireAt;
  const h = fireAt.getHours();
  const inWindow =
    quietStart < quietEnd
      ? h >= quietStart && h < quietEnd
      : h >= quietStart || h < quietEnd;
  if (!inWindow) return fireAt;
  const out = new Date(fireAt);
  out.setHours(quietEnd, 0, 0, 0);
  if (quietStart > quietEnd && h >= quietStart) out.setDate(out.getDate() + 1);
  return out;
}

export async function ensurePermission(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const status = await LocalNotifications.checkPermissions();
    if (status.display === "granted") return true;
    const req = await LocalNotifications.requestPermissions();
    return req.display === "granted";
  } catch (e) {
    console.warn("[notifications] permission failed", e);
    return false;
  }
}

export async function scheduleBillReminders(bill: Bill, prefs: ReminderPrefs): Promise<void> {
  if (!isNative()) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    // Cancel any existing reminders for this bill (up to 8 slots).
    const ids = Array.from({ length: 8 }, (_, i) => ({ id: hashId(bill.id, i) }));
    await LocalNotifications.cancel({ notifications: ids }).catch(() => {});

    // Honor snooze: skip if snoozed past the due date.
    const snoozedUntil = bill.snoozed_until ? parseDate(bill.snoozed_until) : null;
    const billLead = bill.reminder_days;
    const days = billLead != null ? [billLead] : prefs.daysBefore;
    if (days.length === 0 || !prefs.channels.includes("push")) return;

    const due = nextDue(bill);
    const now = Date.now();
    const toSchedule: { id: number; title: string; body: string; schedule: { at: Date; allowWhileIdle: boolean }; extra: { billId: string; lead: number } }[] = [];

    days.slice(0, 8).forEach((leadDays, slot) => {
      if (leadDays < 0) return;
      const fireAt = new Date(due);
      fireAt.setDate(fireAt.getDate() - leadDays);
      fireAt.setHours(9, 0, 0, 0);
      const adjusted = avoidQuietHours(fireAt, prefs);
      if (snoozedUntil && adjusted <= snoozedUntil) return;
      if (adjusted.getTime() < now + 60_000) return;
      toSchedule.push({
        id: hashId(bill.id, slot),
        title: bill.name,
        body:
          leadDays === 0
            ? `Due today — ${Number(bill.amount).toFixed(2)}`
            : `Due in ${leadDays} day${leadDays === 1 ? "" : "s"} — ${Number(bill.amount).toFixed(2)}`,
        schedule: { at: adjusted, allowWhileIdle: true },
        extra: { billId: bill.id, lead: leadDays },
      });
    });

    if (toSchedule.length) await LocalNotifications.schedule({ notifications: toSchedule });
  } catch (e) {
    console.warn("[notifications] schedule failed", e);
  }
}

export async function cancelBillReminder(billId: string): Promise<void> {
  if (!isNative()) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const ids = Array.from({ length: 8 }, (_, i) => ({ id: hashId(billId, i) }));
    await LocalNotifications.cancel({ notifications: ids });
  } catch {
    /* noop */
  }
}

export async function rescheduleAll(bills: Bill[], prefs: ReminderPrefs) {
  if (!isNative()) return;
  await ensurePermission();
  await Promise.all(bills.map((b) => scheduleBillReminders(b, prefs)));
}

// Legacy shim — keeps callers that still pass a single `leadDays` working
// by mapping it to the new multi-lead scheduler.
export async function scheduleBillReminder(bill: Bill, leadDays: number) {
  return scheduleBillReminders(bill, { ...DEFAULT_PREFS, daysBefore: [leadDays] });
}
