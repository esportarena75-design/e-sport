# send-push

Dispatches Expo push notifications when a row is inserted into `public.notifications`.
The in-app notification feed works without this (it just reads from the table via
RLS). This function is only needed for the actual push alert on the phone.

## Deploy (one-time, requires the Supabase CLI logged in to this project)

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase functions deploy send-push
```

## Wire it up (one-time, run in the SQL editor)

```sql
alter database postgres set app.settings.push_function_url =
  'https://<your-project-ref>.supabase.co/functions/v1/send-push';
```

Without this setting, `dispatch_push_notification()` (see
`20260830000000_notifications.sql`) silently no-ops -- notifications still get
created and show up in-app, they just won't trigger a push alert.

The function uses `SUPABASE_SERVICE_ROLE_KEY`, which Supabase injects into every
Edge Function automatically -- no extra secret configuration needed.
