import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const query = req.nextUrl.searchParams.get('q')?.trim() ?? ''

  if (query.length < 2) {
    return NextResponse.json({ artists: [] })
  }

  const { data, error } = await supabase
    .from('artists')
    .select('id, name')
    .eq('review_status', 'approved')
    .ilike('name', `%${query}%`)
    .order('name', { ascending: true })
    .limit(10)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ artists: data ?? [] })
}
