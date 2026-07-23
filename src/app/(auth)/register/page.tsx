'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type District = { id: string; name: string }
type School = { id: string; district_id: string; name: string }

export default function RegisterPage() {
  const router = useRouter()
  const [role, setRole] = useState<'social_worker' | 'jwl_member' | 'jjwl'>('social_worker')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedDistrict, setSelectedDistrict] = useState('')
  const [selectedSchools, setSelectedSchools] = useState<string[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [schools, setSchools] = useState<School[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()
      const [{ data: d }, { data: s }] = await Promise.all([
        supabase.from('districts').select('*').order('name'),
        supabase.from('schools').select('*').order('name'),
      ])
      if (d) setDistricts(d)
      if (s) setSchools(s)
    }
    loadData()
  }, [])

  function handleDistrictChange(id: string) {
    setSelectedDistrict(id)
    setSelectedSchools([])
  }

  function toggleSchool(id: string) {
    setSelectedSchools(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (role === 'social_worker' && selectedSchools.length === 0) {
      setError('Please select at least one school.')
      return
    }
    setLoading(true)
    setError('')

    const endpoint = role === 'social_worker' ? '/api/auth/register' : '/api/members/register'
    const body = role === 'social_worker'
      ? { name, email, password, schoolIds: selectedSchools }
      : { name, email, password }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()

    if (!res.ok) {
      setError(json.error || 'Registration failed.')
      setLoading(false)
      return
    }

    setDone(true)
  }

  if (done) {
    return (
      <div className="text-center space-y-3">
        <h2 className="text-lg font-medium text-gray-800">Registration submitted</h2>
        <p className="text-sm text-gray-600">
          Your account is pending admin approval. You&apos;ll be able to log in once approved.
        </p>
        <Link href="/login" className="text-[#1B52C1] text-sm hover:underline">Back to sign in</Link>
      </div>
    )
  }

  const districtSchools = schools.filter(s => s.district_id === selectedDistrict)

  return (
    <>
      <h2 className="text-lg font-medium text-gray-800 mb-4">Create account</h2>

      {/* Role toggle */}
      <div className="flex rounded-lg border border-gray-200 p-1 mb-5">
        <button
          type="button"
          onClick={() => setRole('social_worker')}
          className={`flex-1 text-sm py-1.5 rounded-md transition-colors ${role === 'social_worker' ? 'bg-[#1B52C1] text-white font-medium' : 'text-gray-600 hover:text-gray-900'}`}
        >
          Social Worker
        </button>
        <button
          type="button"
          onClick={() => setRole('jwl_member')}
          className={`flex-1 text-sm py-1.5 rounded-md transition-colors ${role === 'jwl_member' ? 'bg-[#1B52C1] text-white font-medium' : 'text-gray-600 hover:text-gray-900'}`}
        >
          JWL Member
        </button>
        <button
          type="button"
          onClick={() => setRole('jjwl')}
          className={`flex-1 text-sm py-1.5 rounded-md transition-colors ${role === 'jjwl' ? 'bg-[#1B52C1] text-white font-medium' : 'text-gray-600 hover:text-gray-900'}`}
        >
          JJWL
        </button>
      </div>

      {/* JJWL redirect panel */}
      {role === 'jjwl' && (
        <div className="text-center space-y-4 py-2">
          <p className="text-sm text-gray-600">
            JJWL membership requires additional information including grade, school, and parent contact details.
          </p>
          <Link
            href="/jjwl/register"
            className="inline-block w-full bg-[#1B52C1] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#1540A0] text-center"
          >
            Go to JJWL Registration →
          </Link>
          <p className="text-xs text-gray-400">You&apos;ll be taken to the full JJWL application form.</p>
        </div>
      )}

      {/* Social worker / JWL member form */}
      {role !== 'jjwl' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B52C1]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B52C1]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B52C1]" />
          </div>

          {role === 'social_worker' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                <select required value={selectedDistrict} onChange={e => handleDistrictChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B52C1]">
                  <option value="">Select a district…</option>
                  {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              {selectedDistrict && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">School(s) you cover</label>
                  <div className="space-y-1">
                    {districtSchools.map(school => (
                      <label key={school.id} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={selectedSchools.includes(school.id)}
                          onChange={() => toggleSchool(school.id)}
                          className="rounded border-gray-300 text-[#1B52C1]" />
                        <span className="text-sm text-gray-700">{school.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-[#1B52C1] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#1540A0] disabled:opacity-50">
            {loading ? 'Submitting…' : 'Register'}
          </button>
        </form>
      )}

      <p className="mt-4 text-sm text-center text-gray-500">
        Already have an account?{' '}
        <Link href="/login" className="text-[#1B52C1] hover:underline">Sign in</Link>
      </p>
    </>
  )
}
