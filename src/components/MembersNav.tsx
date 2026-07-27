'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

type Props = {
  memberName: string
  isGrantsReviewer: boolean
  isProgramsAdmin: boolean
  isJjwlAdmin: boolean
  isAdmin: boolean
  isSuperAdmin: boolean
}

export default function MembersNav({ memberName, isGrantsReviewer, isProgramsAdmin, isJjwlAdmin, isAdmin, isSuperAdmin }: Props) {
  const [open, setOpen] = useState(false)
  const isFullAdmin = isAdmin || isSuperAdmin

  const links = [
    { href: '/members/dashboard', label: 'Dashboard' },
    { href: '/members/holiday-charities', label: 'Holiday Charities' },
    { href: '/members/meetings', label: 'Meetings' },
    { href: '/members/directory', label: 'Directory' },
    { href: '/members/account', label: 'Account' },
    ...(isGrantsReviewer ? [{ href: '/grants/reviewer', label: 'Grants' }] : []),
    ...(isProgramsAdmin ? [{ href: '/admin', label: 'Programs Admin' }] : []),
    ...(isJjwlAdmin ? [{ href: '/admin/jjwl', label: 'JJWL Admin' }] : []),
    ...(isFullAdmin ? [{ href: '/admin', label: 'Admin' }] : []),
  ]

  // Deduplicate (isFullAdmin + isProgramsAdmin both add /admin)
  const seen = new Set<string>()
  const deduped = links.filter(l => {
    if (seen.has(l.href + l.label)) return false
    seen.add(l.href + l.label)
    return true
  })

  return (
    <nav className="bg-[#1B52C1]">
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/jwl-logo.png" alt="JWL" width={36} height={36} className="object-contain bg-white rounded-full p-0.5" />
          <span className="font-semibold text-white text-sm">JWL Huntington</span>
        </div>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-4 text-sm">
          {deduped.map(l => (
            <Link key={l.label} href={l.href} className="text-blue-100 hover:text-white whitespace-nowrap">{l.label}</Link>
          ))}
          <span className="text-blue-200 border-l border-blue-400 pl-4 whitespace-nowrap">{memberName}</span>
          <form action="/api/auth/logout" method="POST">
            <button className="text-blue-200 hover:text-white">Sign out</button>
          </form>
        </div>

        {/* Hamburger */}
        <button
          onClick={() => setOpen(o => !o)}
          className="md:hidden text-white p-1 rounded focus:outline-none"
          aria-label="Toggle menu"
        >
          {open ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-blue-500 px-4 pb-4 pt-2 flex flex-col gap-1">
          <p className="text-blue-300 text-xs pb-2">{memberName}</p>
          {deduped.map(l => (
            <Link
              key={l.label}
              href={l.href}
              onClick={() => setOpen(false)}
              className="text-blue-100 hover:text-white py-2 text-sm border-b border-blue-600 last:border-0"
            >
              {l.label}
            </Link>
          ))}
          <form action="/api/auth/logout" method="POST" className="pt-1">
            <button className="text-blue-200 hover:text-white text-sm">Sign out</button>
          </form>
        </div>
      )}
    </nav>
  )
}
