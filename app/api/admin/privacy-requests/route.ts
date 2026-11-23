import { requireAdmin } from '@/lib/admin/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

function privateJson(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } })
}

export async function GET() {
  const { isAdmin } = await requireAdmin()
  if (!isAdmin) return privateJson({ error: '権限がありません' }, 403)
  const service = createServiceClient()
  const { data, error } = await service.from('privacy_requests')
    .select('id, user_id, request_type, details, status, response, created_at, responded_at')
    .in('status', ['received', 'in_progress'])
    .order('created_at', { ascending: true }).limit(200)
  if (error) return privateJson({ error: '請求を取得できませんでした' }, 500)
  return privateJson({ requests: data ?? [] })
}

export async function PATCH(req: NextRequest) {
  const { isAdmin } = await requireAdmin()
  if (!isAdmin) return privateJson({ error: '権限がありません' }, 403)
  let body: unknown
  try { body = await req.json() } catch { return privateJson({ error: 'JSON形式が正しくありません' }, 400) }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return privateJson({ error: '更新内容が正しくありません' }, 400)
  }
  const { id, status, response } = body as Record<string, unknown>
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(id) ||
      !['in_progress', 'completed', 'declined'].includes(status as string) ||
      (response !== undefined && (typeof response !== 'string' || response.length > 4000)) ||
      (status !== 'in_progress' && (typeof response !== 'string' || !response.trim()))) {
    return privateJson({ error: '更新内容が正しくありません' }, 400)
  }
  const service = createServiceClient()
  const { data: current, error: readError } = await service.from('privacy_requests')
    .select('status').eq('id', id).maybeSingle()
  if (readError) return privateJson({ error: '請求を確認できませんでした' }, 500)
  if (!current) return privateJson({ error: '請求が見つかりません' }, 404)
  if (current.status === 'completed' || current.status === 'declined') {
    return privateJson({ error: '回答済みの請求は更新できません' }, 409)
  }
  const { data, error } = await service.from('privacy_requests').update({
    status,
    response: status === 'in_progress' ? null : (response as string).trim(),
    responded_at: status === 'in_progress' ? null : new Date().toISOString(),
  }).eq('id', id).in('status', ['received', 'in_progress'])
    .select('id, status, response, responded_at').maybeSingle()
  if (error) return privateJson({ error: '更新できませんでした' }, 500)
  if (!data) return privateJson({ error: '請求がすでに更新されています' }, 409)
  return privateJson({ request: data })
}
