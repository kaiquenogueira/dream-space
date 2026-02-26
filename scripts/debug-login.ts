import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugLogin() {
  console.log("Attempting login...");
  
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'kaiquenogueir@gmail.com',
    password: 'uksa6n9d@'
  });

  if (authError) {
    console.error("Login failed:", authError.message);
    return;
  }

  console.log("Login successful! User ID:", authData.user.id);
  
  console.log("Fetching profile...");
  const start = Date.now();
  
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  const duration = Date.now() - start;
  console.log(`Profile fetch took ${duration}ms`);

  if (profileError) {
    console.error("Profile fetch failed:", profileError);
  } else {
    console.log("Profile found:", profile);
  }
}

debugLogin();
