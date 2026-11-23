import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const REQUEST_TYPES = [
  'access', 'portability', 'erasure', 'rectification', 'restriction', 'objection',
] as const

function privateJson(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return privateJson({ error: '認証が必要です' }, 401)

  const { data, error } = await supabase.from('privacy_requests')
    .select('id, request_type, details, status, response, created_at, responded_at')
    .eq('user_id', user.id).order('created_at', { ascending: false }).limit(100)
  if (error) return privateJson({ error: '請求を取得できませんでした' }, 500)
  return privateJson({ requests: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return privateJson({ error: '認証が必要です' }, 401)

  let body: unknown
  try { body = await req.json() } catch { return privateJson({ error: 'JSON形式が正しくありません' }, 400) }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return privateJson({ error: '請求内容が正しくありません' }, 400)
  }
  const { request_type, details } = body as Record<string, unknown>
  if (!REQUEST_TYPES.includes(request_type as typeof REQUEST_TYPES[number]) ||
      (details !== undefined && (typeof details !== 'string' || details.length > 2000))) {
    return privateJson({ error: '請求の種類または詳細が正しくありません' }, 400)
  }

  const { data: existing, error: lookupError } = await supabase.from('privacy_requests')
    .select('id').eq('user_id', user.id).eq('request_type', request_type as string)
    .in('status', ['received', 'in_progress']).limit(1)
  if (lookupError) return privateJson({ error: '請求を確認できませんでした' }, 500)
  if (existing?.length) return privateJson({ error: '同じ種類の請求をすでに受け付けています' }, 409)

  const { data, error } = await supabase.from('privacy_requests')
    .insert({ user_id: user.id, request_type, details: (details as string | undefined)?.trim() ?? '' })
    .select('id, request_type, details, status, created_at').single()
  if (error?.code === '23505') return privateJson({ error: '同じ種類の請求をすでに受け付けています' }, 409)
  if (error) return privateJson({ error: '請求を保存できませんでした' }, 500)
  return privateJson({ request: data }, 201)
}
