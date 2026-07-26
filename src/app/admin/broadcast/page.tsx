'use client'

import { useState, useEffect } from 'react'

type LogEntry = {
  id: string
  sent_by: string
  message_type: string
  subject: string
  body_preview: string | null
  recipient_count: number
  sent_at: string
}

export default function BroadcastPage() {
  const [messageType, setMessageType] = useState<'season_open' | 'deadline_reminder'>('season_open')
  const [deadline, setDeadline] = useState('')
  const [filter, setFilter] = useState<'all' | 'no_submissions'>('all')
const [confirming, setConfirming] = useState(false)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number } | null>(null)
  const [error, setError] = useState('')
  const [logs, setLogs] = useState<LogEntry[]>([])

  useEffect(() => {
    fetch('/api/admin/broadcast').then(r => r.json()).then(d => {
      if (d.logs) setLogs(d.logs)
    })
  }, [result])

  async function handleSend() {
    setSending(true)
    setError('')
    const res = await fetch('/api/admin/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message_type: messageType, deadline: deadline || undefined, filter }),
    })
    const json = await res.json()
    setSending(false)
    setConfirming(false)
    if (!res.ok) {
      setError(json.error ?? 'Send failed.')
    } else {
      setResult({ sent: json.sent })
    }
  }

  const messageLabels: Record<string, string> = {
    season_open: 'Season Open announcement',
    deadline_reminder: 'Deadline reminder',
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Broadcast Emails</h1>
        <p className="text-sm text-gray-500 mt-1">Send a message to all approved social workers.</p>
      </div>

      {result ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center space-y-2">
          <p className="text-green-800 font-semibold text-lg">Sent to {result.sent} social worker{result.sent !== 1 ? 's' : ''}</p>
          <button onClick={() => setResult(null)} className="text-sm text-green-700 underline">Send another</button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Message type</label>
            <div className="flex gap-3">
              {(['season_open', 'deadline_reminder'] as const).map(t => (
                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={messageType === t}
                    onChange={() => setMessageType(t)}
                    className="text-[#1B52C1]"
                  />
                  <span className="text-sm text-gray-700">{messageLabels[t]}</span>
                </label>
              ))}
            </div>
          </div>

          {messageType === 'deadline_reminder' && (
            <>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Deadline date <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. November 15, 2026"
                  value={deadline}
                  onChange={e => setDeadline(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B52C1]"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Recipients</label>
                <div className="flex gap-3">
                  {(['all', 'no_submissions'] as const).map(f => (
                    <label key={f} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={filter === f}
                        onChange={() => setFilter(f)}
                        className="text-[#1B52C1]"
                      />
                      <span className="text-sm text-gray-700">
                        {f === 'all' ? 'All active social workers' : 'Only those with no submissions yet'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              disabled={messageType === 'deadline_reminder' && !deadline}
              className="bg-[#1B52C1] text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-[#1540A0] disabled:opacity-40"
            >
              Send email
            </button>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-amber-800">
                You&apos;re about to send a <strong>{messageLabels[messageType]}</strong> email
                {messageType === 'deadline_reminder' && filter === 'no_submissions'
                  ? ' to social workers with no submissions'
                  : ' to all active social workers'}.
                This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="bg-amber-700 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-amber-800 disabled:opacity-50"
                >
                  {sending ? 'Sending…' : 'Yes, send now'}
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  className="border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-600 hover:border-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {logs.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Send History</h2>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Type</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Sent by</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium">Recipients</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map(log => (
                  <tr key={log.id}>
                    <td className="px-4 py-3 text-gray-700">{messageLabels[log.message_type] ?? log.message_type}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{log.sent_by}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{log.recipient_count}</td>
                    <td className="px-4 py-3 text-right text-gray-400 text-xs">
                      {new Date(log.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
