'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

type Props = {
  isMemberAdmin: boolean
  isProgramsAdmin: boolean
  isJjwlAdmin: boolean
  isGrantsReviewer: boolean
}

export default function AdminNav({ isMemberAdmin, isProgramsAdmin, isJjwlAdmin, isGrantsReviewer }: Props) {
  const [open, setOpen] = useState(false)

  const links = [
    ...(isProgramsAdmin ? [
      { href: '/admin', label: 'Dashboard' },
      { href: '/admin/families', label: 'Families' },
      { href: '/admin/children', label: 'Children' },
      { href: '/admin/assignments', label: 'Assignments' },
      { href: '/admin/social-workers', label: 'Social Workers' },
      { href: '/admin/broadcast', label: 'Broadcast' },
    ] : []),
    ...(isMemberAdmin ? [
      { href: '/admin/meetings', label: 'Meetings' },
      { href: '/admin/members', label: 'Members' },
      { href: '/admin/member-positions', label: 'Positions' },
      { href: '/admin/setup', label: 'Setup' },
    ] : []),
    ...(isGrantsReviewer ? [{ href: '/grants/reviewer', label: 'Grants' }] : []),
    ...(isJjwlAdmin ? [{ href: '/admin/jjwl', label: 'JJWL' }] : []),
    { href: '/members/dashboard', label: 'My Dashboard' },
  ]

  return (
    <nav className="bg-[#1B52C1]">
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/jwl-logo.png" alt="JWL" width={36} height={36} className="object-contain bg-white rounded-full p-0.5" />
          <span className="font-semibold text-white text-sm">JWL — Admin</span>
        </div>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-5 text-sm">
          {links.map(l => (
            <Link key={l.href} href={l.href} className="text-blue-100 hover:text-white whitespace-nowrap">{l.label}</Link>
          ))}
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
          {links.map(l => (
            <Link
              key={l.href}
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
