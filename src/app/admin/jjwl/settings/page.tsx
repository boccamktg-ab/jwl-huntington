import { createClient } from '@supabase/supabase-js'
import JJWLSettingsForm from './JJWLSettingsForm'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function AdminJJWLSettingsPage() {
  const { data } = await db()
    .from('app_settings')
    .select('key, value')
    .in('key', ['jjwl_cheddarup_url'])

  const settings: Record<string, string> = {}
  for (const row of data ?? []) settings[row.key] = row.value

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">JJWL Settings</h1>
      <JJWLSettingsForm cheddarUpUrl={settings['jjwl_cheddarup_url'] ?? ''} />
    </div>
  )
}
