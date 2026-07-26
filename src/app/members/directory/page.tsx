import { createClient as adminSupabase } from '@supabase/supabase-js'

function db() {
  return adminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export const dynamic = 'force-dynamic'

export default async function MemberDirectoryPage() {
  const { data: members } = await db()
    .from('jwl_members')
    .select('id, name, email, phone, avatar_url, position_id, position_detail, member_positions ( label, allows_detail )')
    .eq('status', 'approved')
    .order('name')

  const rows = (members ?? []) as any[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Member Directory</h1>
        <p className="text-sm text-gray-500 mt-1">{rows.length} active member{rows.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Name</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Position</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Phone</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Email</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(m => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                    {m.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.avatar_url} alt={m.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-gray-400">
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="font-medium text-gray-900">{m.name}</span>
                </div>
              </td>
                <td className="px-5 py-3 text-gray-600">
                  {m.member_positions ? (
                    <>
                      {m.member_positions.label}
                      {m.position_detail && (
                        <span className="block text-xs text-gray-400">{m.position_detail}</span>
                      )}
                    </>
                  ) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-5 py-3 text-gray-600">
                  {m.phone
                    ? <a href={`tel:${m.phone}`} className="hover:underline">{m.phone}</a>
                    : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-5 py-3">
                  <a href={`mailto:${m.email}`} className="text-[#1B52C1] hover:underline">{m.email}</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
