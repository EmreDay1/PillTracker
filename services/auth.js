import { supabase } from '../config/supabase';

/**
 * Authentication service for PillTracker app
 * Handles all user authentication operations with Supabase
 */

// Sign up new user
export const signUp = async (email, password, firstName, lastName) => {
  try {
    console.log('Attempting to sign up user:', email);
    
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          full_name: `${firstName} ${lastName}`,
        },
      },
    });

    if (error) {
      console.error('Sign up error:', error.message);
      throw error;
    }

    console.log('Sign up successful:', data.user?.email);
    return { user: data.user, session: data.session };
  } catch (error) {
    console.error('Sign up failed:', error.message);
    throw error;
  }
};

// Sign in existing user
export const signIn = async (email, password) => {
  try {
    console.log('Attempting to sign in user:', email);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      console.error('Sign in error:', error.message);
      throw error;
    }

    console.log('Sign in successful:', data.user?.email);
    return { user: data.user, session: data.session };
  } catch (error) {
    console.error('Sign in failed:', error.message);
    throw error;
  }
};

// Sign out current user
export const signOut = async () => {
  try {
    console.log('Attempting to sign out user');
    
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Sign out error:', error.message);
      throw error;
    }

    console.log('Sign out successful');
    return true;
  } catch (error) {
    console.error('Sign out failed:', error.message);
    throw error;
  }
};

// Get current session
export const getCurrentSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Get session error:', error.message);
      throw error;
    }

    return session;
  } catch (error) {
    console.error('Get session failed:', error.message);
    throw error;
  }
};

// Get current user
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      console.error('Get user error:', error.message);
      throw error;
    }

    return user;
  } catch (error) {
    console.error('Get user failed:', error.message);
    throw error;
  }
};

// Reset password
export const resetPassword = async (email) => {
  try {
    console.log('Attempting to reset password for:', email);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'pilltracker://reset-password',
    });

    if (error) {
      console.error('Password reset error:', error.message);
      throw error;
    }

    console.log('Password reset email sent to:', email);
    return true;
  } catch (error) {
    console.error('Password reset failed:', error.message);
    throw error;
  }
};

// Listen to auth state changes
export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event, session?.user?.email || 'No user');
    callback(event, session);
  });
};

// Update user password
export const updatePassword = async (newPassword) => {
  try {
    console.log('Attempting to update user password');
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      console.error('Update password error:', error.message);
      throw error;
    }

    console.log('Password updated successfully');
    return true;
  } catch (error) {
    console.error('Update password failed:', error.message);
    throw error;
  }
};

// Update user profile
export const updateUserProfile = async (updates) => {
  try {
    console.log('Attempting to update user profile:', updates);
    
    const { error } = await supabase.auth.updateUser({
      data: updates
    });

    if (error) {
      console.error('Update profile error:', error.message);
      throw error;
    }

    console.log('Profile updated successfully');
    return true;
  } catch (error) {
    console.error('Update profile failed:', error.message);
    throw error;
  }
};

export default {
  signUp,
  signIn,
  signOut,
  getCurrentSession,
  getCurrentUser,
  resetPassword,
  onAuthStateChange,
  updatePassword,
  updateUserProfile,
};
