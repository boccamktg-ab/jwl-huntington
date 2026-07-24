'use client'

import { useState } from 'react'

export default function ExportButtons({ assignmentId, memberName }: { assignmentId: string; memberName: string }) {
  const [loading, setLoading] = useState<'xlsx' | 'csv' | null>(null)

  async function handleExport(format: 'xlsx' | 'csv') {
    setLoading(format)
    const res = await fetch(`/api/admin/assignments/${assignmentId}/export?format=${format}`)
    if (!res.ok) { alert('Export failed.'); setLoading(null); return }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${memberName.replace(/\s+/g, '_')}_assignment.${format}`
    a.click()
    URL.revokeObjectURL(url)
    setLoading(null)
  }

  return (
    <div className="flex gap-2">
      <button onClick={() => handleExport('xlsx')} disabled={!!loading}
        className="text-sm px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
        {loading === 'xlsx' ? 'Generating…' : '↓ Excel'}
      </button>
      <button onClick={() => handleExport('csv')} disabled={!!loading}
        className="text-sm px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50">
        {loading === 'csv' ? 'Generating…' : '↓ CSV'}
      </button>
    </div>
  )
}
