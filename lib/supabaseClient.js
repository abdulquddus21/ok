import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vipmdvwkymqvczsejlsm.supabase.co'
// DIQQAT: Bu yerga o'z ANON PUBLIC KEY ingizni qo'ying (Dashboard -> Project Settings -> API)
const supabaseKey = 'sb_publishable_JbCYgR2DXpnN4Rp8QShEgw_8HzoYKze' 

export const supabase = createClient(supabaseUrl, supabaseKey)