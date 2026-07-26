'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type District = { id: string; name: string }
type School = { id: string; district_id: string; name: string }

const ORG_TYPES = [
  'Charitable Organization',
  'Medical / Hospital',
  'Government Agency',
  'Social Services',
  'Other',
]

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B52C1]'

export default function RegisterPage() {
  const [role, setRole] = useState<'social_worker' | 'jwl_member' | 'jjwl'>('social_worker')
  const [swType, setSwType] = useState<'school' | 'community'>('school')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // School SW fields
  const [selectedDistrict, setSelectedDistrict] = useState('')
  const [selectedSchools, setSelectedSchools] = useState<string[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [schools, setSchools] = useState<School[]>([])
  // Community SW fields
  const [organization, setOrganization] = useState('')
  const [orgType, setOrgType] = useState('')
  // JWL Member fields
  const [phone, setPhone] = useState('')
  const [joinYear, setJoinYear] = useState('')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('districts').select('*').order('name'),
      supabase.from('schools').select('*').order('name'),
    ]).then(([{ data: d }, { data: s }]) => {
      if (d) setDistricts(d)
      if (s) setSchools(s)
    })
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
    if (role === 'social_worker' && swType === 'school' && selectedSchools.length === 0) {
      setError('Please select at least one school.')
      return
    }
    if (role === 'social_worker' && swType === 'community' && !organization.trim()) {
      setError('Please enter your organization name.')
      return
    }
    setLoading(true)
    setError('')

    const endpoint = role === 'social_worker' ? '/api/auth/register' : '/api/members/register'
    const body = role === 'social_worker'
      ? {
          name, email, password,
          swType,
          schoolIds: swType === 'school' ? selectedSchools : [],
          organization: swType === 'community' ? organization.trim() : undefined,
          orgType: swType === 'community' ? orgType : undefined,
        }
      : { name, email, password, phone: phone || undefined, joinYear: joinYear ? Number(joinYear) : undefined }

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
        {(['social_worker', 'jwl_member', 'jjwl'] as const).map(r => (
          <button key={r} type="button" onClick={() => setRole(r)}
            className={`flex-1 text-sm py-1.5 rounded-md transition-colors ${role === r ? 'bg-[#1B52C1] text-white font-medium' : 'text-gray-600 hover:text-gray-900'}`}>
            {r === 'social_worker' ? 'Social Worker' : r === 'jwl_member' ? 'JWL Member' : 'JJWL'}
          </button>
        ))}
      </div>

      {/* JJWL redirect */}
      {role === 'jjwl' && (
        <div className="text-center space-y-4 py-2">
          <p className="text-sm text-gray-600">
            JJWL membership requires additional information including grade, school, and parent contact details.
          </p>
          <Link href="/jjwl/register"
            className="inline-block w-full bg-[#1B52C1] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#1540A0] text-center">
            Go to JJWL Registration →
          </Link>
          <p className="text-xs text-gray-400">You&apos;ll be taken to the full JJWL application form.</p>
        </div>
      )}

      {/* Main form */}
      {role !== 'jjwl' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} className={inputCls} />
          </div>

          {role === 'social_worker' && (
            <>
              {/* SW type sub-toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Affiliation type</label>
                <div className="flex rounded-lg border border-gray-200 p-1">
                  <button type="button" onClick={() => setSwType('school')}
                    className={`flex-1 text-sm py-1.5 rounded-md transition-colors ${swType === 'school' ? 'bg-[#1B52C1] text-white font-medium' : 'text-gray-600 hover:text-gray-900'}`}>
                    School-affiliated
                  </button>
                  <button type="button" onClick={() => setSwType('community')}
                    className={`flex-1 text-sm py-1.5 rounded-md transition-colors ${swType === 'community' ? 'bg-[#1B52C1] text-white font-medium' : 'text-gray-600 hover:text-gray-900'}`}>
                    Community / Organization
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {swType === 'school'
                    ? 'Select this if you represent one or more schools in a district.'
                    : 'Select this if you represent a charity, medical organization, government agency, or other community organization.'}
                </p>
              </div>

              {swType === 'school' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                    <select required value={selectedDistrict} onChange={e => handleDistrictChange(e.target.value)} className={inputCls}>
                      <option value="">Select a district…</option>
                      {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  {selectedDistrict && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">School(s) you cover</label>
                      <div className="space-y-1 max-h-48 overflow-y-auto border border-gray-100 rounded-lg p-2">
                        {districtSchools.map(school => (
                          <label key={school.id} className="flex items-center gap-2 cursor-pointer py-0.5">
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

              {swType === 'community' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Organization name <span className="text-red-400">*</span></label>
                    <input type="text" required value={organization} onChange={e => setOrganization(e.target.value)}
                      placeholder="e.g. North Shore University Hospital" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Organization type</label>
                    <select value={orgType} onChange={e => setOrgType(e.target.value)} className={inputCls}>
                      <option value="">Select a type…</option>
                      {ORG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </>
              )}
            </>
          )}

          {role === 'jwl_member' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone number</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 555-5555" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year you joined JWL</label>
                <select value={joinYear} onChange={e => setJoinYear(e.target.value)} className={inputCls}>
                  <option value="">Select year…</option>
                  {Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">New members who join and pay in {new Date().getFullYear()} are paid through end of {new Date().getFullYear() + 1}.</p>
              </div>
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
