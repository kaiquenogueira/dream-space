import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetPassword() {
  const email = 'kaiquenogueir@gmail.com';
  const newPassword = 'uksa6n9d@';
  
  console.log(`Resetting password for ${email}...`);
  
  const { data: { user }, error } = await supabase.auth.admin.updateUserById(
    'ec2a6616-42ec-48bc-85ad-c560c2cb05d8', // ID found in previous step
    { password: newPassword }
  );

  if (error) {
    console.error("Error resetting password:", error);
  } else {
    console.log("Password reset successful for user:", user.email);
  }
}

resetPassword();
