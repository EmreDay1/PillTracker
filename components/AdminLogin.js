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
  Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function AdminLogin({ onAdminAuthenticated, onBackToSignIn }) {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Kullanıcı adı gereklidir';
    }

    if (!formData.password) {
      newErrors.password = 'Şifre gereklidir';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAdminLogin = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      if (formData.username === 'admin' && formData.password === '123456') {
        console.log('Admin login successful');
        
        setFormData({
          username: '',
          password: ''
        });
        
        if (onAdminAuthenticated && typeof onAdminAuthenticated === 'function') {
          onAdminAuthenticated();
        }
      } else {
        Alert.alert('Giriş Hatası', 'Kullanıcı adı veya şifre hatalı.', [{ text: 'Tamam' }]);
      }
    } catch (error) {
      console.error('Admin login error:', error.message);
      Alert.alert('Hata', 'Giriş yapılırken bir hata oluştu.', [{ text: 'Tamam' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToSignIn = () => {
    console.log('AdminLogin: Going back to SignIn');
    setFormData({
      username: '',
      password: ''
    });
    setErrors({});
    if (onBackToSignIn && typeof onBackToSignIn === 'function') {
      onBackToSignIn();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" backgroundColor="#dc2626" />
      
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
              <View style={styles.adminIcon}>
                <Text style={styles.adminText}>👨‍💼</Text>
              </View>
            </View>
            <Text style={styles.appTitle}>Admin Panel</Text>
            <Text style={styles.subtitle}>Sistem yöneticisi girişi</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Admin Girişi</Text>
            
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Kullanıcı Adı</Text>
              <TextInput
                style={[styles.input, errors.username && styles.inputError]}
                placeholder="Admin kullanıcı adınızı girin"
                placeholderTextColor="#9ca3af"
                value={formData.username}
                onChangeText={(value) => handleInputChange('username', value)}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Şifre</Text>
              <TextInput
                style={[styles.input, errors.password && styles.inputError]}
                placeholder="Admin şifrenizi girin"
                placeholderTextColor="#9ca3af"
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
                secureTextEntry
                autoCapitalize="none"
                editable={!isLoading}
              />
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            <TouchableOpacity 
              style={[styles.loginButton, isLoading && styles.buttonDisabled]} 
              onPress={handleAdminLogin}
              disabled={isLoading}
            >
              <Text style={styles.loginButtonText}>
                {isLoading ? 'Giriş Yapılıyor...' : 'Admin Olarak Giriş Yap'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.backButton}
              onPress={handleBackToSignIn}
              disabled={isLoading}
            >
              <Text style={styles.backButtonText}>← Kullanıcı Girişine Dön</Text>
            </TouchableOpacity>

            <View style={styles.infoBox}>
              <Text style={styles.infoIcon}>ℹ️</Text>
              <Text style={styles.infoText}>
                Bu alan sadece sistem yöneticileri içindir. Yetkisiz erişim girişimleri kayıt altına alınır.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#dc2626',
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
  adminIcon: {
    width: 80,
    height: 80,
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
  },
  adminText: {
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
    color: '#fecaca',
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
    color: '#dc2626',
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
  loginButton: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: '6%',
    shadowColor: '#dc2626',
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
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#6b7280',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: '6%',
  },
  backButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIcon: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 2,
  },
  infoText: {
    fontSize: 14,
    color: '#dc2626',
    flex: 1,
    lineHeight: 20,
  },
});
