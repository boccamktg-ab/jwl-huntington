import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdminFromRequest } from '@/lib/admin'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET(request: NextRequest) {
  if (!await requireAdminFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { data } = await db()
    .from('jwl_meetings')
    .select('*, jwl_meeting_rsvps(id, response, member_id)')
    .order('meeting_date', { ascending: false })

  return NextResponse.json({ meetings: data ?? [] })
}

export async function POST(request: NextRequest) {
  if (!await requireAdminFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { title, meeting_date, meeting_time, location, agenda_notes } = await request.json()
  if (!title || !meeting_date || !meeting_time || !location) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data, error } = await db()
    .from('jwl_meetings')
    .insert({ title, meeting_date, meeting_time, location, agenda_notes: agenda_notes || null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ meeting: data })
}

export async function PATCH(request: NextRequest) {
  if (!await requireAdminFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id, title, meeting_date, meeting_time, location, agenda_notes, post_meeting_notes, status } = await request.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const update: Record<string, unknown> = {}
  if (title !== undefined) update.title = title
  if (meeting_date !== undefined) update.meeting_date = meeting_date
  if (meeting_time !== undefined) update.meeting_time = meeting_time
  if (location !== undefined) update.location = location
  if (agenda_notes !== undefined) update.agenda_notes = agenda_notes || null
  if (post_meeting_notes !== undefined) update.post_meeting_notes = post_meeting_notes || null
  if (status !== undefined) update.status = status

  const { error } = await db().from('jwl_meetings').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  if (!await requireAdminFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await db().from('jwl_meetings').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
