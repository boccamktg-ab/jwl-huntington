'use client'

import { useState } from 'react'
import Image from 'next/image'
import { t, type Lang } from '@/lib/translations'

type Child = {
  id: string
  first_name: string
  age: number | null
  gender: string | null
  gift_requests: string | null
  top_size: string | null
  bottom_size: string | null
  shoe_size: string | null
}

type Family = {
  id: string
  familyNumber: string
  status: string
  languagePref: Lang
  linkToken: string
  school: string
  children: Child[]
}

const emptyForm = () => ({
  firstName: '', age: '', gender: '', giftRequests: '', topSize: '', bottomSize: '', shoeSize: '',
})

function childToForm(c: Child) {
  return {
    firstName: c.first_name,
    age: c.age != null ? String(c.age) : '',
    gender: c.gender ?? '',
    giftRequests: c.gift_requests ?? '',
    topSize: c.top_size ?? '',
    bottomSize: c.bottom_size ?? '',
    shoeSize: c.shoe_size ?? '',
  }
}

export default function FamilyForm({ family }: { family: Family }) {
  const [lang, setLang] = useState<Lang>(family.languagePref)
  const [children, setChildren] = useState<Child[]>(family.children)
  const [status, setStatus] = useState(family.status)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [submitLoading, setSubmitLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(emptyForm())
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')

  const tr = t[lang]

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function setEdit(field: string, value: string) {
    setEditForm(prev => ({ ...prev, [field]: value }))
  }

  function openEdit(child: Child) {
    setEditingId(child.id)
    setEditForm(childToForm(child))
    setEditError('')
  }

  function closeEdit() {
    setEditingId(null)
    setEditError('')
  }

  async function handleEditChild(e: React.FormEvent, childId: string) {
    e.preventDefault()
    if (!editForm.firstName.trim()) { setEditError(tr.childRequired); return }
    setEditLoading(true)
    setEditError('')

    const res = await fetch(`/api/family/${family.linkToken}/children`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: childId, ...editForm }),
    })
    const json = await res.json()

    if (!res.ok) {
      setEditError(json.error || 'Error')
      setEditLoading(false)
      return
    }

    setChildren(prev => prev.map(c => c.id === childId ? json.child : c))
    setEditingId(null)
    setEditLoading(false)
  }

  async function handleAddChild(e: React.FormEvent) {
    e.preventDefault()
    if (!form.firstName.trim()) { setFormError(tr.childRequired); return }
    setFormLoading(true)
    setFormError('')

    const res = await fetch(`/api/family/${family.linkToken}/children`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form }),
    })
    const json = await res.json()

    if (!res.ok) {
      setFormError(json.error || 'Error')
      setFormLoading(false)
      return
    }

    setChildren(prev => [...prev, json.child])
    setForm(emptyForm())
    setShowForm(false)
    setFormLoading(false)
  }

  async function handleRemoveChild(id: string, name: string) {
    if (!confirm(tr.confirmRemove(name))) return
    await fetch(`/api/family/${family.linkToken}/children`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setChildren(prev => prev.filter(c => c.id !== id))
  }

  async function handleSubmit() {
    if (children.length === 0) return
    setSubmitLoading(true)
    await fetch(`/api/family/${family.linkToken}/submit`, { method: 'POST' })
    setStatus('submitted')
    setSubmitLoading(false)
  }

  if (status === 'submitted' || status === 'approved') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-md text-center space-y-3">
          <div className="text-4xl">🎁</div>
          <h1 className="text-xl font-semibold text-gray-900">{tr.submitted}</h1>
          <p className="text-sm text-gray-500">{tr.submittedMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-lg mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center gap-3">
            <Image src="/jwl-logo.png" alt="JWL" width={48} height={48} className="object-contain" />
            <h1 className="text-lg font-semibold text-[#1B52C1]">{tr.title}</h1>
          </div>
          <button
            onClick={() => setLang(l => l === 'en' ? 'es' : 'en')}
            className="text-sm text-[#1B52C1] hover:underline"
          >
            {tr.language}
          </button>
        </div>

        {/* Family info */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-sm space-y-1">
          <div className="flex gap-2">
            <span className="text-gray-500">{tr.familyNumber}:</span>
            <span className="font-medium text-gray-900">{family.familyNumber}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-400 text-xs">{family.school}</span>
          </div>
        </div>

        {/* Children list */}
        <div className="space-y-3">
          {children.length === 0 && !showForm && (
            <p className="text-sm text-gray-400 text-center py-4">{tr.noChildrenYet}</p>
          )}
          {children.map(child => (
            <div key={child.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {editingId === child.id ? (
                <form onSubmit={e => handleEditChild(e, child.id)} className="p-4 space-y-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-gray-800">{tr.editChild ?? 'Edit child'}</p>
                    <button type="button" onClick={closeEdit} className="text-xs text-gray-400 hover:text-gray-600">{tr.cancel}</button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1">{tr.childName} *</label>
                      <input
                        type="text"
                        required
                        value={editForm.firstName}
                        onChange={e => setEdit('firstName', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{tr.age}</label>
                      <input
                        type="number"
                        min={0}
                        max={17}
                        value={editForm.age}
                        onChange={e => setEdit('age', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{tr.gender}</label>
                      <select
                        value={editForm.gender}
                        onChange={e => setEdit('gender', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {Object.entries(tr.genderOptions).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{tr.giftRequests}</label>
                    <textarea
                      rows={3}
                      value={editForm.giftRequests}
                      onChange={e => setEdit('giftRequests', e.target.value)}
                      placeholder={tr.giftRequestsPlaceholder}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {(['topSize', 'bottomSize', 'shoeSize'] as const).map((field, i) => (
                      <div key={field}>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {[tr.topSize, tr.bottomSize, tr.shoeSize][i]}
                        </label>
                        <input
                          type="text"
                          value={editForm[field]}
                          onChange={e => setEdit(field, e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                  {editError && <p className="text-sm text-red-600">{editError}</p>}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={editLoading}
                      className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {editLoading ? tr.saving : tr.saveChild}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveChild(child.id, child.first_name)}
                      className="text-sm text-red-400 hover:text-red-600 px-4 py-2 rounded-lg hover:bg-red-50"
                    >
                      {tr.removeChild}
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => openEdit(child)}
                  className="w-full text-left p-4 hover:bg-blue-50 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{child.first_name}</p>
                        {(child.age || child.gender) && (
                          <span className="text-xs text-gray-400">
                            {[child.age ? `${tr.age} ${child.age}` : null,
                              child.gender ? (tr.genderOptions as any)[child.gender] : null
                            ].filter(Boolean).join(' · ')}
                          </span>
                        )}
                      </div>
                      {child.gift_requests && (
                        <p className="text-sm text-gray-600">{child.gift_requests}</p>
                      )}
                      <div className="flex gap-3 text-xs text-gray-400 flex-wrap">
                        {child.top_size && <span>{tr.topSize}: {child.top_size}</span>}
                        {child.bottom_size && <span>{tr.bottomSize}: {child.bottom_size}</span>}
                        {child.shoe_size && <span>{tr.shoeSize}: {child.shoe_size}</span>}
                      </div>
                    </div>
                    <span className="text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
                      {tr.editChild ?? 'Edit'}
                    </span>
                  </div>
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add child form */}
        {showForm ? (
          <form onSubmit={handleAddChild} className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">{tr.childName} *</label>
                <input
                  type="text"
                  required
                  value={form.firstName}
                  onChange={e => set('firstName', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{tr.age}</label>
                <input
                  type="number"
                  min={0}
                  max={17}
                  value={form.age}
                  onChange={e => set('age', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{tr.gender}</label>
                <select
                  value={form.gender}
                  onChange={e => set('gender', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(tr.genderOptions).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{tr.giftRequests}</label>
              <textarea
                rows={3}
                value={form.giftRequests}
                onChange={e => set('giftRequests', e.target.value)}
                placeholder={tr.giftRequestsPlaceholder}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              {(['topSize', 'bottomSize', 'shoeSize'] as const).map((field, i) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {[tr.topSize, tr.bottomSize, tr.shoeSize][i]}
                  </label>
                  <input
                    type="text"
                    value={form[field]}
                    onChange={e => set(field, e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>

            {formError && <p className="text-sm text-red-600">{formError}</p>}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={formLoading}
                className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {formLoading ? tr.saving : tr.saveChild}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setFormError('') }}
                className="text-sm text-gray-500 px-4 py-2 rounded-lg hover:bg-gray-100"
              >
                {tr.cancel}
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            {tr.addChild}
          </button>
        )}

        {/* Submit */}
        <div className="pb-8">
          <button
            onClick={handleSubmit}
            disabled={submitLoading || children.length === 0}
            className="w-full bg-green-600 text-white font-medium py-3 rounded-xl hover:bg-green-700 disabled:opacity-40 transition-colors"
          >
            {submitLoading ? tr.submitting : tr.submit}
          </button>
          {children.length === 0 && (
            <p className="text-xs text-gray-400 text-center mt-2">{tr.submitDisabled}</p>
          )}
        </div>

      </div>
    </div>
  )
}
