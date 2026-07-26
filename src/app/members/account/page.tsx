import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import AccountForm from './AccountForm'

function db() {
  return adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export const dynamic = 'force-dynamic'

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: member } = await db()
    .from('jwl_members')
    .select('id, name, email, phone, join_year, dues_paid_through_year, member_positions(label, allows_detail), position_detail')
    .eq('auth_id', user!.id)
    .single()

  const currentYear = new Date().getFullYear()
  const paidThrough = (member as any)?.dues_paid_through_year ?? 0
  const joinYear = (member as any)?.join_year ?? 0
  const onGrace = joinYear > 0 && joinYear + 1 >= currentYear
  const duesStatus = paidThrough >= currentYear ? 'paid' : onGrace ? 'grace' : paidThrough > 0 ? 'overdue' : 'unknown'

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-semibold text-gray-900">My Account</h1>

      {/* Dues status card */}
      <div className={`rounded-xl border p-4 ${
        duesStatus === 'paid' ? 'border-green-200 bg-green-50' :
        duesStatus === 'grace' ? 'border-blue-200 bg-blue-50' :
        duesStatus === 'overdue' ? 'border-red-200 bg-red-50' :
        'border-gray-200 bg-gray-50'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Membership dues</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {duesStatus === 'paid' && `Paid through ${paidThrough}`}
              {duesStatus === 'grace' && `New member — dues not due until ${currentYear + 1}`}
              {duesStatus === 'overdue' && `Last paid through ${paidThrough} — renewal needed`}
              {duesStatus === 'unknown' && 'Dues status not on file — contact your board'}
            </p>
          </div>
          {duesStatus === 'overdue' && (
            <a
              href="#pay-dues"
              className="text-sm bg-[#1B52C1] text-white px-3 py-1.5 rounded-lg hover:bg-[#1540A0] font-medium"
            >
              Pay dues
            </a>
          )}
        </div>
      </div>

      <AccountForm
        memberId={(member as any)?.id}
        initialName={(member as any)?.name ?? ''}
        initialPhone={(member as any)?.phone ?? ''}
        authId={user!.id}
      />
    </div>
  )
}
