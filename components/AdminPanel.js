import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView,
  ScrollView,
  Alert,
  RefreshControl,
  Modal
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { getAllUsersStats, getAllUsersLogs, getAllUsersPills } from '../services/pills';

export default function AdminPanel({ onBackToSignIn }) {
  const [allStats, setAllStats] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [allPills, setAllPills] = useState([]);
  const [consolidatedData, setConsolidatedData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientModal, setShowPatientModal] = useState(false);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      setIsLoading(true);
      
      const [pills, logs] = await Promise.all([
        getAllUsersPills(),
        getAllUsersLogs()
      ]);
      
      setAllPills(pills);
      setAllLogs(logs);
      
      const consolidatedPatientData = consolidatePatientData(pills, logs);
      setConsolidatedData(consolidatedPatientData);
      
      console.log('Admin data loaded successfully - Patients:', consolidatedPatientData.length);
    } catch (error) {
      console.error('Error loading admin data:', error.message);
      Alert.alert('Hata', 'Veriler yüklenirken bir hata oluştu.', [{ text: 'Tamam' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const consolidatePatientData = (pills, logs) => {
    const patientMap = new Map();

    pills.forEach(pill => {
      const userId = pill.user_id;
      if (!patientMap.has(userId)) {
        patientMap.set(userId, {
          id: userId,
          email: pill.email || `Patient-${userId.slice(0, 8)}`,
          first_name: pill.first_name || '',
          last_name: pill.last_name || '',
          full_name: pill.full_name || `Patient ${userId.slice(0, 8)}`,
          pills: [],
          logs: [],
          stats: {
            total: 0,
            taken: 0,
            onTime: 0,
            late: 0,
            early: 0,
            missed: 0,
            adherenceRate: 0
          }
        });
      }
      
      patientMap.get(userId).pills.push(pill);
    });

    logs.forEach(log => {
      const userId = log.user_id;
      if (patientMap.has(userId)) {
        patientMap.get(userId).logs.push(log);
      }
    });

    const consolidatedData = Array.from(patientMap.values()).map(patient => {
      const totalPills = patient.pills.length;
      const patientLogs = patient.logs;
      const onTime = patientLogs.filter(log => log.status === 'on_time').length;
      const late = patientLogs.filter(log => log.status === 'late').length;
      const early = patientLogs.filter(log => log.status === 'early').length;
      const taken = onTime + late + early;
      const missed = totalPills - taken;
      const adherenceRate = totalPills > 0 ? Math.round((taken / totalPills) * 100) : 0;

      patient.stats = {
        total: totalPills,
        taken: taken,
        onTime: onTime,
        late: late,
        early: early,
        missed: missed,
        adherenceRate: adherenceRate
      };

      return patient;
    });

    return consolidatedData.sort((a, b) => b.stats.total - a.stats.total);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAdminData();
    setIsRefreshing(false);
  };

  const handleSignOut = () => {
    Alert.alert(
      'Çıkış Yap',
      'Admin panelinden çıkmak istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Çıkış Yap', 
          style: 'destructive',
          onPress: () => {
            console.log('Admin signed out');
            if (onBackToSignIn && typeof onBackToSignIn === 'function') {
              onBackToSignIn();
            }
          }
        }
      ]
    );
  };

  const showPatientDetails = (patient) => {
    setSelectedPatient(patient);
    setShowPatientModal(true);
  };

  const getUserDisplayName = (patient) => {
    if (patient.first_name && patient.last_name) {
      return `${patient.first_name} ${patient.last_name}`;
    }
    if (patient.full_name) {
      return patient.full_name;
    }
    if (patient.email && patient.email.includes('@')) {
      return patient.email.split('@')[0];
    }
    return patient.email || 'Bilinmeyen Hasta';
  };

  const renderStatsGraph = (stats) => {
    const maxValue = Math.max(stats.total, 1);
    const totalWidth = 200;
    
    return (
      <View style={styles.graphContainer}>
        <View style={styles.graphRow}>
          <Text style={styles.graphLabel}>Toplam İlaç</Text>
          <View style={styles.barContainer}>
            <View style={[styles.barTotal, { width: (stats.total / maxValue) * totalWidth }]}>
              <Text style={styles.barText}>{stats.total}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.graphRow}>
          <Text style={styles.graphLabel}>Zamanında</Text>
          <View style={styles.barContainer}>
            <View style={[styles.barOnTime, { width: (stats.onTime / maxValue) * totalWidth }]}>
              <Text style={styles.barText}>{stats.onTime}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.graphRow}>
          <Text style={styles.graphLabel}>Geç Alınan</Text>
          <View style={styles.barContainer}>
            <View style={[styles.barLate, { width: (stats.late / maxValue) * totalWidth }]}>
              <Text style={styles.barText}>{stats.late}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderPatientCard = (patient, index) => (
    <TouchableOpacity 
      key={patient.id} 
      style={styles.patientCard}
      onPress={() => showPatientDetails(patient)}
    >
      <View style={styles.patientHeader}>
        <View style={styles.patientInfo}>
          <Text style={styles.patientName}>{getUserDisplayName(patient)}</Text>
          <Text style={styles.patientEmail}>{patient.email}</Text>
          <Text style={styles.patientId}>ID: {patient.id.slice(0, 8)}...</Text>
        </View>
        
        <View style={styles.adherenceSection}>
          <Text style={[
            styles.adherenceRate,
            patient.stats.adherenceRate >= 80 ? styles.adherenceGood :
            patient.stats.adherenceRate >= 60 ? styles.adherenceWarning : styles.adherencePoor
          ]}>
            {patient.stats.adherenceRate}%
          </Text>
          <Text style={styles.adherenceLabel}>Uyum Oranı</Text>
        </View>
      </View>

      {renderStatsGraph(patient.stats)}

      <View style={styles.pillsList}>
        <Text style={styles.pillsTitle}>İlaçları ({patient.pills.length}):</Text>
        {patient.pills.slice(0, 3).map((pill, pillIndex) => (
          <View key={pill.id} style={styles.pillItem}>
            <Text style={styles.pillName}>{pill.name}</Text>
            <Text style={styles.pillTime}>{pill.time}</Text>
            <View style={[
              styles.pillStatus,
              pill.taken ? styles.pillTaken : styles.pillPending
            ]}>
              <Text style={styles.pillStatusText}>
                {pill.taken ? '✓' : '○'}
              </Text>
            </View>
          </View>
        ))}
        {patient.pills.length > 3 && (
          <Text style={styles.morePills}>+{patient.pills.length - 3} daha fazla</Text>
        )}
      </View>

      <View style={styles.quickStats}>
        <View style={styles.quickStatItem}>
          <Text style={styles.quickStatNumber}>{patient.stats.taken}</Text>
          <Text style={styles.quickStatLabel}>Alınan</Text>
        </View>
        <View style={styles.quickStatItem}>
          <Text style={styles.quickStatNumber}>{patient.stats.missed}</Text>
          <Text style={styles.quickStatLabel}>Kaçırılan</Text>
        </View>
        <View style={styles.quickStatItem}>
          <Text style={styles.quickStatNumber}>{patient.logs.length}</Text>
          <Text style={styles.quickStatLabel}>Toplam Kayıt</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" backgroundColor="#dc2626" />
      
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.welcomeText}>Admin Panel</Text>
            <Text style={styles.adminName}>Hasta İzleme Sistemi</Text>
            <Text style={styles.patientCount}>{consolidatedData.length} hasta kayıtlı</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
            <Text style={styles.signOutIcon}>🚪</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Hasta verileri yükleniyor...</Text>
          </View>
        ) : consolidatedData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>Hasta Bulunamadı</Text>
            <Text style={styles.emptyText}>Henüz sistemde kayıtlı hasta bulunmuyor.</Text>
          </View>
        ) : (
          <View style={styles.patientsContainer}>
            {consolidatedData.map(renderPatientCard)}
          </View>
        )}
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={showPatientModal}
        onRequestClose={() => setShowPatientModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedPatient && (
              <>
                <Text style={styles.modalTitle}>Hasta Detayları</Text>
                <Text style={styles.modalPatientName}>{getUserDisplayName(selectedPatient)}</Text>
                <Text style={styles.modalPatientEmail}>{selectedPatient.email}</Text>
                
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Tüm İlaçları:</Text>
                  <ScrollView style={styles.modalPillsList} nestedScrollEnabled>
                    {selectedPatient.pills.map((pill, index) => (
                      <View key={pill.id} style={styles.modalPillItem}>
                        <View style={styles.modalPillInfo}>
                          <Text style={styles.modalPillName}>{pill.name}</Text>
                          <Text style={styles.modalPillTime}>{pill.time}</Text>
                        </View>
                        <View style={[
                          styles.modalPillStatus,
                          pill.taken ? styles.pillTaken : styles.pillPending
                        ]}>
                          <Text style={styles.pillStatusText}>
                            {pill.taken ? '✓ Alındı' : '○ Bekliyor'}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Son Kayıtlar:</Text>
                  <ScrollView style={styles.modalLogsList} nestedScrollEnabled>
                    {selectedPatient.logs.slice(0, 5).map((log, index) => (
                      <View key={index} style={styles.modalLogItem}>
                        <Text style={styles.modalLogPill}>{log.pill_name}</Text>
                        <Text style={styles.modalLogDate}>
                          {new Date(log.taken_at).toLocaleDateString('tr-TR')} - {' '}
                          {new Date(log.taken_at).toLocaleTimeString('tr-TR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </Text>
                        <View style={[
                          styles.modalStatusBadge,
                          log.status === 'on_time' ? styles.statusOnTime :
                          log.status === 'late' ? styles.statusLate : styles.statusEarly
                        ]}>
                          <Text style={styles.statusText}>
                            {log.status === 'on_time' ? 'Zamanında' :
                             log.status === 'late' ? `${log.minutes_difference} dk geç` :
                             `${Math.abs(log.minutes_difference)} dk erken`}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                </View>
                
                <TouchableOpacity 
                  style={styles.modalCloseButton}
                  onPress={() => setShowPatientModal(false)}
                >
                  <Text style={styles.modalCloseText}>Kapat</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    backgroundColor: '#dc2626',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 16,
    color: '#fecaca',
    marginBottom: 4,
  },
  adminName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  patientCount: {
    fontSize: 14,
    color: '#fecaca',
  },
  signOutButton: {
    padding: 8,
  },
  signOutIcon: {
    fontSize: 24,
  },
  content: {
    flex: 1,
    padding: 20,
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
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  patientsContainer: {
    gap: 16,
  },
  patientCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  patientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  patientInfo: {
    flex: 1,
    marginRight: 16,
  },
  patientName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  patientEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  patientId: {
    fontSize: 12,
    color: '#9ca3af',
    fontFamily: 'monospace',
  },
  adherenceSection: {
    alignItems: 'center',
    minWidth: 80,
  },
  adherenceRate: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  adherenceGood: {
    color: '#059669',
  },
  adherenceWarning: {
    color: '#d97706',
  },
  adherencePoor: {
    color: '#dc2626',
  },
  adherenceLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  graphContainer: {
    marginBottom: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
  },
  graphRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  graphLabel: {
    fontSize: 14,
    color: '#374151',
    width: 90,
    fontWeight: '500',
  },
  barContainer: {
    flex: 1,
    height: 24,
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    justifyContent: 'center',
  },
  barTotal: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    height: '100%',
    justifyContent: 'center',
    minWidth: 30,
  },
  barOnTime: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    height: '100%',
    justifyContent: 'center',
    minWidth: 30,
  },
  barLate: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    height: '100%',
    justifyContent: 'center',
    minWidth: 30,
  },
  barText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  pillsList: {
    marginBottom: 16,
  },
  pillsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  pillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    marginBottom: 4,
  },
  pillName: {
    flex: 1,
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  pillTime: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: 8,
  },
  pillStatus: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillTaken: {
    backgroundColor: '#d1fae5',
  },
  pillPending: {
    backgroundColor: '#fef3c7',
  },
  pillStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  morePills: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
  },
  quickStatItem: {
    alignItems: 'center',
  },
  quickStatNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    maxWidth: 360,
    maxHeight: '80%',
    width: '90%',
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
    fontSize: 22,
    fontWeight: 'bold',
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalPatientName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalPatientEmail: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  modalPillsList: {
    maxHeight: 120,
  },
  modalPillItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 4,
  },
  modalPillInfo: {
    flex: 1,
    marginRight: 8,
  },
  modalPillName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  modalPillTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  modalPillStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  modalLogsList: {
    maxHeight: 120,
  },
  modalLogItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 4,
  },
  modalLogPill: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  modalLogDate: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  modalStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusOnTime: {
    backgroundColor: '#d1fae5',
  },
  statusLate: {
    backgroundColor: '#fee2e2',
  },
  statusEarly: {
    backgroundColor: '#dbeafe',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalCloseButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    alignSelf: 'center',
  },
  modalCloseText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
