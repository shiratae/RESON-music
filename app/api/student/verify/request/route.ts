import { createClient } from '@/lib/supabase/server'
import { isEdJpEmail, generateVerificationCode, hashVerificationCode, codeExpiresAt } from '@/lib/student/verify'
import { sendEmail } from '@/lib/email'
import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { school_email } = await req.json()
  if (!school_email || !isEdJpEmail(school_email)) {
    return NextResponse.json({ error: '学校発行の .ed.jp メールアドレスを入力してください' }, { status: 400 })
  }

  const now = new Date()
  const code = generateVerificationCode()

  const service = createServiceClient()
  const { error } = await service.from('student_verifications').insert({
    user_id: user.id,
    school_email,
    code_hash: hashVerificationCode(code),
    expires_at: codeExpiresAt(now).toISOString(),
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { sent } = await sendEmail({
    to: school_email,
    subject: 'RESON Studentプラン認証コード',
    text: `以下の6桁の確認コードをRESONの認証画面に入力してください（有効期限10分）。\n\n${code}\n\nこのメールに心当たりがない場合は破棄してください。`,
  })

  return NextResponse.json({ ok: true, email_sent: sent })
}
