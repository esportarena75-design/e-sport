// Deploy with: supabase functions deploy send-push
// Then: alter database postgres set app.settings.push_function_url =
//   'https://<project-ref>.supabase.co/functions/v1/send-push';
//
// Called by the `dispatch_push_notification` trigger (see
// 20260830000000_notifications.sql) right after a row is inserted into
// `notifications`. Looks up the recipient's registered devices and forwards the
// message to Expo's push API, which then delivers it to iOS/Android.

import { createClient } from "jsr:@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

Deno.serve(async (req) => {
  try {
    const { notification_id } = await req.json();
    if (!notification_id) {
      return new Response(JSON.stringify({ error: "Missing notification_id" }), { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: notification, error: notificationError } = await supabase
      .from("notifications")
      .select("user_id, title, body, data")
      .eq("id", notification_id)
      .single();

    if (notificationError || !notification) {
      return new Response(JSON.stringify({ error: "Notification not found" }), { status: 404 });
    }

    const { data: devices, error: devicesError } = await supabase
      .from("devices")
      .select("expo_push_token")
      .eq("user_id", notification.user_id);

    if (devicesError) {
      return new Response(JSON.stringify({ error: devicesError.message }), { status: 500 });
    }

    if (!devices || devices.length === 0) {
      return new Response(JSON.stringify({ skipped: "no registered device" }), { status: 200 });
    }

    const messages = devices.map((d) => ({
      to: d.expo_push_token,
      title: notification.title,
      body: notification.body,
      data: notification.data ?? {},
      sound: "default",
    }));

    const expoResponse = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
    });

    const result = await expoResponse.json();
    return new Response(JSON.stringify(result), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
});
