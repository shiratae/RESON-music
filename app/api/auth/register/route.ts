import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

function isValidEmail(value: unknown): value is string {
  if (typeof value !== 'string') return false

  const email = value.trim()
  if (!email || email.length > 254) return false
  if (email.includes(' ') || email.includes('\t') || email.includes('\n') || email.includes('\r')) return false

  const atIndex = email.indexOf('@')
  if (atIndex <= 0 || atIndex !== email.lastIndexOf('@')) return false

  const local = email.slice(0, atIndex)
  const domain = email.slice(atIndex + 1)
  if (!local || domain.length <= 2 || domain.startsWith('.') || domain.endsWith('.')) return false

  return domain.includes('.')
}

export async function POST(req: NextRequest) {
  const { email, password, ref } = await req.json()
  const normalizedEmail = typeof email === 'string' ? email.trim() : email

  if (!isValidEmail(normalizedEmail)) {
    return NextResponse.json({ code: 'invalid_email' }, { status: 400 })
  }
  if (typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ code: 'password_too_short' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({ email: normalizedEmail, password })

  if (error) {
    return NextResponse.json({ code: 'account_creation_failed' }, { status: 400 })
  }

  // users テーブルに upsert（初回登録時のみ INSERT される）
  const userId = data.user?.id
  if (userId) {
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle()
    const isNewUser = !existingUser

    await supabase.from('users').upsert(
      { id: userId, plan: 'free' },
      { onConflict: 'id', ignoreDuplicates: true }
    )

    // 紹介制：新規ユーザーが ?ref=コード 付きリンクから来た場合のみ記録する（特典なし）
    if (isNewUser && typeof ref === 'string' && ref.trim()) {
      const serviceClient = await createServiceClient()
      const { data: referrer } = await serviceClient
        .from('users')
        .select('id')
        .eq('referral_code', ref.trim())
        .maybeSingle()

      if (referrer && referrer.id !== userId) {
        await serviceClient.from('referrals').insert({
          referrer_id: referrer.id,
          referred_id: userId,
        })
      }
    }
  }

  // Supabase側でメール確認が有効な場合、session は null で返る（確認リンククリック後にログイン可能）
  return NextResponse.json({
    ok: true,
    user_id: userId,
    needs_email_confirmation: !data.session,
  })
}
