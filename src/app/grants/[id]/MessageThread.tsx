'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Message = {
  id: string
  body: string
  created_at: string
  author_id: string
}

type Props = {
  applicationId: string
  messages: Message[]
  currentUserId: string
  currentUserName: string
  canMessage: boolean
}

export default function MessageThread({ applicationId, messages, currentUserId, currentUserName, canMessage }: Props) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  async function send() {
    if (!body.trim()) return
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/grants/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_id: applicationId, body: body.trim() }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? 'Failed to send message.')
      }
      setBody('')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Messages</h2>

      {messages.length === 0 && (
        <p className="text-sm text-gray-400">No messages yet.</p>
      )}

      <div className="space-y-3">
        {messages.map(msg => {
          const isMe = msg.author_id === currentUserId
          return (
            <div key={msg.id} className={`flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
                isMe
                  ? 'bg-[#1B52C1] text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}>
                {msg.body}
              </div>
              <span className="text-xs text-gray-400">
                {isMe ? 'You' : 'JWL'} · {new Date(msg.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </span>
            </div>
          )
        })}
      </div>

      {canMessage && (
        <div className="space-y-2 pt-2 border-t border-gray-100">
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={3}
            placeholder="Write a message to the JWL reviewer…"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            onClick={send}
            disabled={sending || !body.trim()}
            className="bg-[#1B52C1] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#1540A0] disabled:opacity-50"
          >
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      )}
    </div>
  )
}
