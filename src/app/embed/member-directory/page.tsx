import { createClient } from '@supabase/supabase-js'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function MemberDirectoryEmbed() {
  const { data: members } = await db()
    .from('jwl_members')
    .select('id, name, avatar_url, position_id, position_detail, member_positions ( id, label, sort_order )')
    .eq('status', 'approved')
    .order('name')

  // Sort: by position sort_order first, then alpha by name; no-position members last
  const sorted = [...(members ?? [])].sort((a, b) => {
    const aOrder = (a as any).member_positions?.sort_order ?? 9999
    const bOrder = (b as any).member_positions?.sort_order ?? 9999
    if (aOrder !== bOrder) return aOrder - bOrder
    return a.name.localeCompare(b.name)
  })

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>JWL Member Directory</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: transparent;
            padding: 16px 8px;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: 24px 16px;
            justify-items: center;
          }
          @media (min-width: 600px) {
            .grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
          }
          .card {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 10px;
            width: 100%;
          }
          .avatar {
            width: 110px;
            height: 110px;
            border-radius: 50%;
            overflow: hidden;
            background: #e5e7eb;
            border: 3px solid #fff;
            box-shadow: 0 2px 8px rgba(0,0,0,0.12);
            flex-shrink: 0;
          }
          .avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .avatar-initials {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            font-weight: 600;
            color: #1B52C1;
            background: #dbeafe;
          }
          .name {
            font-size: 14px;
            font-weight: 600;
            color: #111827;
            line-height: 1.3;
          }
          .title {
            font-size: 12px;
            color: #6b7280;
            line-height: 1.4;
          }
          .title-detail {
            font-size: 11px;
            color: #9ca3af;
          }
        `}</style>
      </head>
      <body>
        <div className="grid">
          {sorted.map((m: any) => (
            <div key={m.id} className="card">
              <div className="avatar">
                {m.avatar_url ? (
                  <img src={m.avatar_url} alt={m.name} />
                ) : (
                  <div className="avatar-initials">
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <div className="name">{m.name}</div>
                {m.member_positions && (
                  <div className="title">
                    {m.member_positions.label}
                    {m.position_detail && (
                      <div className="title-detail">{m.position_detail}</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <script dangerouslySetInnerHTML={{ __html: `
          function sendHeight() {
            window.parent.postMessage({ type: 'jwl-embed-height', height: document.body.scrollHeight }, '*');
          }
          window.addEventListener('load', sendHeight);
          new ResizeObserver(sendHeight).observe(document.body);
        `}} />
      </body>
    </html>
  )
}
