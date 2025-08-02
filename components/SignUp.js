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
import { signUp } from '../services/auth';

export default function SignUp({ onNavigateToSignIn }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Ad gereklidir';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Soyad gereklidir';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'E-posta gereklidir';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Geçerli bir e-posta girin';
    }

    if (!formData.password) {
      newErrors.password = 'Şifre gereklidir';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Şifre en az 6 karakter olmalıdır';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Lütfen şifrenizi onaylayın';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Şifreler eşleşmiyor';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('Attempting sign up with:', formData.email);
      
      const { user, session } = await signUp(
        formData.email, 
        formData.password, 
        formData.firstName, 
        formData.lastName
      );
      
      console.log('Sign up successful:', user?.email);
      setShowSuccessModal(true);
      
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: ''
      });
      
    } catch (error) {
      console.error('Sign up error:', error.message);
      
      let errorMessage = 'Hesap oluşturulurken bir hata oluştu.';
      
      // Handle specific Supabase errors
      if (error.message.includes('User already registered')) {
        errorMessage = 'Bu e-posta adresi zaten kayıtlı. Giriş yapmayı deneyin.';
      } else if (error.message.includes('Password should be at least 6 characters')) {
        errorMessage = 'Şifre en az 6 karakter olmalıdır.';
      } else if (error.message.includes('Invalid email')) {
        errorMessage = 'Geçerli bir e-posta adresi girin.';
      } else if (error.message.includes('Signup is disabled')) {
        errorMessage = 'Yeni hesap kaydı şu anda kapalı.';
      } else if (error.message.includes('Network')) {
        errorMessage = 'İnternet bağlantınızı kontrol edin.';
      }
      
      Alert.alert('Kayıt Hatası', errorMessage, [{ text: 'Tamam' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    setShowSuccessModal(false);
    // App.js will handle navigation to AS.js based on auth state
  };

  const handleSignInNavigation = () => {
    console.log('SignUp: Navigating to SignIn');
    if (onNavigateToSignIn && typeof onNavigateToSignIn === 'function') {
      onNavigateToSignIn();
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
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.pillIcon}>
                <Text style={styles.pillText}>💊</Text>
              </View>
            </View>
            <Text style={styles.appTitle}>PillTracker</Text>
            <Text style={styles.subtitle}>Sağlık yolculuğunuza bugün başlayın</Text>
          </View>

          {/* Sign Up Form */}
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Hesabınızı Oluşturun</Text>
            
            {/* Name Fields Row */}
            <View style={styles.nameRow}>
              <View style={styles.nameField}>
                <Text style={styles.label}>Ad</Text>
                <TextInput
                  style={[styles.input, errors.firstName && styles.inputError]}
                  placeholder="Ahmet"
                  placeholderTextColor="#9ca3af"
                  value={formData.firstName}
                  onChangeText={(value) => handleInputChange('firstName', value)}
                  autoCapitalize="words"
                  editable={!isLoading}
                />
                {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
              </View>
              
              <View style={styles.nameField}>
                <Text style={styles.label}>Soyad</Text>
                <TextInput
                  style={[styles.input, errors.lastName && styles.inputError]}
                  placeholder="Yılmaz"
                  placeholderTextColor="#9ca3af"
                  value={formData.lastName}
                  onChangeText={(value) => handleInputChange('lastName', value)}
                  autoCapitalize="words"
                  editable={!isLoading}
                />
                {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
              </View>
            </View>

            {/* Email Field */}
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

            {/* Password Field */}
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

            {/* Confirm Password Field */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Şifreyi Onayla</Text>
              <TextInput
                style={[styles.input, errors.confirmPassword && styles.inputError]}
                placeholder="Şifrenizi onaylayın"
                placeholderTextColor="#9ca3af"
                value={formData.confirmPassword}
                onChangeText={(value) => handleInputChange('confirmPassword', value)}
                secureTextEntry
                autoCapitalize="none"
                editable={!isLoading}
              />
              {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
            </View>

            {/* Sign Up Button */}
            <TouchableOpacity 
              style={[styles.signUpButton, isLoading && styles.buttonDisabled]} 
              onPress={handleSignUp}
              disabled={isLoading}
            >
              <Text style={styles.signUpButtonText}>
                {isLoading ? 'Hesap Oluşturuluyor...' : 'Hesap Oluştur'}
              </Text>
            </TouchableOpacity>

            {/* Sign In Link */}
            <View style={styles.signInContainer}>
              <Text style={styles.signInText}>Zaten hesabınız var mı? </Text>
              <TouchableOpacity onPress={handleSignInNavigation} disabled={isLoading}>
                <Text style={styles.signInLink}>Giriş Yap</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showSuccessModal}
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>PillTracker'a Hoş Geldiniz! 🎉</Text>
            <Text style={styles.modalMessage}>
              Hesabınız başarıyla oluşturuldu. İlaçlarınızı takip etmeye ve sağlığınızın kontrolünü elinize almaya hazırsınız!
            </Text>
            <TouchableOpacity style={styles.modalButton} onPress={closeModal}>
              <Text style={styles.modalButtonText}>Başlayın</Text>
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
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: '5%',
  },
  nameField: {
    flex: 1,
    marginHorizontal: '1%',
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
  signUpButton: {
    backgroundColor: '#1a365d',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: '3%',
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
  signUpButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInText: {
    fontSize: 16,
    color: '#6b7280',
  },
  signInLink: {
    fontSize: 16,
    color: '#1a365d',
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
