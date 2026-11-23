import { createClient } from '@/lib/supabase/server'
import { hashVerificationCode } from '@/lib/student/verify'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { code } = await req.json()
  if (!code) {
    return NextResponse.json({ error: 'code は必須です' }, { status: 400 })
  }

  const { data: result, error } = await supabase.rpc('consume_student_verification', {
    p_code_hash: hashVerificationCode(String(code)),
  })
  if (error) {
    return NextResponse.json({ error: '認証処理に失敗しました' }, { status: 500 })
  }
  if (result === 'verified') return NextResponse.json({ ok: true })
  if (result === 'too_many_attempts') return NextResponse.json({ error: '試行回数の上限に達しました。再度コードを送信してください' }, { status: 429 })
  if (result === 'expired') return NextResponse.json({ error: 'コードの有効期限が切れています。再度送信してください' }, { status: 400 })
  if (result === 'missing') return NextResponse.json({ error: '認証コードのリクエストが見つかりません' }, { status: 404 })
  return NextResponse.json({ error: 'コードが一致しません' }, { status: 400 })
}
