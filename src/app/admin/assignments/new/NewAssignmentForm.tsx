'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

type Member = { id: string; name: string; email: string }
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
    family_number: string
    schools: { id: string; name: string; district_id: string; districts: { id: string; name: string } }
  }
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

  const filteredSchools = filterDistrict
    ? schools.filter(s => s.district_id === filterDistrict)
    : schools

  const visibleChildren = useMemo(() => {
    return children.filter(c => {
      const school = (c.families as any)?.schools
      if (filterDistrict && school?.districts?.id !== filterDistrict) return false
      if (filterSchool && school?.id !== filterSchool) return false
      return true
    })
  }, [children, filterDistrict, filterSchool])

  function toggleChild(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(visibleChildren.map(c => c.id)))
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
    // Refresh to get updated member list
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
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name}{m.email ? ` (${m.email})` : ''}</option>
              ))}
            </select>
            <button
              onClick={() => setAddingMember(true)}
              className="text-sm text-blue-600 hover:underline"
            >
              + Add new member
            </button>
          </div>
        ) : (
          <div className="flex gap-2 flex-wrap items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Name *</label>
              <input
                type="text"
                value={newMemberName}
                onChange={e => setNewMemberName(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Email (optional)</label>
              <input
                type="email"
                value={newMemberEmail}
                onChange={e => setNewMemberEmail(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleCreateMember}
              disabled={loading}
              className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Add
            </button>
            <button onClick={() => setAddingMember(false)} className="text-sm text-gray-400 hover:text-gray-600">
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Step 2: Select children */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">2. Select Children</h2>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={filterDistrict}
            onChange={e => handleDistrictChange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All districts</option>
            {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select
            value={filterSchool}
            onChange={e => setFilterSchool(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All schools</option>
            {filteredSchools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div className="flex gap-2 ml-auto text-sm">
            <button onClick={selectAll} className="text-blue-600 hover:underline">Select all ({visibleChildren.length})</button>
            <span className="text-gray-300">|</span>
            <button onClick={clearAll} className="text-gray-500 hover:underline">Clear</button>
          </div>
        </div>

        <p className="text-xs text-gray-500">
          {selected.size} selected · {children.length} unassigned children total
        </p>

        {visibleChildren.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No unassigned children match your filters.</p>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="w-10 px-3 py-2"></th>
                  <th className="text-left px-3 py-2 text-gray-500 font-medium">Name</th>
                  <th className="text-left px-3 py-2 text-gray-500 font-medium">Age / Gender</th>
                  <th className="text-left px-3 py-2 text-gray-500 font-medium">Family #</th>
                  <th className="text-left px-3 py-2 text-gray-500 font-medium">School</th>
                  <th className="text-left px-3 py-2 text-gray-500 font-medium">Gift requests</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleChildren.map(child => {
                  const fam = child.families as any
                  const isSelected = selected.has(child.id)
                  return (
                    <tr
                      key={child.id}
                      onClick={() => toggleChild(child.id)}
                      className={`cursor-pointer ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
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
                      <td className="px-3 py-2 font-medium text-gray-900">{child.first_name}</td>
                      <td className="px-3 py-2 text-gray-500 text-xs">
                        {[child.age ? `Age ${child.age}` : null, child.gender].filter(Boolean).join(' · ') || '—'}
                      </td>
                      <td className="px-3 py-2 text-gray-600">{fam?.family_number}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{fam?.schools?.name}</td>
                      <td className="px-3 py-2 text-gray-500 max-w-xs">
                        <span className="line-clamp-1">{child.gift_requests_en || child.gift_requests || '—'}</span>
                      </td>
                    </tr>
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
