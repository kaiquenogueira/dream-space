import { createClient } from '@supabase/supabase-js';

// Load env vars
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role to bypass RLS for check

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProfiles() {
  console.log("Checking 'profiles' table...");
  
  // 1. Check if table exists by inserting a dummy record (and failing) or selecting
  const { data, error } = await supabase
    .from('profiles')
    .select('count')
    .limit(1);

  if (error) {
    console.error("Error accessing profiles table:", error);
    if (error.code === '42P01') {
        console.error("CRITICAL: Table 'profiles' does not exist!");
    }
  } else {
    console.log("Profiles table accessible. Count query result:", data);
  }

  // 2. Check a specific user profile if we knew one, but for now just table access is key.
}

checkProfiles();
