'use client'

import { useState } from 'react'
import Image from 'next/image'

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B52C1] focus:border-transparent'

export default function BackpackSignupPage() {
  const [form, setForm] = useState({ name: '', email: '', mobile: '' })
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!agreed) { setError('Please confirm you can attend before submitting.'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/backpacks/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.ok) {
        setDone(true)
      } else {
        setError(data.error ?? 'Something went wrong. Please try again.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <Image src="/jwl-logo.png" alt="Junior Welfare League" width={80} height={80} className="object-contain mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 text-center">Backpack Stuffing Event</h1>
          <p className="text-sm text-[#1B52C1] font-medium mt-1">Junior Welfare League of Huntington</p>
        </div>

        {done ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center space-y-3">
            <div className="text-4xl mb-2">🎒</div>
            <h2 className="text-lg font-semibold text-gray-900">You're signed up!</h2>
            <p className="text-sm text-gray-600">
              Thank you! We received your signup and will send a confirmation email once your spot is secured.
            </p>
            <p className="text-sm text-gray-500 pt-2">
              Questions? Contact <a href="mailto:info@jwlhuntington.org" className="text-[#1B52C1] hover:underline">info@jwlhuntington.org</a> or call <a href="tel:6318890949" className="text-[#1B52C1] hover:underline">631-889-0949</a>.
            </p>
          </div>
        ) : (
          <>
            {/* Event details card */}
            <div className="bg-[#1B52C1] text-white rounded-xl p-5 mb-6 space-y-2">
              <p className="text-sm font-semibold uppercase tracking-wide opacity-75">Event Details</p>
              <div className="space-y-1.5 text-sm">
                <div className="flex gap-2"><span className="opacity-70 w-20 shrink-0">What</span><span className="font-medium">Stuffing backpacks with school supplies for local kids</span></div>
                <div className="flex gap-2"><span className="opacity-70 w-20 shrink-0">Date</span><span className="font-medium">Tuesday, August 26, 2025</span></div>
                <div className="flex gap-2"><span className="opacity-70 w-20 shrink-0">Time</span><span className="font-medium">8:00 AM – 11:00 AM</span></div>
                <div className="flex gap-2"><span className="opacity-70 w-20 shrink-0">Location</span><span className="font-medium">Huntington Village (sent upon confirmation)</span></div>
                <div className="flex gap-2"><span className="opacity-70 w-20 shrink-0">Credit</span><span className="font-medium">3 hours community service (certificate provided)</span></div>
              </div>
            </div>

            {/* Form */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-5">Sign up to volunteer</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full name <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    placeholder="First and last name"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-400">*</span></label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                    placeholder="your@email.com"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mobile number <span className="text-red-400">*</span></label>
                  <input
                    type="tel"
                    required
                    value={form.mobile}
                    onChange={e => set('mobile', e.target.value)}
                    placeholder="(631) 555-0123"
                    className={inputCls}
                  />
                </div>

                <label className="flex items-start gap-3 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={e => { setAgreed(e.target.checked); setError('') }}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#1B52C1] focus:ring-[#1B52C1]"
                  />
                  <span className="text-sm text-gray-700">
                    I confirm I am available on <strong>Tuesday, August 26, 2025 from 8:00 AM to 11:00 AM</strong> to volunteer in Huntington Village.
                  </span>
                </label>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#1B52C1] text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-[#1540A0] disabled:opacity-50 mt-2"
                >
                  {loading ? 'Submitting…' : 'Sign me up →'}
                </button>
              </form>
            </div>

            <p className="text-center text-xs text-gray-400 mt-5">
              Questions? <a href="mailto:info@jwlhuntington.org" className="text-[#1B52C1] hover:underline">info@jwlhuntington.org</a> · 631-889-0949
            </p>
          </>
        )}
      </div>
    </div>
  )
}
