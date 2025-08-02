import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView,
  ScrollView,
  Alert,
  RefreshControl
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { signOut, getCurrentUser } from '../services/auth';
import { getUserPills, updatePillStatus, deletePill, getAdherenceStats, getPillLogs } from '../services/pills';
import AddPill from './AddPill';

export default function AuthSuccess() {
  const [user, setUser] = useState(null);
  const [pills, setPills] = useState([]);
  const [stats, setStats] = useState({ total: 0, onTime: 0, late: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddPill, setShowAddPill] = useState(false);

  useEffect(() => {
    loadUserData();
    loadPills();
    requestNotificationPermission();
    setupNotificationListener();
  }, []);

  const setupNotificationListener = () => {
    // Listen for notifications when app is in foreground
    const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received in foreground:', notification);
    });

    // Listen for notification responses (when user taps notification)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const { pillId, pillName } = response.notification.request.content.data;
      console.log('User tapped notification for:', pillName);
      
      // Show alert when user taps notification
      Alert.alert(
        '💊 İlaç Hatırlatması',
        `${pillName} alma zamanı!`,
        [{ text: 'Tamam' }]
      );
    });

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  };

  const requestNotificationPermission = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Bildirim İzni',
        'İlaç hatırlatmaları için bildirim izni gereklidir.',
        [{ text: 'Tamam' }]
      );
    }
  };

  const loadUserData = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      console.log('Current user loaded:', currentUser?.email);
    } catch (error) {
      console.error('Error loading user data:', error.message);
    }
  };

  const loadPills = async () => {
    try {
      setIsLoading(true);
      const userPills = await getUserPills();
      setPills(userPills);
      
      // Calculate custom stats
      const adherenceStats = await getAdherenceStats();
      setStats({
        total: adherenceStats.total,
        onTime: adherenceStats.onTime,
        late: adherenceStats.late
      });
      
      console.log('Pills loaded:', userPills.length);
    } catch (error) {
      console.error('Error loading pills:', error.message);
      Alert.alert('Hata', 'İlaçlar yüklenirken bir hata oluştu.', [{ text: 'Tamam' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadPills();
    setIsRefreshing(false);
  };

  const handlePillTaken = async (pill) => {
    if (pill.taken) {
      Alert.alert(
        'İlaç Zaten Alındı',
        'Bu ilaç bugün zaten alındı olarak işaretlenmiş.',
        [{ text: 'Tamam' }]
      );
      return;
    }

    Alert.alert(
      'İlaç Al',
      `${pill.name} ilacını şimdi aldınız mı?`,
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Evet, Aldım', 
          onPress: () => markPillAsTaken(pill)
        }
      ]
    );
  };

  const markPillAsTaken = async (pill) => {
    try {
      await updatePillStatus(pill.id, true, pill.time);
      
      // Refresh pills and stats
      await loadPills();
      
      console.log('Pill marked as taken:', pill.name);
    } catch (error) {
      console.error('Error marking pill as taken:', error.message);
      Alert.alert('Hata', 'İlaç durumu güncellenirken bir hata oluştu.', [{ text: 'Tamam' }]);
    }
  };

  const handlePillReset = async (pill) => {
    if (!pill.taken) {
      return;
    }

    Alert.alert(
      'İlaç Durumunu Sıfırla',
      `${pill.name} ilacını alınmadı olarak işaretlemek istediğinizden emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Sıfırla', 
          onPress: () => resetPillStatus(pill)
        }
      ]
    );
  };

  const resetPillStatus = async (pill) => {
    try {
      await updatePillStatus(pill.id, false);
      
      // Refresh pills and stats
      await loadPills();
      
      console.log('Pill status reset:', pill.name);
    } catch (error) {
      console.error('Error resetting pill status:', error.message);
      Alert.alert('Hata', 'İlaç durumu sıfırlanırken bir hata oluştu.', [{ text: 'Tamam' }]);
    }
  };

  const handleViewPillLogs = async (pill) => {
    try {
      const logs = await getPillLogs(pill.id);
      
      if (logs.length === 0) {
        Alert.alert(
          'İlaç Geçmişi',
          `${pill.name} için henüz kayıt bulunmuyor.`,
          [{ text: 'Tamam' }]
        );
        return;
      }

      const logText = logs.slice(0, 5).map(log => {
        const date = new Date(log.taken_at).toLocaleDateString('tr-TR');
        const time = new Date(log.taken_at).toLocaleTimeString('tr-TR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        const statusText = log.status === 'on_time' ? 'Zamanında' :
                          log.status === 'late' ? `${log.minutes_difference} dk geç` :
                          `${Math.abs(log.minutes_difference)} dk erken`;
        return `${date} ${time} - ${statusText}`;
      }).join('\n');

      Alert.alert(
        `${pill.name} Geçmişi`,
        `Son ${Math.min(logs.length, 5)} kayıt:\n\n${logText}`,
        [{ text: 'Tamam' }]
      );
    } catch (error) {
      console.error('Error viewing pill logs:', error.message);
      Alert.alert('Hata', 'İlaç geçmişi yüklenirken bir hata oluştu.', [{ text: 'Tamam' }]);
    }
  };

  const handleDeletePill = async (pill) => {
    Alert.alert(
      'İlaç Sil',
      `${pill.name} ilacını ve tüm geçmişini silmek istediğinizden emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Sil', 
          style: 'destructive',
          onPress: () => performDeletePill(pill)
        }
      ]
    );
  };

  const performDeletePill = async (pill) => {
    try {
      await deletePill(pill.id);
      
      // Refresh all pills and stats
      await loadPills();
      
      console.log('Pill deleted:', pill.name);
    } catch (error) {
      console.error('Error deleting pill:', error.message);
      Alert.alert('Hata', 'İlaç silinirken bir hata oluştu.', [{ text: 'Tamam' }]);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Çıkış Yap',
      'Hesabınızdan çıkmak istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Çıkış Yap', 
          style: 'destructive',
          onPress: performSignOut
        }
      ]
    );
  };

  const performSignOut = async () => {
    try {
      setIsLoading(true);
      await signOut();
      console.log('User signed out successfully');
    } catch (error) {
      console.error('Sign out error:', error.message);
      Alert.alert('Hata', 'Çıkış yapılırken bir hata oluştu.', [{ text: 'Tamam' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePillAdded = async (newPill) => {
    console.log('New pill added, refreshing list...');
    await loadPills();
  };

  const getUserDisplayName = () => {
    if (user?.user_metadata?.first_name && user?.user_metadata?.last_name) {
      return `${user.user_metadata.first_name} ${user.user_metadata.last_name}`;
    }
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'Kullanıcı';
  };

  const getTodayDate = () => {
    const today = new Date();
    return today.toLocaleDateString('tr-TR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const sortPillsByTime = (pills) => {
    return pills.sort((a, b) => {
      const timeA = a.time || '00:00';
      const timeB = b.time || '00:00';
      return timeA.localeCompare(timeB);
    });
  };

  const renderPillItem = (pill) => (
    <View key={pill.id} style={styles.pillItem}>
      <View style={styles.pillInfo}>
        <View style={styles.pillHeader}>
          <Text style={styles.pillName}>{pill.name}</Text>
          <Text style={styles.pillTime}>{pill.time}</Text>
        </View>
        
        <View style={styles.pillActions}>
          <TouchableOpacity
            style={[
              styles.statusButton,
              pill.taken ? styles.statusButtonTaken : styles.statusButtonPending
            ]}
            onPress={() => pill.taken ? handlePillReset(pill) : handlePillTaken(pill)}
          >
            <Text style={[
              styles.statusButtonText,
              pill.taken ? styles.statusButtonTextTaken : styles.statusButtonTextPending
            ]}>
              {pill.taken ? '✓ Alındı' : '○ Al'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.logsButton}
            onPress={() => handleViewPillLogs(pill)}
          >
            <Text style={styles.logsButtonText}>📊</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeletePill(pill)}
          >
            <Text style={styles.deleteButtonText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" backgroundColor="#1a365d" />
      
      <ScrollView 
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.userInfo}>
              <Text style={styles.welcomeText}>Merhaba,</Text>
              <Text style={styles.userName}>{getUserDisplayName()}</Text>
              <Text style={styles.dateText}>{getTodayDate()}</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.settingsButton}
              onPress={handleSignOut}
            >
              <Text style={styles.settingsIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>
          
          {/* Stats Card */}
          <View style={styles.statsCard}>
            <View style={styles.statsItem}>
              <Text style={styles.statsNumber}>{stats.total}</Text>
              <Text style={styles.statsLabel}>Toplam İlaç</Text>
            </View>
            <View style={styles.statsItem}>
              <Text style={styles.statsNumber}>{stats.onTime}</Text>
              <Text style={styles.statsLabel}>Zamanında Alınan</Text>
            </View>
            <View style={styles.statsItem}>
              <Text style={styles.statsNumber}>{stats.late}</Text>
              <Text style={styles.statsLabel}>Geç Alınan</Text>
            </View>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Today's Schedule Header */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Bugünün Programı</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setShowAddPill(true)}
            >
              <Text style={styles.addButtonText}>+ İlaç Ekle</Text>
            </TouchableOpacity>
          </View>

          {/* Pills List */}
          <View style={styles.pillsList}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>İlaçlar yükleniyor...</Text>
              </View>
            ) : pills.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>💊</Text>
                <Text style={styles.emptyTitle}>Henüz İlaç Eklenmemiş</Text>
                <Text style={styles.emptyMessage}>
                  İlk ilacınızı eklemek için yukarıdaki "İlaç Ekle" butonuna tıklayın.
                </Text>
                <TouchableOpacity 
                  style={styles.emptyButton}
                  onPress={() => setShowAddPill(true)}
                >
                  <Text style={styles.emptyButtonText}>İlk İlacımı Ekle</Text>
                </TouchableOpacity>
              </View>
            ) : (
              sortPillsByTime(pills).map(renderPillItem)
            )}
          </View>
        </View>
      </ScrollView>

      {/* Add Pill Modal */}
      <AddPill 
        isVisible={showAddPill}
        onClose={() => setShowAddPill(false)}
        onPillAdded={handlePillAdded}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    backgroundColor: '#1a365d',
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  userInfo: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    color: '#cbd5e0',
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  settingsButton: {
    padding: 8,
  },
  settingsIcon: {
    fontSize: 24,
  },
  statsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statsItem: {
    alignItems: 'center',
  },
  statsNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  statsLabel: {
    fontSize: 12,
    color: '#cbd5e0',
    textAlign: 'center',
  },
  content: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  addButton: {
    backgroundColor: '#1a365d',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  pillsList: {
    marginBottom: 24,
  },
  pillItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pillInfo: {
    flex: 1,
  },
  pillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pillName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  pillTime: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  pillActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  statusButtonTaken: {
    backgroundColor: '#d1fae5',
  },
  statusButtonPending: {
    backgroundColor: '#fef3c7',
  },
  statusButtonText: {
    textAlign: 'center',
    fontWeight: '600',
  },
  statusButtonTextTaken: {
    color: '#059669',
  },
  statusButtonTextPending: {
    color: '#d97706',
  },
  logsButton: {
    padding: 8,
    marginRight: 4,
  },
  logsButtonText: {
    fontSize: 18,
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    fontSize: 18,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#1a365d',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
