'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

type Member = { id: string; name: string; email: string; children_requested: number | null; children_assigned: number }
type District = { id: string; name: string }
type School = { id: string; name: string; district_id: string }
type Child = {
  id: string
  first_name: string
  age: number | null
  gender: string | null
  gift_requests: string | null
  gift_requests_en: string | null
  top_size: string | null
  bottom_size: string | null
  shoe_size: string | null
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
  members: Member[]
  districts: District[]
  schools: School[]
  children: Child[]
}

export default function NewAssignmentForm({ members, districts, schools, children }: Props) {
  const router = useRouter()
  const [memberId, setMemberId] = useState('')
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [addingMember, setAddingMember] = useState(false)
  const [filterDistrict, setFilterDistrict] = useState('')
  const [filterSchool, setFilterSchool] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selectedMember = members.find(m => m.id === memberId) ?? null
  const target = selectedMember?.children_requested ?? null

  const filteredSchools = filterDistrict
    ? schools.filter(s => s.district_id === filterDistrict)
    : schools

  // Group children by family, sorted by family number
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
      if (allSelected) {
        group.children.forEach(c => next.delete(c.id))
      } else {
        group.children.forEach(c => next.add(c.id))
      }
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

  function selectAll() {
    setSelected(new Set(familyGroups.flatMap(g => g.children.map(c => c.id))))
  }

  function clearAll() {
    setSelected(new Set())
  }

  function handleDistrictChange(id: string) {
    setFilterDistrict(id)
    setFilterSchool('')
  }

  async function handleCreateMember() {
    if (!newMemberName.trim()) return
    setLoading(true)
    const res = await fetch('/api/admin/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newMemberName, email: newMemberEmail }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) { setError(json.error); return }
    setMemberId(json.id)
    setAddingMember(false)
    setNewMemberName('')
    setNewMemberEmail('')
    router.refresh()
  }

  async function handleSubmit() {
    if (!memberId) { setError('Select a JWL member.'); return }
    if (selected.size === 0) { setError('Select at least one child.'); return }
    setLoading(true)
    setError('')
    const res = await fetch('/api/admin/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, childIds: Array.from(selected) }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error || 'Failed to create assignment.'); setLoading(false); return }
    router.push(`/admin/assignments/${json.id}`)
  }

  // Target progress bar
  const pct = target && target > 0 ? Math.min(100, Math.round((selected.size / target) * 100)) : null
  const overTarget = target !== null && selected.size > target

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
        <h1 className="text-2xl font-semibold text-gray-900">New Assignment</h1>
      </div>

      {/* Step 1: JWL Member */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">1. Select JWL Member</h2>

        {!addingMember ? (
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={memberId}
              onChange={e => setMemberId(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-48"
            >
              <option value="">Select a member…</option>
              {members.map(m => {
                const req = m.children_requested
                const assigned = m.children_assigned
                let label = m.name
                if (req) {
                  const remaining = req - assigned
                  if (assigned > 0) {
                    label += remaining > 0
                      ? ` — needs ${remaining} more (${assigned}/${req})`
                      : assigned === req
                      ? ` — fulfilled (${assigned}/${req})`
                      : ` — over by ${-remaining} (${assigned}/${req})`
                  } else {
                    label += ` — needs ${req} (0/${req})`
                  }
                } else if (assigned > 0) {
                  label += ` — ${assigned} assigned`
                }
                return <option key={m.id} value={m.id}>{label}</option>
              })}
            </select>
            <button onClick={() => setAddingMember(true)} className="text-sm text-blue-600 hover:underline">
              + Add new member
            </button>
          </div>
        ) : (
          <div className="flex gap-2 flex-wrap items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Name *</label>
              <input type="text" value={newMemberName} onChange={e => setNewMemberName(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Email (optional)</label>
              <input type="email" value={newMemberEmail} onChange={e => setNewMemberEmail(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button onClick={handleCreateMember} disabled={loading}
              className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">Add</button>
            <button onClick={() => setAddingMember(false)} className="text-sm text-gray-400 hover:text-gray-600">Cancel</button>
          </div>
        )}

        {/* Target progress */}
        {memberId && (
          <div className="mt-2 pt-3 border-t border-gray-100">
            {target ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className={`font-medium ${overTarget ? 'text-red-600' : 'text-gray-700'}`}>
                    {selected.size} of {target} children selected
                    {overTarget && ' — over target!'}
                  </span>
                  <span className="text-xs text-gray-400">{pct}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all ${overTarget ? 'bg-red-500' : pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {pct === 100 && !overTarget && (
                  <p className="text-xs text-green-600 font-medium">✓ Target reached</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400">
                {selected.size} selected · {selectedMember?.name} has no requested count set
              </p>
            )}
          </div>
        )}
      </div>

      {/* Step 2: Select children */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">2. Select Children</h2>

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
          <div className="flex gap-2 ml-auto text-sm">
            <button onClick={selectAll} className="text-blue-600 hover:underline">Select all ({totalVisible})</button>
            <span className="text-gray-300">|</span>
            <button onClick={clearAll} className="text-gray-500 hover:underline">Clear</button>
          </div>
        </div>

        <p className="text-xs text-gray-500">
          {familyGroups.length} {familyGroups.length === 1 ? 'family' : 'families'} · {totalVisible} children · grouped by family — click a family row to select all siblings
        </p>

        {familyGroups.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No unassigned children match your filters.</p>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden max-h-[560px] overflow-y-auto">
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
                  const someSelected = selectedCount > 0 && !allSelected
                  const isPartial = someSelected

                  return (
                    <>
                      {/* Family header row */}
                      <tr
                        key={`fam-${group.familyId}`}
                        onClick={() => toggleFamily(group)}
                        className={`cursor-pointer border-t-2 ${
                          allSelected
                            ? 'bg-blue-100 border-blue-300'
                            : isPartial
                            ? 'bg-amber-50 border-amber-300'
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
                                >
                                  add remaining
                                </button>
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Children rows */}
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
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading || selected.size === 0 || !memberId}
        className="bg-blue-600 text-white font-medium px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Creating…' : `Create Assignment (${selected.size} children)`}
      </button>
    </div>
  )
}
