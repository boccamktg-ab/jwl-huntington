import { createClient } from '@supabase/supabase-js'
import BackpackActions from './BackpackActions'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-green-100 text-green-700',
  waitlisted: 'bg-gray-100 text-gray-500',
}

export default async function BackpackAdminPage() {
  const admin = db()

  const { data: signups } = await admin
    .from('backpack_signups')
    .select('*')
    .order('created_at', { ascending: true })

  const confirmed = (signups ?? []).filter(s => s.status === 'confirmed').length
  const pending = (signups ?? []).filter(s => s.status === 'pending').length
  const waitlisted = (signups ?? []).filter(s => s.status === 'waitlisted').length
  const certUnsent = (signups ?? []).filter(s => s.status === 'confirmed' && !s.certificate_sent).length

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Backpack Event Signups</h1>
          <p className="text-sm text-gray-500 mt-0.5">August 26, 2025 · 8:00 AM–11:00 AM · 62 Hollywood Place, Huntington</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {certUnsent > 0 && (
            <BackpackActions action="certificate_all" label={`Send certificates (${certUnsent})`} variant="blue" />
          )}
          <a
            href="/api/backpacks/manage"
            className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:border-gray-400"
          >
            Export CSV
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-green-700">{confirmed}</p>
          <p className="text-xs text-gray-500 mt-0.5">confirmed / 15 max</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-amber-600">{pending}</p>
          <p className="text-xs text-gray-500 mt-0.5">pending review</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-gray-500">{waitlisted}</p>
          <p className="text-xs text-gray-500 mt-0.5">waitlisted</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Name</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">School</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Contact</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Cert</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium">Registered</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(signups ?? []).map((s: any) => (
              <tr key={s.id} className={s.status === 'waitlisted' ? 'opacity-60' : ''}>
                <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">{s.school ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  <p>{s.email}</p>
                  <p>{s.mobile}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[s.status]}`}>
                    {s.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs">
                  {s.status === 'confirmed'
                    ? (s.certificate_sent
                      ? <span className="text-green-700">✓ Sent</span>
                      : <BackpackActions id={s.id} action="certificate" label="Send" variant="ghost" />)
                    : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 text-right text-gray-400 text-xs">
                  {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 justify-end items-center">
                    {s.status !== 'confirmed' && (
                      <BackpackActions id={s.id} action="confirm" label="Confirm" variant="green" confirmedCount={confirmed} />
                    )}
                    {s.status !== 'waitlisted' && (
                      <BackpackActions id={s.id} action="waitlist" label="Waitlist" variant="gray" />
                    )}
                    <BackpackActions id={s.id} action="delete" label="Delete" variant="danger" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!signups || signups.length === 0) && (
          <p className="text-center text-gray-400 py-8 text-sm">No signups yet.</p>
        )}
      </div>
    </div>
  )
}
