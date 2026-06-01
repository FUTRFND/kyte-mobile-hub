import { isNative } from "./native";
import { nextDue, parseDate, type Bill } from "./bills";

// Each bill schedule produces a stable numeric id derived from its UUID,
// so re-scheduling replaces the prior notification cleanly.
function hashId(uuid: string): number {
  let h = 0;
  for (let i = 0; i < uuid.length; i++) {
    h = (h * 31 + uuid.charCodeAt(i)) | 0;
  }
  // Keep positive 31-bit int — LocalNotifications requires Int32.
  return Math.abs(h % 0x7fffffff);
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

export async function scheduleBillReminder(
  bill: Bill,
  defaultLeadDays: number,
): Promise<void> {
  if (!isNative()) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const id = hashId(bill.id);
    await LocalNotifications.cancel({ notifications: [{ id }] }).catch(() => {});

    const leadDays = bill.reminder_days ?? defaultLeadDays;
    if (leadDays < 0) return;

    const due = nextDue(bill);
    const fireAt = new Date(due);
    fireAt.setDate(fireAt.getDate() - leadDays);
    fireAt.setHours(9, 0, 0, 0);
    if (fireAt.getTime() < Date.now() + 60_000) return; // in the past

    await LocalNotifications.schedule({
      notifications: [
        {
          id,
          title: bill.name,
          body:
            leadDays === 0
              ? `Due today — ${Number(bill.amount).toFixed(2)}`
              : `Due in ${leadDays} day${leadDays === 1 ? "" : "s"} — ${Number(bill.amount).toFixed(2)}`,
          schedule: { at: fireAt, allowWhileIdle: true },
          extra: { billId: bill.id },
        },
      ],
    });
  } catch (e) {
    console.warn("[notifications] schedule failed", e);
  }
}

export async function cancelBillReminder(billId: string): Promise<void> {
  if (!isNative()) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.cancel({ notifications: [{ id: hashId(billId) }] });
  } catch {
    /* noop */
  }
}

export async function rescheduleAll(bills: Bill[], defaultLeadDays: number) {
  if (!isNative()) return;
  await ensurePermission();
  await Promise.all(bills.map((b) => scheduleBillReminder(b, defaultLeadDays)));
}
