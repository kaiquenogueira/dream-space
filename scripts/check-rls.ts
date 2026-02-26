import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPolicies() {
  console.log("Checking RLS policies on 'profiles' table...");
  
  // We can't directly query pg_policies via JS client easily without raw SQL RPC, 
  // but we can try to infer issues by simulating a user read.
  
  // 1. Get our test user
  const email = 'kaiquenogueir@gmail.com';
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const user = users.find(u => u.email === email);
  
  if (!user) {
      console.error("Test user not found");
      return;
  }
  
  console.log(`Testing access for user ${user.id} (${user.email})...`);

  // 2. Impersonate user (client with anon key but authorized token - simulated)
  // Actually, strictly server-side we can just use the service role to inspect, 
  // but to test RLS we need a client authenticated as that user.
  
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: email,
      password: 'uksa6n9d@'
  });
  
  if (loginError) {
      console.error("Login failed:", loginError);
      return;
  }
  
  // Create a client with the user's token to test RLS
  const userClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY!, {
      global: {
          headers: {
              Authorization: `Bearer ${loginData.session.access_token}`
          }
      }
  });
  
  const start = Date.now();
  const { data, error } = await userClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
    
  console.log(`RLS Read Time: ${Date.now() - start}ms`);
  
  if (error) {
      console.error("RLS Read Failed:", error);
  } else {
      console.log("RLS Read Success:", data ? "Data received" : "No data");
  }
}

checkPolicies();
