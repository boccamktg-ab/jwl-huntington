import { isSuperAdminEmail } from '@/lib/admin'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import ExcelJS from 'exceljs'

function adminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function getAuthorizedUser(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await getAuthorizedUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = adminClient()

  const { data: assignment } = await db
    .from('assignments')
    .select(`
      id,
      jwl_members ( id, name, email, auth_id ),
      assignment_children (
        children (
          first_name, age, gender, gift_requests, top_size, bottom_size, shoe_size,
          families (
            family_number, num_children,
            social_workers ( name, email, phone ),
            schools ( name, districts ( name ) )
          )
        )
      )
    `)
    .eq('id', id)
    .single()

  if (!assignment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const member = assignment.jwl_members as any
  const isAdmin = isSuperAdminEmail(user.email)
  const isMember = member?.auth_id === user.id

  if (!isAdmin && !isMember) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const format = request.nextUrl.searchParams.get('format') ?? 'xlsx'

  // Sort by school, then family number within each school, then child name
  const children = (assignment.assignment_children as any[])
    .map(ac => ac.children)
    .sort((a, b) => {
      const schoolA = a?.families?.schools?.name ?? ''
      const schoolB = b?.families?.schools?.name ?? ''
      const fnA = parseInt(a?.families?.family_number ?? '0', 10)
      const fnB = parseInt(b?.families?.family_number ?? '0', 10)
      return schoolA.localeCompare(schoolB) || fnA - fnB || (a?.first_name ?? '').localeCompare(b?.first_name ?? '')
    })

  const rows = children.map(child => {
    const fam = child.families as any
    const sw = fam?.social_workers
    return {
      family_number:  fam?.family_number ?? '',
      family_size:    fam?.num_children ?? '',
      first_name:     child.first_name,
      age:            child.age ?? '',
      gender:         child.gender ?? '',
      school:         fam?.schools?.name ?? '',
      district:       fam?.schools?.districts?.name ?? '',
      gift_requests:  child.gift_requests ?? '',
      top_size:       child.top_size ?? '',
      bottom_size:    child.bottom_size ?? '',
      shoe_size:      child.shoe_size ?? '',
      sw_name:        sw?.name ?? '',
      sw_email:       sw?.email ?? '',
      sw_phone:       sw?.phone ?? '',
    }
  })

  const fileName = `${member?.name?.replace(/\s+/g, '_') ?? 'assignment'}_assignment`

  const csvEscape = (v: string | number) => {
    const s = String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }

  if (format === 'csv') {
    const headers = [
      'Family #', 'Family Size', 'First Name', 'Age', 'Gender',
      'School', 'District', 'Gift Requests', 'Top Size', 'Bottom Size', 'Shoe Size',
      'Social Worker', 'SW Email', 'SW Phone',
    ]
    const lines = [
      headers.join(','),
      ...rows.map(r => [
        r.family_number, r.family_size, r.first_name, r.age, r.gender,
        r.school, r.district, csvEscape(r.gift_requests), r.top_size, r.bottom_size, r.shoe_size,
        r.sw_name, r.sw_email, r.sw_phone,
      ].join(',')),
    ]
    if (isAdmin) await db.from('assignments').update({ exported: true }).eq('id', id)
    return new NextResponse(lines.join('\n'), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${fileName}.csv"`,
      },
    })
  }

  // Excel
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Assignment')
  sheet.columns = [
    { header: 'Family #',      key: 'family_number', width: 12 },
    { header: 'Family Size',   key: 'family_size',   width: 12 },
    { header: 'First Name',    key: 'first_name',    width: 16 },
    { header: 'Age',           key: 'age',           width: 8  },
    { header: 'Gender',        key: 'gender',        width: 12 },
    { header: 'School',        key: 'school',        width: 30 },
    { header: 'District',      key: 'district',      width: 30 },
    { header: 'Gift Requests', key: 'gift_requests', width: 40 },
    { header: 'Top Size',      key: 'top_size',      width: 12 },
    { header: 'Bottom Size',   key: 'bottom_size',   width: 12 },
    { header: 'Shoe Size',     key: 'shoe_size',     width: 12 },
    { header: 'Social Worker', key: 'sw_name',       width: 20 },
    { header: 'SW Email',      key: 'sw_email',      width: 28 },
    { header: 'SW Phone',      key: 'sw_phone',      width: 16 },
  ]
  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } }
  rows.forEach(r => sheet.addRow(r))

  if (isAdmin) await db.from('assignments').update({ exported: true }).eq('id', id)

  const buffer = await workbook.xlsx.writeBuffer()
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fileName}.xlsx"`,
    },
  })
}
