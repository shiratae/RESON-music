import { createServiceClient } from '@/lib/supabase/server'
import { hasValidCronAuthorization } from '@/lib/cron-auth'
import { processPayoutRequest } from '@/lib/payout/process'
import { NextRequest, NextResponse } from 'next/server'

// 管理者専用エンドポイント（出金申請の承認/却下・手動運用を前提とした最小実装）
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!hasValidCronAuthorization(authHeader)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { request_id, action } = await req.json()
  if (!request_id || (action !== 'paid' && action !== 'rejected')) {
    return NextResponse.json({ error: 'request_id と action("paid"|"rejected") は必須です' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  try {
    const result = await processPayoutRequest(supabase, request_id, action)
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
