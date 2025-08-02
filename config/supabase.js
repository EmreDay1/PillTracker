import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase configuration
const supabaseUrl = 'https://ynutyshgsulsqkbrbiqk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InludXR5c2hnc3Vsc3FrYnJiaXFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0MjM4NDQsImV4cCI6MjA2NDk5OTg0NH0.dTXNwBxbwD5Ek3Fpap9acRkH7QbWc6uaQcByiTGU6zk';

// Create Supabase client with React Native configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export default supabase;
