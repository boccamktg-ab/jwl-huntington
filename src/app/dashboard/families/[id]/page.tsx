import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import FamilyActions from './FamilyActions'
import AddChildForm from './AddChildForm'
import ChildCard from './ChildCard'
import EditFamilyForm from './EditFamilyForm'

export default async function FamilyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: family }, { data: sw }] = await Promise.all([
    supabase
      .from('families')
      .select(`
        id, family_number, num_children, status, language_pref, link_token,
        school_id, social_worker_id,
        schools ( id, name, districts ( name ) ),
        children ( id, first_name, age, gender, gift_requests, top_size, bottom_size, shoe_size, created_at )
      `)
      .eq('id', id)
      .single(),
    supabase
      .from('social_workers')
      .select('id')
      .eq('auth_id', user.id)
      .single(),
  ])

  if (!family) notFound()
  if (!sw || family.social_worker_id !== sw.id) notFound()

  // Get the SW's schools for the edit form
  const { data: swSchools } = await supabase
    .from('social_worker_schools')
    .select('school_id, schools ( id, name )')
    .eq('social_worker_id', sw?.id ?? '')

  const swSchoolList = swSchools?.map((s: any) => ({ id: s.schools.id, name: s.schools.name })) ?? []

  const school = family.schools as any
  const children = (family.children as any[]) ?? []
  const canEdit = family.status !== 'approved'

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">← Back</Link>
        <h1 className="text-2xl font-semibold text-gray-900">Family #{family.family_number}</h1>
        <StatusBadge status={family.status} />
      </div>

      {/* Family info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">School</p>
            <p className="font-medium text-gray-900">{school?.name}</p>
            <p className="text-gray-400 text-xs">{school?.districts?.name}</p>
          </div>
          <div>
            <p className="text-gray-500">Expected children</p>
            <p className="font-medium text-gray-900">{family.num_children}</p>
          </div>
          <div>
            <p className="text-gray-500">Language</p>
            <p className="font-medium text-gray-900">{family.language_pref === 'es' ? 'Spanish' : 'English'}</p>
          </div>
          <div>
            <p className="text-gray-500">Children entered</p>
            <p className={`font-medium ${children.length < family.num_children ? 'text-amber-600' : 'text-green-600'}`}>
              {children.length} of {family.num_children}
            </p>
          </div>
        </div>

        <EditFamilyForm
          familyId={family.id}
          familyNumber={family.family_number}
          numChildren={family.num_children}
          languagePref={family.language_pref}
          schoolId={family.school_id}
          schools={swSchoolList}
        />
      </div>

      {/* Actions */}
      <FamilyActions
        familyId={family.id}
        status={family.status}
        childCount={children.length}
        expectedCount={family.num_children}
        linkToken={family.link_token}
      />

      {/* Children */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-3">Children</h2>
        {children.length === 0 && (
          <p className="text-sm text-gray-400 mb-4">No children added yet.</p>
        )}
        <div className="space-y-3 mb-4">
          {children
            .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            .map((child: any) => (
              <ChildCard key={child.id} child={child} canEdit={canEdit} />
            ))}
        </div>

        {canEdit && <AddChildForm familyId={family.id} />}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    submitted: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}
