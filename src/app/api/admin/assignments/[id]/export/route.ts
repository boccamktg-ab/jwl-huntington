import { isSuperAdminEmail } from '@/lib/admin'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import ExcelJS from 'exceljs'
import { translateGiftRequests } from '@/lib/translate'

const COL_COUNT = 11

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
          id, first_name, age, gender, gift_requests, gift_requests_en, top_size, bottom_size, shoe_size,
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

  // Sort by school, then family number, then child name
  const children = (assignment.assignment_children as any[])
    .map(ac => ac.children)
    .sort((a, b) => {
      const schoolA = a?.families?.schools?.name ?? ''
      const schoolB = b?.families?.schools?.name ?? ''
      const fnA = parseInt(a?.families?.family_number ?? '0', 10)
      const fnB = parseInt(b?.families?.family_number ?? '0', 10)
      return schoolA.localeCompare(schoolB) || fnA - fnB || (a?.first_name ?? '').localeCompare(b?.first_name ?? '')
    })

  // Translate any children still missing an English gift request
  await Promise.all(children.map(async (child: any) => {
    if (!child.gift_requests_en && child.gift_requests) {
      try {
        const translated = await translateGiftRequests(child.gift_requests)
        child.gift_requests_en = translated
        await db.from('children').update({
          gift_requests_en: translated,
          translation_status: 'auto',
        }).eq('id', child.id)
      } catch {
        // non-fatal — leave blank rather than output Spanish
      }
    }
  }))

  // Group children by school, preserving sort order
  type SchoolGroup = {
    schoolName: string
    districtName: string
    sw: { name: string; email: string; phone: string } | null
    children: any[]
  }
  const schoolMap = new Map<string, SchoolGroup>()
  for (const child of children) {
    const fam = child.families as any
    const schoolName = fam?.schools?.name ?? '(No school)'
    if (!schoolMap.has(schoolName)) {
      const sw = fam?.social_workers
      schoolMap.set(schoolName, {
        schoolName,
        districtName: fam?.schools?.districts?.name ?? '',
        sw: sw ? { name: sw.name ?? '', email: sw.email ?? '', phone: sw.phone ?? '' } : null,
        children: [],
      })
    }
    schoolMap.get(schoolName)!.children.push(child)
  }
  const schoolGroups = Array.from(schoolMap.values())

  const fileName = `${member?.name?.replace(/\s+/g, '_') ?? 'assignment'}_assignment`

  const csvEscape = (v: string | number) => {
    const s = String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }

  const DATA_HEADERS = [
    'Family #', 'Family Size', 'First Name', 'Age', 'Gender',
    'School', 'District', 'Gift Requests', 'Top Size', 'Bottom Size', 'Shoe Size',
  ]

  if (format === 'csv') {
    const lines: string[] = [DATA_HEADERS.join(',')]
    for (const group of schoolGroups) {
      const sw = group.sw
      const swLine = sw
        ? `Social Worker: ${csvEscape(sw.name)},${csvEscape(sw.email)},${csvEscape(sw.phone)}`
        : 'Social Worker: —'
      lines.push(`--- ${csvEscape(group.schoolName)} (${csvEscape(group.districtName)}) --- ${swLine}`)
      for (const child of group.children) {
        const fam = child.families as any
        lines.push([
          fam?.family_number ?? '', fam?.num_children ?? '',
          child.first_name, child.age ?? '', child.gender ?? '',
          group.schoolName, group.districtName,
          csvEscape(child.gift_requests_en ?? ''),
          child.top_size ?? '', child.bottom_size ?? '', child.shoe_size ?? '',
        ].join(','))
      }
    }
    if (isAdmin) await db.from('assignments').update({ exported: true }).eq('id', id)
    return new NextResponse(lines.join('\n'), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${fileName}.csv"`,
      },
    })
  }

  // Excel — column definitions (no header row yet; we add per-school sections)
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Assignment')
  sheet.columns = [
    { key: 'family_number', width: 12 },
    { key: 'family_size',   width: 12 },
    { key: 'first_name',    width: 16 },
    { key: 'age',           width: 8  },
    { key: 'gender',        width: 12 },
    { key: 'school',        width: 30 },
    { key: 'district',      width: 20 },
    { key: 'gift_requests', width: 42 },
    { key: 'top_size',      width: 12 },
    { key: 'bottom_size',   width: 12 },
    { key: 'shoe_size',     width: 12 },
  ]

  for (const group of schoolGroups) {
    const sw = group.sw

    // SW info banner row
    const swRow = sheet.addRow([
      `${group.schoolName}  ·  ${group.districtName}`,
      '', '', '', '', '', '', '',
      sw ? sw.name : '—',
      sw ? sw.email : '',
      sw ? sw.phone : '',
    ])
    sheet.mergeCells(swRow.number, 1, swRow.number, 8)
    swRow.getCell(1).font = { bold: true, color: { argb: 'FF1B52C1' }, size: 11 }
    swRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } }
    swRow.getCell(1).alignment = { vertical: 'middle' }
    swRow.getCell(9).font = { bold: true }
    swRow.getCell(9).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } }
    swRow.getCell(10).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } }
    swRow.getCell(11).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } }
    swRow.height = 20

    // Column headers for this section
    const colHeaderRow = sheet.addRow(DATA_HEADERS)
    colHeaderRow.font = { bold: true }
    colHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }
    colHeaderRow.border = {
      bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    }

    // Data rows
    for (const child of group.children) {
      const fam = child.families as any
      const dataRow = sheet.addRow([
        fam?.family_number ?? '',
        fam?.num_children ?? '',
        child.first_name,
        child.age ?? '',
        child.gender ?? '',
        group.schoolName,
        group.districtName,
        child.gift_requests_en ?? '',
        child.top_size ?? '',
        child.bottom_size ?? '',
        child.shoe_size ?? '',
      ])
      dataRow.getCell(8).alignment = { wrapText: true }
    }

    // Blank spacer row between schools
    sheet.addRow([])
  }

  if (isAdmin) await db.from('assignments').update({ exported: true }).eq('id', id)

  const buffer = await workbook.xlsx.writeBuffer()
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fileName}.xlsx"`,
    },
  })
}
