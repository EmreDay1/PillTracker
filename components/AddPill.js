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
import DateTimePicker from '@react-native-community/datetimepicker';
import { addPill } from '../services/pills';

export default function AddPill({ isVisible, onClose, onPillAdded }) {
  const [formData, setFormData] = useState({
    name: '',
    time: new Date()
  });

  const [errors, setErrors] = useState({});
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    
    if (selectedTime && event.type !== 'dismissed') {
      handleInputChange('time', selectedTime);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('tr-TR', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'İlaç adı gereklidir';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'İlaç adı en az 2 karakter olmalıdır';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddPill = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('Adding new pill:', formData.name);
      
      // Format time as HH:MM string for the service
      const timeString = formatTime(formData.time);
      
      const pillData = {
        name: formData.name.trim(),
        time: timeString
      };

      const newPill = await addPill(pillData);
      
      console.log('Pill added successfully:', pillData.name);
      
      // Show success alert
      Alert.alert(
        'Başarılı! 🎉',
        `${pillData.name} ilacı ${timeString} saatinde hatırlatma ile eklendi.`,
        [
          {
            text: 'Tamam',
            onPress: () => {
              // Reset form
              setFormData({
                name: '',
                time: new Date()
              });
              setErrors({});
              
              // Close modal and refresh parent
              if (onPillAdded) {
                onPillAdded(newPill);
              }
              onClose();
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('Add pill error:', error.message);
      
      let errorMessage = 'İlaç eklenirken bir hata oluştu.';
      
      // Handle specific errors
      if (error.message.includes('User not authenticated')) {
        errorMessage = 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.';
      } else if (error.message.includes('Network')) {
        errorMessage = 'İnternet bağlantınızı kontrol edin.';
      }
      
      Alert.alert('Hata', errorMessage, [{ text: 'Tamam' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset form data
    setFormData({
      name: '',
      time: new Date()
    });
    setErrors({});
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={isVisible}
      onRequestClose={handleCancel}
    >
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
              <Text style={styles.appTitle}>Yeni İlaç Ekle</Text>
              <Text style={styles.subtitle}>İlaç bilgilerinizi girin</Text>
            </View>

            {/* Add Pill Form */}
            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>İlaç Bilgileri</Text>
              
              {/* Pill Name Field */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>İlaç Adı</Text>
                <TextInput
                  style={[styles.input, errors.name && styles.inputError]}
                  placeholder="Örn: Aspirin, Vitamin D, Antibiyotik"
                  placeholderTextColor="#9ca3af"
                  value={formData.name}
                  onChangeText={(value) => handleInputChange('name', value)}
                  autoCapitalize="words"
                  editable={!isLoading}
                />
                {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
              </View>

              {/* Time Field */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Hatırlatma Saati</Text>
                <TouchableOpacity 
                  style={[styles.timeInput, errors.time && styles.inputError]}
                  onPress={() => setShowTimePicker(true)}
                  disabled={isLoading}
                >
                  <Text style={styles.timeText}>
                    {formatTime(formData.time)}
                  </Text>
                  <Text style={styles.timeIcon}>🕐</Text>
                </TouchableOpacity>
                {errors.time && <Text style={styles.errorText}>{errors.time}</Text>}
              </View>

              {/* Info Box */}
              <View style={styles.infoBox}>
                <Text style={styles.infoIcon}>ℹ️</Text>
                <Text style={styles.infoText}>
                  İlaç her gün bu saatte alınacak şekilde hatırlatılacaktır. ±10 dakika tolerans ile zamanında/geç takibi yapılır.
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={[styles.addButton, isLoading && styles.buttonDisabled]} 
                  onPress={handleAddPill}
                  disabled={isLoading}
                >
                  <Text style={styles.addButtonText}>
                    {isLoading ? 'İlaç Ekleniyor...' : 'İlaç Ekle'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={handleCancel}
                  disabled={isLoading}
                >
                  <Text style={styles.cancelButtonText}>İptal</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Native Time Picker Modal */}
        {showTimePicker && (
          <Modal
            animationType="slide"
            transparent={true}
            visible={showTimePicker}
            onRequestClose={() => setShowTimePicker(false)}
          >
            <View style={styles.timePickerModalOverlay}>
              <View style={styles.timePickerModalContent}>
                <View style={styles.timePickerHeader}>
                  <TouchableOpacity 
                    style={styles.timePickerCancel}
                    onPress={() => setShowTimePicker(false)}
                  >
                    <Text style={styles.timePickerCancelText}>İptal</Text>
                  </TouchableOpacity>
                  
                  <Text style={styles.timePickerTitle}>Saat Seçin</Text>
                  
                  <TouchableOpacity 
                    style={styles.timePickerDone}
                    onPress={() => setShowTimePicker(false)}
                  >
                    <Text style={styles.timePickerDoneText}>Tamam</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.timePickerContainer}>
                  <DateTimePicker
                    value={formData.time}
                    mode="time"
                    is24Hour={true}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleTimeChange}
                    textColor="#1a365d"
                    style={styles.timePicker}
                  />
                </View>
              </View>
            </View>
          </Modal>
        )}
      </SafeAreaView>
    </Modal>
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
    width: 60,
    height: 60,
    backgroundColor: 'white',
    borderRadius: 30,
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
  pillText: {
    fontSize: 30,
  },
  appTitle: {
    fontSize: 28,
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
    marginBottom: '6%',
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
  timeInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  timeIcon: {
    fontSize: 20,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: 4,
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: '8%',
  },
  infoIcon: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 2,
  },
  infoText: {
    fontSize: 14,
    color: '#1e40af',
    flex: 1,
    lineHeight: 20,
  },
  buttonContainer: {
    gap: 12,
  },
  addButton: {
    backgroundColor: '#1a365d',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
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
  addButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#6b7280',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
  timePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  timePickerModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  timePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a365d',
  },
  timePickerCancel: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  timePickerCancelText: {
    fontSize: 16,
    color: '#6b7280',
  },
  timePickerDone: {
    backgroundColor: '#1a365d',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  timePickerDoneText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  timePickerContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  timePicker: {
    width: '100%',
    height: 200,
  },
});
