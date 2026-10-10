'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

type Family = {
  id: string
  family_number: string
  family_surname: string | null
  num_children: number
  status: string
  schools: { id: string; name: string; districts: { name: string } } | null
  children: { id: string }[]
}

type School = { id: string; name: string; district_name: string }

type NewRow = {
  key: number
  familyNumber: string
  familySurname: string
  numChildren: string
  schoolId: string
  languagePref: string
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  submitted: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
}

function blankRow(key: number, defaultSchoolId: string): NewRow {
  return { key, familyNumber: '', familySurname: '', numChildren: '1', schoolId: defaultSchoolId, languagePref: 'en' }
}

export default function FamiliesTable({
  families,
  schools,
  submissionsOpen,
}: {
  families: Family[]
  schools: School[]
  submissionsOpen: boolean
}) {
  const router = useRouter()
  const counter = useRef(0)
  const defaultSchool = schools.length === 1 ? schools[0].id : ''

  const [newRows, setNewRows] = useState<NewRow[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function addRow() {
    setNewRows(r => [...r, blankRow(++counter.current, defaultSchool)])
  }

  function removeRow(key: number) {
    setNewRows(r => r.filter(row => row.key !== key))
  }

  function updateRow(key: number, field: keyof NewRow, value: string) {
    setNewRows(r => r.map(row => row.key === key ? { ...row, [field]: value } : row))
  }

  async function saveNewRows() {
    const valid = newRows.filter(r => r.familyNumber.trim() && r.schoolId && Number(r.numChildren) >= 1)
    if (valid.length === 0) return

    setSaving(true)
    setError('')

    const res = await fetch('/api/families', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(valid.map(r => ({
        familyNumber: r.familyNumber.trim(),
        familySurname: r.familySurname.trim() || null,
        numChildren: Number(r.numChildren),
        schoolId: r.schoolId,
        languagePref: r.languagePref,
      }))),
    })

    const json = await res.json()
    if (!res.ok) {
      setError(json.error || 'Failed to save families.')
      setSaving(false)
      return
    }

    setNewRows([])
    router.refresh()
    setSaving(false)
  }

  const showSchoolCol = schools.length > 1 || families.some(f => f.schools)
  const hasPending = newRows.some(r => r.familyNumber.trim() && r.schoolId)

  const thCls = 'text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pb-2 pr-3 whitespace-nowrap'
  const tdCls = 'py-2.5 pr-3 text-sm'
  const inputCls = 'w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-50 border border-red-300 rounded-xl px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 px-5">
                <th className={`${thCls} pl-5`}>Family #</th>
                <th className={thCls}>Surname <span className="text-gray-400 font-normal normal-case tracking-normal">(optional)</span></th>
                {showSchoolCol && <th className={thCls}>School</th>}
                <th className={thCls}>Children</th>
                <th className={thCls}>Language</th>
                <th className={thCls}>Status</th>
                <th className={`${thCls} pr-5`}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {/* Existing families */}
              {families.length === 0 && newRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-gray-400 pl-5">
                    No families yet. Use the rows below to add your first families.
                  </td>
                </tr>
              )}
              {families.map(f => (
                <tr
                  key={f.id}
                  onClick={() => router.push(`/dashboard/families/${f.id}`)}
                  className="hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <td className={`${tdCls} pl-5 font-medium text-gray-900`}>
                    #{f.family_number}
                  </td>
                  <td className={`${tdCls} text-gray-500`}>
                    {f.family_surname || <span className="text-gray-300">—</span>}
                  </td>
                  {showSchoolCol && (
                    <td className={`${tdCls} text-gray-500`}>
                      {f.schools?.name}
                    </td>
                  )}
                  <td className={`${tdCls} text-gray-500`}>
                    {f.children?.length ?? 0} / {f.num_children}
                  </td>
                  <td className={`${tdCls} text-gray-400`}>
                    —
                  </td>
                  <td className={tdCls}>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[f.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {f.status.charAt(0).toUpperCase() + f.status.slice(1)}
                    </span>
                  </td>
                  <td className={`${tdCls} pr-5 text-right`}>
                    <span className="text-xs text-blue-600">Edit →</span>
                  </td>
                </tr>
              ))}

              {/* New input rows */}
              {newRows.map((row, i) => (
                <tr key={row.key} className="bg-blue-50/40">
                  <td className={`${tdCls} pl-5`}>
                    <input
                      type="text"
                      placeholder="e.g. 42"
                      value={row.familyNumber}
                      onChange={e => updateRow(row.key, 'familyNumber', e.target.value)}
                      className={inputCls}
                      autoFocus={i === 0}
                    />
                  </td>
                  <td className={tdCls}>
                    <input
                      type="text"
                      placeholder="Smith"
                      value={row.familySurname}
                      onChange={e => updateRow(row.key, 'familySurname', e.target.value)}
                      className={inputCls}
                    />
                  </td>
                  {showSchoolCol && (
                    <td className={tdCls}>
                      <select
                        value={row.schoolId}
                        onChange={e => updateRow(row.key, 'schoolId', e.target.value)}
                        className={inputCls}
                      >
                        <option value="">Select…</option>
                        {schools.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </td>
                  )}
                  <td className={tdCls}>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={row.numChildren}
                      onChange={e => updateRow(row.key, 'numChildren', e.target.value)}
                      className={`${inputCls} w-16`}
                    />
                  </td>
                  <td className={tdCls}>
                    <select
                      value={row.languagePref}
                      onChange={e => updateRow(row.key, 'languagePref', e.target.value)}
                      className={inputCls}
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                    </select>
                  </td>
                  <td className={`${tdCls} text-gray-400 text-xs`}>New</td>
                  <td className={`${tdCls} pr-5 text-right`}>
                    <button onClick={() => removeRow(row.key)} className="text-gray-400 hover:text-red-500 text-lg leading-none">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer actions */}
        {submissionsOpen && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/60">
            <button
              onClick={addRow}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
            >
              + Add row
            </button>
            {hasPending && (
              <button
                onClick={saveNewRows}
                disabled={saving}
                className="text-sm bg-[#1B52C1] text-white px-4 py-1.5 rounded-lg font-medium hover:bg-[#1540A0] disabled:opacity-50"
              >
                {saving ? 'Saving…' : `Save ${newRows.filter(r => r.familyNumber.trim() && r.schoolId).length} ${newRows.filter(r => r.familyNumber.trim() && r.schoolId).length === 1 ? 'family' : 'families'}`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
