import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listUsers() {
  console.log("Listing users...");
  
  const { data: { users }, error } = await supabase.auth.admin.listUsers();

  if (error) {
    console.error("Error listing users:", error);
    return;
  }

  const targetEmail = 'kaiquenogueir@gmail.com';
  const foundUser = users.find(u => u.email === targetEmail);

  if (foundUser) {
    console.log("User found:", {
      id: foundUser.id,
      email: foundUser.email,
      confirmed_at: foundUser.confirmed_at,
      last_sign_in_at: foundUser.last_sign_in_at,
      role: foundUser.role
    });
    
    // Also check if profile exists for this user
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', foundUser.id)
        .single();
        
    if (profileError) {
        console.error("Profile check failed:", profileError);
    } else {
        console.log("Profile found:", profile);
    }

  } else {
    console.log("User NOT found:", targetEmail);
    console.log("Available users:", users.map(u => u.email));
  }
}

listUsers();
