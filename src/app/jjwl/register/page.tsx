'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

type School = { id: string; name: string }

const GRADES = ['6th', '7th', '8th', '9th', '10th', '11th', '12th']

export default function JJWLRegisterPage() {
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '', email: '', password: '', grade: '', phone: '',
    school_id: '', parent_name: '', parent_phone: '', parent_email: '',
  })

  useEffect(() => {
    fetch('/api/jjwl/schools').then(r => r.json()).then(d => {
      if (d.schools) setSchools(d.schools)
    })
  }, [])

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/jjwl/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Registration failed.')
      setLoading(false)
      return
    }
    setDone(true)
  }

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B52C1]'

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md w-full text-center space-y-4">
          <div className="text-4xl">🎉</div>
          <h1 className="text-xl font-semibold text-gray-900">Application Submitted!</h1>
          <p className="text-sm text-gray-600">
            Thank you for applying to the JJWL program. An administrator will review your registration and you&apos;ll hear from us by email.
          </p>
          <Link href="/login" className="inline-block text-sm text-[#1B52C1] hover:underline">Back to sign in</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-[#1B52C1] px-6 py-3 flex items-center gap-3">
        <Image src="/jwl-logo.png" alt="JWL" width={32} height={32} className="object-contain bg-white rounded-full p-0.5" />
        <span className="font-semibold text-white text-sm">Junior Junior Welfare League</span>
      </nav>

      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 space-y-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Join JJWL</h1>
            <p className="text-sm text-gray-500 mt-1">Complete this form to apply for the Junior Junior Welfare League program.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Section title="Your Information">
              <Field label="Full name" required>
                <input type="text" required value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Email" required>
                <input type="email" required value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Password" required hint="At least 8 characters">
                <input type="password" required minLength={8} value={form.password} onChange={e => set('password', e.target.value)} className={inputCls} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Phone" required>
                  <input type="tel" required value={form.phone} onChange={e => set('phone', e.target.value)} className={inputCls} />
                </Field>
                <Field label="Grade" required>
                  <select required value={form.grade} onChange={e => set('grade', e.target.value)} className={inputCls}>
                    <option value="">Select…</option>
                    {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="School" required>
                <select required value={form.school_id} onChange={e => set('school_id', e.target.value)} className={inputCls}>
                  <option value="">Select a school…</option>
                  {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
            </Section>

            <Section title="Parent / Guardian (optional)">
              <Field label="Parent name">
                <input type="text" value={form.parent_name} onChange={e => set('parent_name', e.target.value)} className={inputCls} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Parent phone">
                  <input type="tel" value={form.parent_phone} onChange={e => set('parent_phone', e.target.value)} className={inputCls} />
                </Field>
                <Field label="Parent email">
                  <input type="email" value={form.parent_email} onChange={e => set('parent_email', e.target.value)} className={inputCls} />
                </Field>
              </div>
            </Section>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full bg-[#1B52C1] text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-[#1540A0] disabled:opacity-50">
              {loading ? 'Submitting…' : 'Submit Application'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="text-[#1B52C1] hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        {hint && <span className="ml-1 text-xs font-normal text-gray-400">({hint})</span>}
      </label>
      {children}
    </div>
  )
}
