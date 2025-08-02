import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import SignIn from './components/SignIn';
import SignUp from './components/SignUp';
import AuthSuccess from './components/AS';
import AdminLogin from './components/AdminLogin';
import AdminPanel from './components/AdminPanel';
import { onAuthStateChange, getCurrentSession } from './services/auth';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('SignIn');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authSubscription, setAuthSubscription] = useState(null);

  useEffect(() => {
    console.log('App: Initializing authentication...');
    initializeAuth();

    return () => {
      if (authSubscription) {
        console.log('App: Cleaning up auth subscription');
        authSubscription.unsubscribe();
      }
    };
  }, []);

  const initializeAuth = async () => {
    try {
      console.log('App: Checking initial session...');
      
      const session = await getCurrentSession();
      
      if (session && session.user) {
        console.log('App: User already authenticated:', session.user.email);
        setIsAuthenticated(true);
        setCurrentScreen('AuthSuccess');
      } else {
        console.log('App: No active session found');
        setIsAuthenticated(false);
        setCurrentScreen('SignIn');
      }

      const subscription = onAuthStateChange((event, session) => {
        console.log('App: Auth state changed:', event);
        
        if (event === 'SIGNED_IN' && session) {
          console.log('App: User signed in:', session.user.email);
          setIsAuthenticated(true);
          setCurrentScreen('AuthSuccess');
        } else if (event === 'SIGNED_OUT') {
          console.log('App: User signed out');
          setIsAuthenticated(false);
          setCurrentScreen('SignIn');
        } else if (event === 'TOKEN_REFRESHED' && session) {
          console.log('App: Token refreshed for user:', session.user.email);
          setIsAuthenticated(true);
        }
      });

      setAuthSubscription(subscription);
      
    } catch (error) {
      console.error('App: Error initializing auth:', error.message);
      setIsAuthenticated(false);
      setCurrentScreen('SignIn');
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToSignIn = () => {
    console.log('App: Navigating to SignIn');
    setCurrentScreen('SignIn');
    setIsAdminAuthenticated(false);
  };

  const navigateToSignUp = () => {
    console.log('App: Navigating to SignUp');
    setCurrentScreen('SignUp');
  };

  const navigateToAdmin = () => {
    console.log('App: Navigating to AdminLogin');
    setCurrentScreen('AdminLogin');
  };

  const handleAdminAuthenticated = () => {
    console.log('App: Admin authenticated, navigating to AdminPanel');
    setIsAdminAuthenticated(true);
    setCurrentScreen('AdminPanel');
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <View style={styles.pillIcon}>
            <Text style={styles.pillText}>💊</Text>
          </View>
          <Text style={styles.appTitle}>PillTracker</Text>
          <ActivityIndicator size="large" color="#1a365d" style={styles.spinner} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </View>
    );
  }

  if (isAdminAuthenticated && currentScreen === 'AdminPanel') {
    console.log('App: Rendering AdminPanel screen');
    return <AdminPanel onBackToSignIn={navigateToSignIn} />;
  }

  if (currentScreen === 'AdminLogin') {
    console.log('App: Rendering AdminLogin screen');
    return (
      <AdminLogin 
        onAdminAuthenticated={handleAdminAuthenticated}
        onBackToSignIn={navigateToSignIn}
      />
    );
  }

  if (isAuthenticated && currentScreen === 'AuthSuccess') {
    console.log('App: Rendering AuthSuccess screen');
    return <AuthSuccess />;
  }

  if (currentScreen === 'SignUp') {
    console.log('App: Rendering SignUp screen');
    return (
      <SignUp 
        onNavigateToSignIn={navigateToSignIn}
      />
    );
  }

  console.log('App: Rendering SignIn screen');
  return (
    <SignIn 
      onNavigateToSignUp={navigateToSignUp}
      onNavigateToAdmin={navigateToAdmin}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1a365d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  pillIcon: {
    width: 80,
    height: 80,
    backgroundColor: 'white',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  pillText: {
    fontSize: 40,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 32,
  },
  spinner: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#cbd5e0',
    textAlign: 'center',
  },
});
