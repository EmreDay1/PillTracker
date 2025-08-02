import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  Alert,
  Modal
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { signIn, resetPassword } from '../services/auth';

export default function SignIn({ onNavigateToSignUp, onNavigateToAdmin }) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [errors, setErrors] = useState({});
  const [rememberMe, setRememberMe] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'E-posta gereklidir';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Geçerli bir e-posta girin';
    }

    if (!formData.password) {
      newErrors.password = 'Şifre gereklidir';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('Attempting sign in with:', formData.email);
      
      const { user, session } = await signIn(formData.email, formData.password);
      
      console.log('Sign in successful:', user?.email);
      setShowSuccessModal(true);
      
      setFormData({
        email: '',
        password: ''
      });
      setRememberMe(false);
      
    } catch (error) {
      console.error('Sign in error:', error.message);
      
      let errorMessage = 'Giriş yapılırken bir hata oluştu.';
      
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'E-posta veya şifre hatalı.';
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = 'E-posta adresinizi onaylamanız gerekiyor.';
      } else if (error.message.includes('Too many requests')) {
        errorMessage = 'Çok fazla deneme yapıldı. Lütfen daha sonra tekrar deneyin.';
      } else if (error.message.includes('Network')) {
        errorMessage = 'İnternet bağlantınızı kontrol edin.';
      }
      
      Alert.alert('Giriş Hatası', errorMessage, [{ text: 'Tamam' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    setShowSuccessModal(false);
  };

  const handleForgotPassword = () => {
    if (!formData.email.trim()) {
      Alert.alert(
        'E-posta Gerekli',
        'Şifrenizi sıfırlamak için önce e-posta adresinizi girin.',
        [{ text: 'Tamam' }]
      );
      return;
    }

    Alert.alert(
      'Şifreyi Sıfırla',
      `${formData.email} adresine şifre sıfırlama bağlantısı gönderilsin mi?`,
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Gönder', 
          onPress: () => handlePasswordReset(formData.email)
        }
      ]
    );
  };

  const handlePasswordReset = async (email) => {
    try {
      setIsLoading(true);
      await resetPassword(email);
      
      Alert.alert(
        'E-posta Gönderildi',
        `${email} adresine şifre sıfırlama bağlantısı gönderildi. E-posta kutunuzu kontrol edin.`,
        [{ text: 'Tamam' }]
      );
    } catch (error) {
      console.error('Password reset error:', error.message);
      Alert.alert(
        'Hata',
        'Şifre sıfırlama e-postası gönderilirken bir hata oluştu.',
        [{ text: 'Tamam' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUpNavigation = () => {
    console.log('SignIn: Navigating to SignUp');
    if (onNavigateToSignUp && typeof onNavigateToSignUp === 'function') {
      onNavigateToSignUp();
    }
  };

  const handleAdminNavigation = () => {
    console.log('SignIn: Navigating to Admin');
    if (onNavigateToAdmin && typeof onNavigateToAdmin === 'function') {
      onNavigateToAdmin();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" backgroundColor="#1a365d" />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.pillIcon}>
                <Text style={styles.pillText}>💊</Text>
              </View>
            </View>
            <Text style={styles.appTitle}>PillTracker</Text>
            <Text style={styles.subtitle}>Sağlık yolculuğunuza tekrar hoş geldiniz</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Hesabınıza Giriş Yapın</Text>
            
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>E-posta Adresi</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="ahmet.yilmaz@example.com"
                placeholderTextColor="#9ca3af"
                value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Şifre</Text>
              <TextInput
                style={[styles.input, errors.password && styles.inputError]}
                placeholder="Şifrenizi girin"
                placeholderTextColor="#9ca3af"
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
                secureTextEntry
                autoCapitalize="none"
                editable={!isLoading}
              />
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            <View style={styles.optionsRow}>
              <TouchableOpacity 
                style={styles.rememberMeContainer}
                onPress={() => setRememberMe(!rememberMe)}
                disabled={isLoading}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.rememberMeText}>Beni hatırla</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleForgotPassword} disabled={isLoading}>
                <Text style={styles.forgotPasswordText}>Şifremi Unuttum?</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.signInButton, isLoading && styles.buttonDisabled]} 
              onPress={handleSignIn}
              disabled={isLoading}
            >
              <Text style={styles.signInButtonText}>
                {isLoading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
              </Text>
            </TouchableOpacity>

            <View style={styles.signUpContainer}>
              <Text style={styles.signUpText}>Hesabınız yok mu? </Text>
              <TouchableOpacity onPress={handleSignUpNavigation} disabled={isLoading}>
                <Text style={styles.signUpLink}>Hesap Oluştur</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.adminButton}
              onPress={handleAdminNavigation}
              disabled={isLoading}
            >
              <Text style={styles.adminButtonText}>👨‍💼 Admin Girişi</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={showSuccessModal}
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Tekrar Hoş Geldiniz! 👋</Text>
            <Text style={styles.modalMessage}>
              Başarıyla giriş yaptınız. İlaçlarınızı yönetmeye devam edelim ve sağlığınızda yolda kalalım!
            </Text>
            <TouchableOpacity style={styles.modalButton} onPress={closeModal}>
              <Text style={styles.modalButtonText}>Devam Et</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a365d',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    minHeight: '100%',
  },
  header: {
    alignItems: 'center',
    paddingTop: '8%',
    paddingBottom: '6%',
    paddingHorizontal: '8%',
  },
  logoContainer: {
    marginBottom: '4%',
  },
  pillIcon: {
    width: '20%',
    height: undefined,
    aspectRatio: 1,
    backgroundColor: 'white',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 60,
    maxWidth: 80,
  },
  pillText: {
    fontSize: 40,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#cbd5e0',
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
    backgroundColor: 'white',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: '8%',
    paddingVertical: '8%',
    minHeight: '60%',
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a365d',
    textAlign: 'center',
    marginBottom: '8%',
  },
  fieldContainer: {
    marginBottom: '5%',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: 4,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6%',
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#1a365d',
    borderColor: '#1a365d',
  },
  checkmark: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  rememberMeText: {
    fontSize: 14,
    color: '#374151',
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#1a365d',
    fontWeight: '600',
  },
  signInButton: {
    backgroundColor: '#1a365d',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: '8%',
    shadowColor: '#1a365d',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonDisabled: {
    backgroundColor: '#6b7280',
    shadowOpacity: 0.1,
  },
  signInButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '6%',
  },
  signUpText: {
    fontSize: 16,
    color: '#6b7280',
  },
  signUpLink: {
    fontSize: 16,
    color: '#1a365d',
    fontWeight: 'bold',
  },
  adminButton: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#dc2626',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  adminButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    maxWidth: 300,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 25,
    elevation: 25,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    color: '#6b7280',
    marginBottom: 24,
    lineHeight: 20,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: '#1a365d',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
