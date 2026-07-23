'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function NoticeBanner() {
  const notice = useSearchParams().get('notice')
  if (notice === 'pending') return (
    <div className="mb-5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
      <p className="font-medium mb-1">Whoops!</p>
      <p>Have you recently registered? Your account may be pending approval. Reach out to{' '}
        <a href="mailto:info@jwlhuntington.org" className="underline hover:text-amber-900">info@jwlhuntington.org</a>{' '}
        if this is unexpected.
      </p>
    </div>
  )
  if (notice === 'disabled') return (
    <div className="mb-5 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">
      <p className="font-medium mb-1">Account disabled</p>
      <p>Your account has been disabled. Please contact{' '}
        <a href="mailto:info@jwlhuntington.org" className="underline hover:text-red-900">info@jwlhuntington.org</a>{' '}
        for assistance.
      </p>
    </div>
  )
  return null
}

function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
    if (data.user?.email === adminEmail) {
      router.push('/admin')
      return
    }

    const supabase2 = createClient()
    const { data: member } = await supabase2
      .from('jwl_members')
      .select('id')
      .eq('auth_id', data.user.id)
      .maybeSingle()

    if (member) {
      router.push('/members/dashboard')
      return
    }

    // Check for JJWL member account
    const { data: jjwlMember } = await supabase2
      .from('jjwl_members')
      .select('id, status')
      .eq('auth_id', data.user.id)
      .maybeSingle()

    if (jjwlMember) {
      router.push('/jjwl/dashboard')
    } else {
      router.push('/portal')
    }
  }

  return (
    <>
      <h2 className="text-lg font-medium text-gray-800 mb-6">Sign in</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B52C1]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B52C1]"
          />
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">
            <p className="font-medium mb-1">Unable to sign in</p>
            <p>That email and password combination wasn&apos;t found. Double-check your credentials or{' '}
              <Link href="/register" className="underline hover:text-red-900">create an account</Link>.
            </p>
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#1B52C1] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#1540A0] disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="mt-4 text-sm text-center text-gray-500">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-[#1B52C1] hover:underline">Register</Link>
      </p>
    </>
  )
}

export default function LoginPage() {
  return (
    <>
      <Suspense>
        <NoticeBanner />
      </Suspense>
      <LoginForm />
    </>
  )
}
