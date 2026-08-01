import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import AddDistrictForm from './AddDistrictForm'
import AddSchoolForm from './AddSchoolForm'
import RemoveSchoolButton from './RemoveSchoolButton'
import SeasonSettings from './SeasonSettings'
import SeasonReset from './SeasonReset'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function SetupPage() {
  const supabase = adminClient()
  const [{ data: districts }, { data: settings }] = await Promise.all([
    supabase.from('districts').select('id, name, schools(id, name)').order('name'),
    supabase.from('app_settings').select('key, value'),
  ])

  const settingsMap = Object.fromEntries((settings ?? []).map(s => [s.key, s.value]))
  const submissionsOpen = settingsMap['submissions_open'] !== 'false'
  const closedMessage = settingsMap['submissions_closed_message'] ?? 'Family registration is currently closed.'

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-2xl font-semibold text-gray-900">Setup</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">Email Templates</h2>
          <p className="text-sm text-gray-500 mt-0.5">Preview and test every system email</p>
        </div>
        <Link href="/admin/email-preview" className="text-sm font-semibold text-white bg-[#1B52C1] hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors">
          Open →
        </Link>
      </div>

      <SeasonSettings submissionsOpen={submissionsOpen} closedMessage={closedMessage} />

      <SeasonReset />

      <h2 className="text-lg font-semibold text-gray-800">Districts &amp; Schools</h2>

      <div className="space-y-6">
        {(districts ?? []).map((district: any) => (
          <div key={district.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">{district.name}</h2>
            <ul className="space-y-1 mb-4">
              {(district.schools ?? [])
                .sort((a: any, b: any) => a.name.localeCompare(b.name))
                .map((school: any) => (
                  <li key={school.id} className="flex items-center text-sm text-gray-600 pl-3 border-l-2 border-gray-100">
                    <span className="flex-1">{school.name}</span>
                    <RemoveSchoolButton schoolId={school.id} schoolName={school.name} />
                  </li>
                ))}
            </ul>
            <AddSchoolForm districtId={district.id} />
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-3">Add district</h2>
        <AddDistrictForm />
      </div>
    </div>
  )
}
