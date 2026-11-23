import { createServiceClient } from '@/lib/supabase/server'
import { hasValidCronAuthorization } from '@/lib/cron-auth'
import { NextRequest, NextResponse } from 'next/server'

// 開発者用アカウント作成（電話番号SMS認証をバイパスする）。
// SupabaseのSMSプロバイダ設定に問題がある場合の緊急避難用。CRON_SECRETで保護し、
// 誰でも叩けないようにする（本番運用では使わない想定・開発/検証専用）。
export async function POST(req: NextRequest) {
  // This endpoint can mint an administrator and reset passwords.
  // Keep it unavailable in normal production deployments. Production-mode
  // access is permitted only for the isolated CI E2E environment, where both
  // explicit E2E flags are set and the endpoint is still protected by CRON_SECRET.
  const isDevelopment = process.env.NODE_ENV === 'development'
  const isCiE2e =
    process.env.CI === 'true' &&
    process.env.E2E_ALLOW_DEV_SEED_ACCOUNT === 'true'

  if (
    process.env.ENABLE_DEV_SEED_ACCOUNT !== 'true' ||
    (!isDevelopment && !isCiE2e)
  ) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 })
  }
  const authHeader = req.headers.get('authorization')
  if (!hasValidCronAuthorization(authHeader)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { email, password } = await req.json()
  if (!email || !password || typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'email と8文字以上のpasswordが必要です' }, { status: 400 })
  }

  const service = await createServiceClient()

  // 既存ユーザーがいれば再利用（べき等）。いなければ新規作成
  const { data: existingList } = await service.auth.admin.listUsers()
  let authUserId = existingList?.users.find((u) => u.email === email)?.id

  if (!authUserId) {
    const { data: created, error: createError } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (createError || !created.user) {
      return NextResponse.json({ error: createError?.message ?? 'ユーザー作成に失敗しました' }, { status: 500 })
    }
    authUserId = created.user.id
  } else {
    // 既存ユーザーのパスワードを指定の値に更新（何度叩いても同じ認証情報でログインできるようにする）
    await service.auth.admin.updateUserById(authUserId, { password })
  }

  // users テーブル（開発しやすいよう Support+ プラン + 管理者権限を付与）
  await service.from('users').upsert(
    { id: authUserId, email, plan: 'support_plus', is_admin: true },
    { onConflict: 'id' }
  )

  // artists テーブル（審査済み状態で作成し、アーティスト向け機能もすぐ試せるようにする）
  const { data: existingArtist } = await service
    .from('artists')
    .select('id')
    .eq('user_id', authUserId)
    .maybeSingle()

  let artistId = existingArtist?.id
  if (!artistId) {
    const { data: artist, error: artistError } = await service
      .from('artists')
      .insert({
        user_id: authUserId,
        name: '開発者アカウント',
        review_status: 'approved',
        rights_confirmed: true,
        rights_confirmed_at: new Date().toISOString(),
      })
      .select('id')
      .single()
    if (artistError) {
      return NextResponse.json({ error: artistError.message }, { status: 500 })
    }
    artistId = artist.id

    await service.from('artist_bank_accounts').insert({
      artist_id: artistId,
      bank_name: 'テスト銀行',
      branch_name: 'テスト支店',
      account_type: 'ordinary',
      account_number: '0000000',
      account_holder_name: 'カイハツシャ アカウント',
    })
  }

  return NextResponse.json({
    ok: true,
    email,
    password,
    user_id: authUserId,
    artist_id: artistId,
    login_url: '/dev-login',
  })
}
