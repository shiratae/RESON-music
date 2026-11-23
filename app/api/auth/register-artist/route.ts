import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ code: 'authentication_required' }, { status: 401 })
  }

  const { name, bio, rights_confirmed, bank, is_minor, parent_consent_name, parent_consent_contact } = await req.json()

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ code: 'artist_name_required' }, { status: 400 })
  }
  if (name.trim().length > 100) {
    return NextResponse.json({ code: 'artist_name_too_long' }, { status: 400 })
  }
  if (rights_confirmed !== true) {
    return NextResponse.json({ code: 'rights_required' }, { status: 400 })
  }
  if (
    !bank ||
    typeof bank.bank_name !== 'string' || !bank.bank_name.trim() ||
    typeof bank.branch_name !== 'string' || !bank.branch_name.trim() ||
    (bank.account_type !== 'ordinary' && bank.account_type !== 'checking') ||
    typeof bank.account_number !== 'string' || !bank.account_number.trim() ||
    typeof bank.account_holder_name !== 'string' || !bank.account_holder_name.trim()
  ) {
    return NextResponse.json({ code: 'bank_required' }, { status: 400 })
  }
  if (
    is_minor === true &&
    (typeof parent_consent_name !== 'string' || !parent_consent_name.trim() ||
     typeof parent_consent_contact !== 'string' || !parent_consent_contact.trim())
  ) {
    return NextResponse.json({ code: 'guardian_required' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('artists')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (existing) {
    return NextResponse.json({ code: 'artist_already_registered' }, { status: 409 })
  }

  const service = createServiceClient()
  const { data: artist, error } = await service
    .from('artists')
    .insert({
      user_id: user.id,
      name: name.trim(),
      bio: bio?.trim() ?? null,
      review_status: 'pending',
      rights_confirmed: true,
      rights_confirmed_at: new Date().toISOString(),
    })
    .select('id, name, review_status')
    .single()

  if (error) {
    return NextResponse.json({ code: 'artist_registration_failed' }, { status: 500 })
  }

  const { error: consentError } = await service.from('artist_guardian_consents').insert({
    artist_id: artist.id,
    is_minor: is_minor === true,
    parent_consent_name: is_minor === true ? parent_consent_name.trim() : null,
    parent_consent_contact: is_minor === true ? parent_consent_contact.trim() : null,
  })
  if (consentError) {
    return NextResponse.json({ code: 'artist_registration_failed' }, { status: 500 })
  }

  const { error: bankError } = await service.from('artist_bank_accounts').insert({
    artist_id: artist.id,
    bank_name: bank.bank_name.trim(),
    branch_name: bank.branch_name.trim(),
    account_type: bank.account_type,
    account_number: bank.account_number.trim(),
    account_holder_name: bank.account_holder_name.trim(),
  })

  if (bankError) {
    return NextResponse.json({ code: 'artist_registration_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, artist })
}
