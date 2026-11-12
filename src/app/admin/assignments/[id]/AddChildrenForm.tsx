'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

type District = { id: string; name: string }
type School = { id: string; name: string; district_id: string }
type Child = {
  id: string
  first_name: string
  age: number | null
  gender: string | null
  gift_requests: string | null
  gift_requests_en: string | null
  families: {
    id: string
    family_number: number
    schools: { id: string; name: string; district_id: string; districts: { id: string; name: string } }
  }
}

type FamilyGroup = {
  familyId: string
  familyNumber: number
  schoolName: string
  children: Child[]
}

type Props = {
  assignmentId: string
  children: Child[]
  districts: District[]
  schools: School[]
}

export default function AddChildrenForm({ assignmentId, children, districts, schools }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [filterDistrict, setFilterDistrict] = useState('')
  const [filterSchool, setFilterSchool] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const filteredSchools = filterDistrict
    ? schools.filter(s => s.district_id === filterDistrict)
    : schools

  const familyGroups = useMemo<FamilyGroup[]>(() => {
    const filtered = children.filter(c => {
      const school = (c.families as any)?.schools
      if (filterDistrict && school?.districts?.id !== filterDistrict) return false
      if (filterSchool && school?.id !== filterSchool) return false
      return true
    })
    const map = new Map<string, FamilyGroup>()
    for (const child of filtered) {
      const fam = child.families as any
      const famId = fam?.id ?? 'unknown'
      if (!map.has(famId)) {
        map.set(famId, {
          familyId: famId,
          familyNumber: fam?.family_number ?? 0,
          schoolName: fam?.schools?.name ?? '—',
          children: [],
        })
      }
      map.get(famId)!.children.push(child)
    }
    return Array.from(map.values()).sort((a, b) => a.familyNumber - b.familyNumber)
  }, [children, filterDistrict, filterSchool])

  const totalVisible = familyGroups.reduce((s, g) => s + g.children.length, 0)

  function toggleChild(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleFamily(group: FamilyGroup) {
    const allSelected = group.children.every(c => selected.has(c.id))
    setSelected(prev => {
      const next = new Set(prev)
      if (allSelected) group.children.forEach(c => next.delete(c.id))
      else group.children.forEach(c => next.add(c.id))
      return next
    })
  }

  function addRemainingFromFamily(group: FamilyGroup) {
    setSelected(prev => {
      const next = new Set(prev)
      group.children.forEach(c => next.add(c.id))
      return next
    })
  }

  function handleDistrictChange(id: string) {
    setFilterDistrict(id)
    setFilterSchool('')
  }

  async function handleAdd() {
    if (selected.size === 0) return
    setLoading(true)
    setError('')
    const res = await fetch(`/api/admin/assignments/${assignmentId}/children`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childIds: Array.from(selected) }),
    })
    setLoading(false)
    if (!res.ok) {
      const json = await res.json()
      setError(json.error || 'Failed to add children.')
      return
    }
    setOpen(false)
    setSelected(new Set())
    setFilterDistrict('')
    setFilterSchool('')
    router.refresh()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        disabled={children.length === 0}
        className="text-sm font-medium px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed"
        title={children.length === 0 ? 'No unassigned approved children available' : undefined}
      >
        + Add children
      </button>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-blue-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">Add children to this assignment</h2>
        <button onClick={() => { setOpen(false); setSelected(new Set()) }} className="text-sm text-gray-400 hover:text-gray-600">Cancel</button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select value={filterDistrict} onChange={e => handleDistrictChange(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All districts</option>
          {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select value={filterSchool} onChange={e => setFilterSchool(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All schools</option>
          {filteredSchools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <span className="text-xs text-gray-400 ml-auto">{totalVisible} available</span>
      </div>

      {familyGroups.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">No unassigned children match your filters.</p>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden max-h-[480px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <th className="w-10 px-3 py-2"></th>
                <th className="text-left px-3 py-2 text-gray-500 font-medium">Name</th>
                <th className="text-left px-3 py-2 text-gray-500 font-medium">Age / Gender</th>
                <th className="text-left px-3 py-2 text-gray-500 font-medium">School</th>
                <th className="text-left px-3 py-2 text-gray-500 font-medium">Gift requests</th>
              </tr>
            </thead>
            <tbody>
              {familyGroups.map(group => {
                const selectedCount = group.children.filter(c => selected.has(c.id)).length
                const allSelected = selectedCount === group.children.length
                const isPartial = selectedCount > 0 && !allSelected
                return (
                  <>
                    <tr
                      key={`fam-${group.familyId}`}
                      onClick={() => toggleFamily(group)}
                      className={`cursor-pointer border-t-2 ${
                        allSelected ? 'bg-blue-100 border-blue-300'
                        : isPartial ? 'bg-amber-50 border-amber-300'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={el => { if (el) el.indeterminate = isPartial }}
                          onChange={() => toggleFamily(group)}
                          onClick={e => e.stopPropagation()}
                          className="rounded border-gray-300 text-blue-600"
                        />
                      </td>
                      <td colSpan={4} className="px-3 py-2">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-gray-800 text-xs uppercase tracking-wide">
                            Family #{group.familyNumber}
                          </span>
                          <span className="text-xs text-gray-500">{group.schoolName}</span>
                          <span className="text-xs text-gray-400">{group.children.length} {group.children.length === 1 ? 'child' : 'children'}</span>
                          {isPartial && (
                            <span className="flex items-center gap-1.5 text-xs text-amber-700 font-medium ml-auto">
                              ⚠ {selectedCount} of {group.children.length} selected
                              <button
                                onClick={e => { e.stopPropagation(); addRemainingFromFamily(group) }}
                                className="underline hover:text-amber-900"
                              >add remaining</button>
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                    {group.children.map(child => {
                      const isSelected = selected.has(child.id)
                      return (
                        <tr
                          key={child.id}
                          onClick={() => toggleChild(child.id)}
                          className={`cursor-pointer border-t border-gray-100 ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                        >
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleChild(child.id)}
                              onClick={e => e.stopPropagation()}
                              className="rounded border-gray-300 text-blue-600"
                            />
                          </td>
                          <td className="px-3 py-2 pl-7 font-medium text-gray-900">{child.first_name}</td>
                          <td className="px-3 py-2 text-gray-500 text-xs">
                            {[child.age ? `Age ${child.age}` : null, child.gender].filter(Boolean).join(' · ') || '—'}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-500">{(child.families as any)?.schools?.name}</td>
                          <td className="px-3 py-2 text-gray-500 max-w-xs">
                            <span className="line-clamp-1">{child.gift_requests_en || child.gift_requests || '—'}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          onClick={handleAdd}
          disabled={loading || selected.size === 0}
          className="bg-blue-600 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Adding…' : `Add ${selected.size > 0 ? selected.size + ' ' : ''}child${selected.size !== 1 ? 'ren' : ''}`}
        </button>
        {selected.size > 0 && (
          <button onClick={() => setSelected(new Set())} className="text-sm text-gray-400 hover:text-gray-600">
            Clear selection
          </button>
        )}
      </div>
    </div>
  )
}
