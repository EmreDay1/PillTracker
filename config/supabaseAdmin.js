// 🔧 Step 1: Create config/supabaseAdmin.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ynutyshgsulsqkbrbiqk.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InludXR5c2hnc3Vsc3FrYnJiaXFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTQyMzg0NCwiZXhwIjoyMDY0OTk5ODQ0fQ.3S0Zz2AZRumYqVk7S1IVQCktspPJIbeVVyiG5YU5eIs';

// Create admin client with service role key
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('🔑 Admin client initialized with service role');

export default supabaseAdmin;
