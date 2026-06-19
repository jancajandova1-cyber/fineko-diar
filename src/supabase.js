import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wvqfiqgeqzobhcrltkzi.supabase.co'
const SUPABASE_KEY = 'sb_publishable_wwhe8J8IcQiSX6Y36DXiwg_JANio2XX'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

export async function loadData() {
  const { data, error } = await supabase
    .from('diar_data')
    .select('id, data')
  if (error) return null
  const result = {}
  data.forEach(row => { result[row.id] = row.data })
  return result
}

export async function saveData(id, data) {
  await supabase
    .from('diar_data')
    .upsert({ id, data, updated_at: new Date().toISOString() })
}
