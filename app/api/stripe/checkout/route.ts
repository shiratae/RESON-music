import { createClient, createServiceClient } from '@/lib/supabase/server'
import { PLAN_PRICE_IDS } from '@/lib/stripe'
import { paymentProvider } from '@/lib/payment'
import { NextRequest, NextResponse } from 'next/server'
import type { PlanId } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { plan } = await req.json() as { plan: PlanId }

  if (!PLAN_PRICE_IDS[plan]) {
    return NextResponse.json({ error: '不正なプランです' }, { status: 400 })
  }

  // Student プランは別途 .ed.jp 認証が必要（Phase 3 で実装）
  // ここでは DB フラグ確認のみ
  if (plan === 'student') {
    const { data: userData } = await supabase
      .from('users')
      .select('student_verified')
      .eq('id', user.id)
      .single()

    if (!userData?.student_verified) {
      return NextResponse.json(
        { error: 'Studentプランは学生認証が必要です（Phase 3 で実装予定）' },
        { status: 403 }
      )
    }
  }

  const { data: userData } = await supabase
    .from('users')
    .select('stripe_customer_id, parent_user_id')
    .eq('id', user.id)
    .single()

  // ペアレンタル決済：保護者が紐付けられている場合は、決済（Stripe顧客・カード）は
  // 保護者側に対して行い、プラン付与（metadata.supabase_user_id）は本人のまま行う
  const parentUserId = (userData as { parent_user_id?: string })?.parent_user_id
  // stripe_customer_id is a server-managed field. Always use the service client for payer lookup/update.
  const service = await createServiceClient()
  const payerClient = service
  const payerId = parentUserId ?? user.id

  const { data: payerData } = payerId === user.id
    ? { data: userData }
    : await payerClient.from('users').select('stripe_customer_id').eq('id', payerId).single()

  let customerId = (payerData as { stripe_customer_id?: string } | null)?.stripe_customer_id

  if (!customerId) {
    const { customerId: newCustomerId } = await paymentProvider.createCustomer({
      metadata: { supabase_user_id: payerId },
    })
    customerId = newCustomerId
    await payerClient
      .from('users')
      .update({ stripe_customer_id: customerId } as never)
      .eq('id', payerId)
  }

  const origin = req.headers.get('origin') ?? 'http://localhost:3000'

  const { url } = await paymentProvider.createSubscriptionCheckout({
    customerId,
    priceId: PLAN_PRICE_IDS[plan],
    successUrl: `${origin}/pricing?success=1`,
    cancelUrl: `${origin}/pricing`,
    metadata: { supabase_user_id: user.id, plan },
  })

  return NextResponse.json({ url })
}
