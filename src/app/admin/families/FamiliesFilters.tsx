'use client'

import { useRouter, usePathname } from 'next/navigation'

type District = { id: string; name: string }
type School = { id: string; name: string; district_id: string }
type SW = { id: string; name: string }

type Props = {
  districts: District[]
  schools: School[]
  socialWorkers: SW[]
  currentFilters: { district?: string; school?: string; sw?: string; status?: string }
}

const STATUSES = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'draft', label: 'Draft' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

export default function FamiliesFilters({ districts, schools, socialWorkers, currentFilters }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams()
    const merged = { ...currentFilters, [key]: value }
    if (key === 'district') delete merged.school
    Object.entries(merged).forEach(([k, v]) => { if (v) params.set(k, v) })
    router.push(`${pathname}?${params.toString()}`)
  }

  const filteredSchools = currentFilters.district
    ? schools.filter(s => s.district_id === currentFilters.district)
    : schools

  const hasFilters = currentFilters.district || currentFilters.school || currentFilters.sw || currentFilters.status

  return (
    <div className="flex flex-wrap gap-3">
      <select
        value={currentFilters.status ?? ''}
        onChange={e => updateFilter('status', e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All statuses</option>
        {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>

      <select
        value={currentFilters.district ?? ''}
        onChange={e => updateFilter('district', e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All districts</option>
        {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>

      <select
        value={currentFilters.school ?? ''}
        onChange={e => updateFilter('school', e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All schools</option>
        {filteredSchools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>

      <select
        value={currentFilters.sw ?? ''}
        onChange={e => updateFilter('sw', e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All social workers</option>
        {socialWorkers.map(sw => <option key={sw.id} value={sw.id}>{sw.name}</option>)}
      </select>

      {hasFilters && (
        <button
          onClick={() => router.push(pathname)}
          className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
