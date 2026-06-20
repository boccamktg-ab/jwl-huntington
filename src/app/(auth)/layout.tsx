import Image from 'next/image'
import SiteNav from './SiteNav'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <SiteNav />
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="mb-8 flex flex-col items-center gap-3">
            <Image src="/jwl-logo.png" alt="Junior Welfare League" width={100} height={100} className="object-contain" />
            <p className="text-sm font-medium text-gray-500 tracking-wide uppercase">Holiday Charities</p>
          </div>
          {children}
        </div>
      </div>
      <footer className="text-center py-4 text-xs text-gray-400 space-x-3">
        <a href="https://www.facebook.com/juniorwelfareleague" target="_blank" rel="noopener noreferrer" className="hover:text-[#1B52C1]">Facebook</a>
        <span>·</span>
        <a href="https://instagram.com/jwlofhuntington" target="_blank" rel="noopener noreferrer" className="hover:text-[#1B52C1]">Instagram</a>
        <span>·</span>
        <a href="https://jwlhuntington.org/privacy/" target="_blank" rel="noopener noreferrer" className="hover:text-[#1B52C1]">Privacy Policy</a>
      </footer>
    </div>
  )
}
