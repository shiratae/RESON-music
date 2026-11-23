import { createServiceClient } from '@/lib/supabase/server'
import { hasValidCronAuthorization } from '@/lib/cron-auth'
import { runCuratorBatch } from '@/lib/curator'
import { NextRequest, NextResponse } from 'next/server'

// 管理者専用エンドポイント（Vercel Cron or 手動実行）
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!hasValidCronAuthorization(authHeader)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServiceClient()
  const result = await runCuratorBatch(supabase)

  return NextResponse.json({ ok: true, ...result })
}
