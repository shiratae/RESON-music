import { createServiceClient } from '@/lib/supabase/server'
import { hasValidCronAuthorization } from '@/lib/cron-auth'
import { runFraudBatch } from '@/lib/fraud'
import { NextRequest, NextResponse } from 'next/server'

// 管理者専用エンドポイント（Vercel Cron or 手動実行）。同一IP大量再生・機械的再生パターンを
// 定期的に再走査する（同一楽曲連投・異常完聴率は再生ログ受信時に即時チェック済み）。
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!hasValidCronAuthorization(authHeader)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServiceClient()
  const result = await runFraudBatch(supabase)

  return NextResponse.json({ ok: true, ...result })
}
