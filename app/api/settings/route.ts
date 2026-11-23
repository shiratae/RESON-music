import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { validateSettingsPatch } from '@/lib/privacy/settings'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { data, error: settingsError } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (settingsError) return NextResponse.json({ error: '設定を取得できませんでした' }, { status: 500 })

  return NextResponse.json({ settings: data ?? {} })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'JSON形式が正しくありません' }, { status: 400 })
  }
  const patch = validateSettingsPatch(body)
  if (!patch) return NextResponse.json({ error: '設定項目または値が正しくありません' }, { status: 400 })

  const { error: updateError } = await supabase
    .from('user_settings')
    .upsert({ ...patch, user_id: user.id }, { onConflict: 'user_id' })

  if (updateError) return NextResponse.json({ error: '設定を保存できませんでした' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
