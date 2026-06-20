'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

const nav = [
  {
    label: 'Core Programs',
    href: 'https://jwlhuntington.org/core-programs/',
    children: [
      { label: 'The Lift Fund', href: 'https://jwlhuntington.org/core-programs/the-lift-fund/' },
      { label: 'Junior JWL of Huntington', href: 'https://jwlhuntington.org/core-programs/junior-jwl-of-huntington/' },
      { label: 'Holiday Charities', href: 'https://jwlhuntington.org/core-programs/holiday-charities/' },
      { label: 'Charitable Children Fund', href: 'https://jwlhuntington.org/core-programs/charitable-children-fund/' },
      { label: 'Backpacks for Success', href: 'https://jwlhuntington.org/core-programs/backpacks-for-success/' },
      { label: 'Camp for Kids', href: 'https://jwlhuntington.org/core-programs/camp-for-kids/' },
    ],
  },
  {
    label: 'Events',
    href: 'https://jwlhuntington.org/events-activities/',
    children: [
      { label: 'Events & Activities', href: 'https://jwlhuntington.org/events-activities/' },
      { label: 'Calendar', href: 'https://jwlhuntington.org/events/' },
    ],
  },
  { label: 'Donate', href: 'https://jwlhuntington.org/donate/' },
  { label: 'Sponsors', href: 'https://jwlhuntington.org/sponsors/' },
  {
    label: 'Join',
    href: 'https://jwlhuntington.org/join/',
    children: [
      { label: 'Membership Options', href: 'https://jwlhuntington.org/join/' },
      { label: 'Junior JWL Youth Membership', href: 'https://jwlhuntington.org/join-the-junior-jwl/' },
    ],
  },
  { label: 'News', href: 'https://jwlhuntington.org/news/' },
  { label: 'Scholarships', href: 'https://jwlhuntington.org/scholarships/' },
]

export default function SiteNav() {
  const [open, setOpen] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="bg-[#1B52C1] text-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="https://jwlhuntington.org" className="flex items-center gap-3 shrink-0">
            <Image src="/jwl-logo.png" alt="JWL" width={40} height={40} className="object-contain brightness-0 invert" />
            <span className="font-semibold text-sm hidden sm:block leading-tight">
              Junior Welfare League<br />
              <span className="font-normal text-blue-200 text-xs">of Huntington</span>
            </span>
          </a>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {nav.map(item => (
              <div key={item.label} className="relative"
                onMouseEnter={() => item.children && setOpen(item.label)}
                onMouseLeave={() => setOpen(null)}>
                <a href={item.href}
                  className="flex items-center gap-1 px-3 py-2 text-sm text-blue-100 hover:text-white rounded transition-colors">
                  {item.label}
                  {item.children && <span className="text-xs opacity-60">▾</span>}
                </a>
                {item.children && open === item.label && (
                  <div className="absolute top-full left-0 bg-white rounded-lg shadow-lg py-1 min-w-48 z-50">
                    {item.children.map(child => (
                      <a key={child.href} href={child.href}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-[#1B52C1]">
                        {child.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Mobile hamburger */}
          <button onClick={() => setMobileOpen(o => !o)} className="lg:hidden p-2 text-blue-100 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden pb-4 space-y-1">
            {nav.map(item => (
              <div key={item.label}>
                <a href={item.href} className="block px-3 py-2 text-sm text-blue-100 hover:text-white font-medium">
                  {item.label}
                </a>
                {item.children && (
                  <div className="pl-4 space-y-1">
                    {item.children.map(child => (
                      <a key={child.href} href={child.href} className="block px-3 py-1.5 text-xs text-blue-200 hover:text-white">
                        {child.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </header>
  )
}
