import { supabase } from "./supabase";

// Check if running inside Capacitor native shell
export function isCapacitor(): boolean {
  return typeof window !== "undefined" && !!(window as any).Capacitor?.isNativePlatform?.();
}

export async function requestNativePermission(): Promise<boolean> {
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const result = await LocalNotifications.requestPermissions();
    return result.display === "granted";
  } catch {
    return false;
  }
}

export async function checkNativePermission(): Promise<string> {
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const result = await LocalNotifications.checkPermissions();
    return result.display; // "granted" | "denied" | "prompt"
  } catch {
    return "denied";
  }
}

export async function scheduleDailyChallenge(): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");

    // Cancel any existing scheduled notifications
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel(pending);
    }

    // Get today's scheduled time from server
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("daily_notifications")
      .select("scheduled_hour, scheduled_minute, sent")
      .eq("date", today)
      .maybeSingle();

    if (!data || data.sent) {
      // Already sent today or no schedule yet — schedule a check for tomorrow
      // Schedule a fallback notification for tomorrow at a random time between 9-20
      const hour = 9 + Math.floor(Math.random() * 12);
      const minute = Math.floor(Math.random() * 60);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(hour, minute, 0, 0);

      await LocalNotifications.schedule({
        notifications: [{
          title: "LOGOFF \ud83c\udf3f",
          body: "time to log off. you have 1 hour to go outside and post",
          id: 1,
          schedule: { at: tomorrow },
          sound: "default",
        }],
      });
      return true;
    }

    // Schedule for today's time
    const scheduledTime = new Date();
    scheduledTime.setUTCHours(data.scheduled_hour, data.scheduled_minute, 0, 0);

    // If the time hasn't passed yet, schedule it
    if (scheduledTime > new Date()) {
      await LocalNotifications.schedule({
        notifications: [{
          title: "LOGOFF \ud83c\udf3f",
          body: "time to log off. you have 1 hour to go outside and post",
          id: 1,
          schedule: { at: scheduledTime },
          sound: "default",
        }],
      });
    }

    return true;
  } catch (err) {
    console.error("Failed to schedule notification:", err);
    return false;
  }
}
