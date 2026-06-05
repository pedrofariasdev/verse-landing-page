const SUPABASE_URL = "https://ogvxscsawcgxlhboqpoh.supabase.co";

const SUPABASE_ANON_KEY = "sb_publishable_voc-6vxNWiCF_qo_m12wTg_y4lZrOBC";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

console.log("Supabase conectado!");