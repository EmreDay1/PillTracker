import { supabase } from '../config/supabase';
import { supabaseAdmin } from '../config/supabaseAdmin';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Setup notification permissions and channels
const setupNotifications = async () => {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('pill-reminders', {
        name: 'Pill Reminders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.warn('Push notification permissions not granted');
        return false;
      }
      
      console.log('✅ Notification permissions granted');
      return true;
    } else {
      console.warn('Must use physical device for proper notifications');
      return false;
    }
  } catch (error) {
    console.error('Error setting up notifications:', error);
    return false;
  }
};

// Initialize notifications
export const initializeNotifications = async () => {
  const permissionsGranted = await setupNotifications();
  
  const notificationListener = Notifications.addNotificationReceivedListener(notification => {
    console.log('📱 Notification received:', notification.request.content.title);
  });

  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('📱 Notification tapped:', response.notification.request.content.data);
    
    const { pillId, pillName, type } = response.notification.request.content.data;
    
    if (type === 'daily_reminder') {
      console.log(`User tapped reminder for: ${pillName}`);
    }
  });

  return {
    permissionsGranted,
    cleanup: () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    }
  };
};

// Get user's pills
export const getUserPills = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('pills')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    console.log(`✅ Retrieved ${data?.length || 0} pills for user`);
    return data || [];
  } catch (error) {
    console.error('Get user pills failed:', error.message);
    throw error;
  }
};

// Schedule reliable notifications for a pill
const scheduleReliableNotification = async (pill) => {
  try {
    const [hour, minute] = pill.time.split(':').map(Number);
    
    console.log(`📅 Scheduling reliable notification for ${pill.name} at ${hour}:${minute}`);
    
    // Cancel any existing notifications for this pill
    await Notifications.cancelScheduledNotificationAsync(`pill_${pill.id}`);
    
    const now = new Date();
    const nextTime = new Date();
    nextTime.setHours(hour, minute, 0, 0);
    
    // If time has passed today, schedule for tomorrow
    if (nextTime <= now) {
      nextTime.setDate(nextTime.getDate() + 1);
    }
    
    console.log(`📅 Next notification: ${nextTime.toLocaleString()}`);
    
    // Schedule main notification
    const notificationId = await Notifications.scheduleNotificationAsync({
      identifier: `pill_${pill.id}`,
      content: {
        title: '💊 İlaç Zamanı!',
        body: `${pill.name} alma zamanı geldi`,
        sound: 'default',
        android: {
          channelId: 'pill-reminders',
          priority: 'max',
          sticky: false,
        },
        data: { 
          pillId: pill.id, 
          pillName: pill.name,
          scheduledTime: pill.time,
          type: 'daily_reminder'
        },
      },
      trigger: nextTime,
    });
    
    console.log(`✅ Notification scheduled: ${notificationId}`);
    
    // Schedule backup notification for next day
    const tomorrow = new Date(nextTime);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    await Notifications.scheduleNotificationAsync({
      identifier: `pill_${pill.id}_backup`,
      content: {
        title: '💊 İlaç Zamanı!',
        body: `${pill.name} alma zamanı geldi`,
        sound: 'default',
        android: {
          channelId: 'pill-reminders',
          priority: 'max',
        },
        data: { 
          pillId: pill.id, 
          pillName: pill.name,
          scheduledTime: pill.time,
          type: 'daily_reminder'
        },
      },
      trigger: tomorrow,
    });
    
    console.log(`✅ Backup notification scheduled for ${tomorrow.toLocaleString()}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Failed to schedule notification for ${pill.name}:`, error);
    return false;
  }
};

// Add a new pill
export const addPill = async (pillData) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Validate time format
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(pillData.time)) {
      throw new Error('Invalid time format');
    }

    const newPill = {
      user_id: user.id,
      name: pillData.name.trim(),
      time: pillData.time,
      taken: false,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('pills')
      .insert([newPill])
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log(`✅ Pill saved: ${data.name} at ${data.time}`);

    // Schedule notifications
    const notificationScheduled = await scheduleReliableNotification(data);
    
    if (!notificationScheduled) {
      console.warn('⚠️ Notification scheduling failed, but pill was saved');
    }

    return data;
    
  } catch (error) {
    console.error('Add pill failed:', error.message);
    throw error;
  }
};

// Get timing status for pill logs
const getTimingStatus = (scheduledTime, takenTime) => {
  const [schedHour, schedMin] = scheduledTime.split(':').map(Number);
  
  const scheduled = new Date();
  scheduled.setHours(schedHour, schedMin, 0, 0);
  
  const taken = new Date(takenTime);
  const diffMinutes = Math.round((taken - scheduled) / (1000 * 60));
  
  let status = 'on_time';
  if (diffMinutes > 10) status = 'late';
  else if (diffMinutes < -10) status = 'early';
  
  return { status, minutes: diffMinutes };
};

// Log when a pill is taken
export const logPillTaken = async (pillId, scheduledTime) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const takenAt = new Date().toISOString();
    const timing = getTimingStatus(scheduledTime, takenAt);

    const { data: logData, error } = await supabase
      .from('pill_logs')
      .insert([{
        pill_id: pillId,
        user_id: user.id,
        taken_at: takenAt,
        scheduled_time: scheduledTime,
        status: timing.status,
        minutes_difference: timing.minutes
      }])
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Show confirmation notification
    const statusText = timing.status === 'on_time' ? 'zamanında' : 
                     timing.status === 'late' ? `${timing.minutes} dk geç` : 
                     `${Math.abs(timing.minutes)} dk erken`;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '✅ İlaç Alındı',
        body: `${statusText} alındı`,
        sound: 'default',
        android: {
          channelId: 'pill-reminders',
        },
        data: { type: 'confirmation' }
      },
      trigger: null,
    });

    console.log(`✅ Pill taken logged: ${timing.status}`);
    return { logData, timing };
    
  } catch (error) {
    console.error('Log pill failed:', error.message);
    throw error;
  }
};

// Update pill status (taken/not taken)
export const updatePillStatus = async (pillId, taken, scheduledTime) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const updateData = {
      taken: taken,
      updated_at: new Date().toISOString()
    };

    if (taken) {
      updateData.taken_at = new Date().toISOString();
      
      // Log the pill taking if scheduled time is provided
      if (scheduledTime) {
        await logPillTaken(pillId, scheduledTime);
      }
    } else {
      updateData.taken_at = null;
    }

    const { data, error } = await supabase
      .from('pills')
      .update(updateData)
      .eq('id', pillId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log(`✅ Pill status updated: ${taken ? 'taken' : 'not taken'}`);
    return data;
    
  } catch (error) {
    console.error('Update pill status failed:', error.message);
    throw error;
  }
};

// Get pill logs for a specific pill
export const getPillLogs = async (pillId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('pill_logs')
      .select('*')
      .eq('pill_id', pillId)
      .eq('user_id', user.id)
      .order('taken_at', { ascending: false });

    if (error) {
      throw error;
    }

    console.log(`✅ Retrieved ${data?.length || 0} logs for pill`);
    return data || [];
  } catch (error) {
    console.error('Get pill logs failed:', error.message);
    throw error;
  }
};

// Delete a pill and its logs
export const deletePill = async (pillId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Cancel notifications
    await Notifications.cancelScheduledNotificationAsync(`pill_${pillId}`);
    await Notifications.cancelScheduledNotificationAsync(`pill_${pillId}_backup`);

    // Delete logs first (foreign key constraint)
    await supabase
      .from('pill_logs')
      .delete()
      .eq('pill_id', pillId)
      .eq('user_id', user.id);

    // Delete the pill
    const { error } = await supabase
      .from('pills')
      .delete()
      .eq('id', pillId)
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }

    console.log('✅ Pill deleted successfully');
    return true;
  } catch (error) {
    console.error('Delete pill failed:', error.message);
    throw error;
  }
};

// Reset all pills to not taken (daily reset)
export const resetDailyPills = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('pills')
      .update({ 
        taken: false,
        taken_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .select();

    if (error) {
      throw error;
    }

    console.log(`✅ Reset ${data?.length || 0} pills for new day`);
    return data || [];
  } catch (error) {
    console.error('Reset daily pills failed:', error.message);
    throw error;
  }
};

// Get today's pill schedule
export const getTodaySchedule = async () => {
  try {
    const pills = await getUserPills();
    
    // Sort by time
    return pills.sort((a, b) => {
      const timeA = a.time || '00:00';
      const timeB = b.time || '00:00';
      return timeA.localeCompare(timeB);
    });
  } catch (error) {
    console.error('Get today schedule failed:', error.message);
    throw error;
  }
};

// Get adherence statistics for current user
export const getAdherenceStats = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const pills = await getUserPills();
    const totalPills = pills.length;

    const today = new Date().toISOString().split('T')[0];
    
    const { data: logs } = await supabase
      .from('pill_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('taken_at', `${today}T00:00:00.000Z`)
      .lt('taken_at', `${today}T23:59:59.999Z`);

    const todayLogs = logs || [];
    const onTime = todayLogs.filter(log => log.status === 'on_time').length;
    const late = todayLogs.filter(log => log.status === 'late').length;
    const early = todayLogs.filter(log => log.status === 'early').length;
    const taken = onTime + late + early;
    const missed = totalPills - taken;
    const adherenceRate = totalPills > 0 ? Math.round((taken / totalPills) * 100) : 0;

    console.log(`✅ Adherence stats: ${adherenceRate}% (${taken}/${totalPills})`);

    return {
      total: totalPills,
      taken: taken,
      onTime: onTime,
      late: late,
      early: early,
      missed: missed,
      adherenceRate: adherenceRate
    };
  } catch (error) {
    console.error('Get adherence stats failed:', error.message);
    throw error;
  }
};

// ADMIN FUNCTIONS - Using service role key for full access

// Get all users and their statistics (ADMIN ONLY)
export const getAllUsersStats = async () => {
  try {
    console.log('🔍 Fetching all users with admin privileges...');
    
    // Method 1: Try to get all authenticated users with their metadata
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError) {
      console.log('❌ Admin listUsers failed:', usersError.message);
      console.log('📊 Using fallback method...');
      return await getUsersFromTablesWithRealNames();
    }
    
    console.log(`✅ Found ${users?.length || 0} authenticated users`);
    
    // Get all pills and logs with admin privileges
    const [pillsResult, logsResult] = await Promise.all([
      supabaseAdmin.from('pills').select('*'),
      supabaseAdmin.from('pill_logs').select('*')
    ]);
    
    const allPills = pillsResult.data || [];
    const allLogs = logsResult.data || [];
    
    console.log(`📊 Found ${allPills.length} pills and ${allLogs.length} logs`);
    
    return await processUsersDataWithRealNames(users || [], allPills, allLogs);
    
  } catch (error) {
    console.error('❌ Get all users stats failed:', error.message);
    return await getUsersFromTablesWithRealNames();
  }
};


const getUsersFromTablesWithRealNames = async () => {
  try {
    console.log('📊 Fallback: Getting users from pills/logs tables with real names...');
    
    // Get all data using admin client
    const [pillsResult, logsResult] = await Promise.all([
      supabaseAdmin.from('pills').select('*'),
      supabaseAdmin.from('pill_logs').select('*')
    ]);
    
    const allPills = pillsResult.data || [];
    const allLogs = logsResult.data || [];
    
    console.log(`📊 Fallback found ${allPills.length} pills and ${allLogs.length} logs`);
    
    if (!allPills.length && !allLogs.length) {
      console.log('⚠️ No data found - users might not have added pills yet');
      return [];
    }
    
    // Get unique user IDs
    const userIds = new Set();
    allPills.forEach(pill => userIds.add(pill.user_id));
    allLogs.forEach(log => userIds.add(log.user_id));
    
    console.log(`🔍 Found ${userIds.size} unique user IDs from data`);
    
    // Try to get real user data for each user ID
    const usersWithRealNames = [];
    
    for (const userId of userIds) {
      try {
        // Attempt to get user by ID using admin client
        const { data: userData, error } = await supabaseAdmin.auth.admin.getUserById(userId);
        
        if (!error && userData?.user) {
          console.log(`✅ Found real user data for ${userId.slice(0, 8)}: ${userData.user.email}`);
          usersWithRealNames.push(userData.user);
        } else {
          console.log(`⚠️ Could not get real data for user ${userId.slice(0, 8)}, using fallback`);
          // Create fallback user object
          usersWithRealNames.push({
            id: userId,
            email: `patient-${userId.slice(0, 8)}@app.com`,
            user_metadata: {
              first_name: 'Patient',
              last_name: userId.slice(0, 8),
              full_name: `Patient ${userId.slice(0, 8)}`
            }
          });
        }
      } catch (userError) {
        console.log(`❌ Error getting user ${userId.slice(0, 8)}:`, userError.message);
        // Create fallback user object
        usersWithRealNames.push({
          id: userId,
          email: `patient-${userId.slice(0, 8)}@app.com`,
          user_metadata: {
            first_name: 'Patient',
            last_name: userId.slice(0, 8),
            full_name: `Patient ${userId.slice(0, 8)}`
          }
        });
      }
    }
    
    return await processUsersDataWithRealNames(usersWithRealNames, allPills, allLogs);
    
  } catch (error) {
    console.error('❌ Enhanced fallback method failed:', error.message);
    return [];
  }
};


const processUsersDataWithRealNames = async (users, allPills, allLogs) => {
  try {
    console.log(`📊 Processing ${users.length} users with real names...`);
    
    const userStats = users.map(user => {
      const userPills = allPills.filter(pill => pill.user_id === user.id);
      const userLogs = allLogs.filter(log => log.user_id === user.id);
      
      const totalPills = userPills.length;
      const onTime = userLogs.filter(log => log.status === 'on_time').length;
      const late = userLogs.filter(log => log.status === 'late').length;
      const early = userLogs.filter(log => log.status === 'early').length;
      const taken = onTime + late + early;
      const adherenceRate = totalPills > 0 ? Math.round((taken / totalPills) * 100) : 0;

      // Enhanced name extraction with multiple fallbacks
      const extractUserName = (user) => {
        // Try various metadata fields
        const metadata = user.user_metadata || {};
        
        // Option 1: Use first_name + last_name
        if (metadata.first_name && metadata.last_name) {
          return {
            first_name: metadata.first_name,
            last_name: metadata.last_name,
            full_name: `${metadata.first_name} ${metadata.last_name}`,
            email: user.email || 'No email'
          };
        }
        
        // Option 2: Use full_name if available
        if (metadata.full_name) {
          const nameParts = metadata.full_name.split(' ');
          return {
            first_name: nameParts[0] || 'User',
            last_name: nameParts.slice(1).join(' ') || '',
            full_name: metadata.full_name,
            email: user.email || 'No email'
          };
        }
        
        // Option 3: Extract from email
        if (user.email && user.email.includes('@')) {
          const emailPart = user.email.split('@')[0];
          const nameParts = emailPart.split(/[._-]/);
          
          if (nameParts.length >= 2) {
            return {
              first_name: nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1),
              last_name: nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1),
              full_name: `${nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1)} ${nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1)}`,
              email: user.email
            };
          } else {
            return {
              first_name: emailPart.charAt(0).toUpperCase() + emailPart.slice(1),
              last_name: '',
              full_name: emailPart.charAt(0).toUpperCase() + emailPart.slice(1),
              email: user.email
            };
          }
        }
        
        // Option 4: Use user ID as last resort
        return {
          first_name: 'User',
          last_name: user.id.slice(0, 8),
          full_name: `User ${user.id.slice(0, 8)}`,
          email: user.email || `user-${user.id.slice(0, 8)}@app.com`
        };
      };

      const nameData = extractUserName(user);
      
      console.log(`👤 User ${user.id.slice(0, 8)}: ${nameData.full_name} (${nameData.email})`);

      return {
        id: user.id,
        email: nameData.email,
        first_name: nameData.first_name,
        last_name: nameData.last_name,
        full_name: nameData.full_name,
        total: totalPills,
        taken: taken,
        onTime: onTime,
        late: late,
        early: early,
        missed: Math.max(0, totalPills - taken),
        adherenceRate: adherenceRate
      };
    });
    
    const sortedStats = userStats.sort((a, b) => b.total - a.total);
    console.log(`✅ Successfully processed ${sortedStats.length} user stats with real names`);
    
    // Log summary of names found
    sortedStats.forEach(user => {
      console.log(`📋 ${user.full_name} - ${user.total} pills, ${user.adherenceRate}% adherence`);
    });
    
    return sortedStats;
    
  } catch (error) {
    console.error('❌ Process users data with real names failed:', error.message);
    return [];
  }
};

// Fallback method when admin.listUsers() fails
const getUsersFromTables = async () => {
  try {
    console.log('📊 Fallback: Getting users from pills/logs tables...');
    
    // Get all data using admin client
    const [pillsResult, logsResult] = await Promise.all([
      supabaseAdmin.from('pills').select('*'),
      supabaseAdmin.from('pill_logs').select('*')
    ]);
    
    const allPills = pillsResult.data || [];
    const allLogs = logsResult.data || [];
    
    console.log(`📊 Fallback found ${allPills.length} pills and ${allLogs.length} logs`);
    
    if (!allPills.length && !allLogs.length) {
      console.log('⚠️ No data found - users might not have added pills yet');
      return [];
    }
    
    // Get unique user IDs
    const userIds = new Set();
    allPills.forEach(pill => userIds.add(pill.user_id));
    allLogs.forEach(log => userIds.add(log.user_id));
    
    console.log(`🔍 Found ${userIds.size} unique user IDs from data`);
    
    // Create mock user objects for users found in data
    const mockUsers = Array.from(userIds).map(userId => ({
      id: userId,
      email: `patient-${userId.slice(0, 8)}@app.com`,
      user_metadata: {
        first_name: 'Patient',
        last_name: userId.slice(0, 8),
        full_name: `Patient ${userId.slice(0, 8)}`
      }
    }));
    
    return await processUsersData(mockUsers, allPills, allLogs);
    
  } catch (error) {
    console.error('❌ Fallback method failed:', error.message);
    return [];
  }
};

// Process users data for admin statistics
const processUsersData = async (users, allPills, allLogs) => {
  try {
    console.log(`📊 Processing ${users.length} users with ${allPills.length} pills and ${allLogs.length} logs`);
    
    const userStats = users.map(user => {
      const userPills = allPills.filter(pill => pill.user_id === user.id);
      const userLogs = allLogs.filter(log => log.user_id === user.id);
      
      const totalPills = userPills.length;
      const onTime = userLogs.filter(log => log.status === 'on_time').length;
      const late = userLogs.filter(log => log.status === 'late').length;
      const early = userLogs.filter(log => log.status === 'early').length;
      const taken = onTime + late + early;
      const adherenceRate = totalPills > 0 ? Math.round((taken / totalPills) * 100) : 0;

      return {
        id: user.id,
        email: user.email || `patient-${user.id.slice(0, 8)}@app.com`,
        first_name: user.user_metadata?.first_name || 'Patient',
        last_name: user.user_metadata?.last_name || user.id.slice(0, 8),
        full_name: user.user_metadata?.full_name || `Patient ${user.id.slice(0, 8)}`,
        total: totalPills,
        taken: taken,
        onTime: onTime,
        late: late,
        early: early,
        missed: Math.max(0, totalPills - taken),
        adherenceRate: adherenceRate
      };
    });
    
    const sortedStats = userStats.sort((a, b) => b.total - a.total);
    console.log(`✅ Successfully processed ${sortedStats.length} user stats`);
    
    return sortedStats;
    
  } catch (error) {
    console.error('❌ Process users data failed:', error.message);
    return [];
  }
};


export const getAllUsersLogs = async () => {
  try {
    console.log('🔍 Fetching all user logs with real names...');
    
    const { data: logs, error } = await supabaseAdmin
      .from('pill_logs')
      .select(`
        *,
        pills (name)
      `)
      .order('taken_at', { ascending: false });

    if (error) {
      console.error('❌ Logs fetch error:', error);
      throw error;
    }

    console.log(`✅ Found ${logs?.length || 0} logs`);

    // Get unique user IDs from logs
    const uniqueUserIds = [...new Set(logs?.map(log => log.user_id) || [])];
    console.log(`🔍 Need to get names for ${uniqueUserIds.length} users`);
    
    // Get real user data for each user ID
    const userNamesMap = new Map();
    
    for (const userId of uniqueUserIds) {
      try {
        const { data: userData, error } = await supabaseAdmin.auth.admin.getUserById(userId);
        
        if (!error && userData?.user) {
          const user = userData.user;
          const metadata = user.user_metadata || {};
          
          let displayName = 'Unknown User';
          let email = user.email || 'No email';
          
          // Extract real name
          if (metadata.first_name && metadata.last_name) {
            displayName = `${metadata.first_name} ${metadata.last_name}`;
          } else if (metadata.full_name) {
            displayName = metadata.full_name;
          } else if (user.email) {
            const emailPart = user.email.split('@')[0];
            displayName = emailPart.charAt(0).toUpperCase() + emailPart.slice(1);
          }
          
          userNamesMap.set(userId, {
            full_name: displayName,
            email: email,
            first_name: metadata.first_name || displayName.split(' ')[0],
            last_name: metadata.last_name || displayName.split(' ').slice(1).join(' ')
          });
          
          console.log(`✅ Got real name for ${userId.slice(0, 8)}: ${displayName}`);
        } else {
          // Fallback for missing user data
          userNamesMap.set(userId, {
            full_name: `User ${userId.slice(0, 8)}`,
            email: `user-${userId.slice(0, 8)}@app.com`,
            first_name: 'User',
            last_name: userId.slice(0, 8)
          });
          console.log(`⚠️ Using fallback name for ${userId.slice(0, 8)}`);
        }
      } catch (userError) {
        console.log(`❌ Error getting user ${userId.slice(0, 8)}:`, userError.message);
        userNamesMap.set(userId, {
          full_name: `User ${userId.slice(0, 8)}`,
          email: `user-${userId.slice(0, 8)}@app.com`,
          first_name: 'User',
          last_name: userId.slice(0, 8)
        });
      }
    }

    // Enhance logs with real user info
    const logsWithRealUserInfo = (logs || []).map(log => {
      const userInfo = userNamesMap.get(log.user_id) || {
        full_name: `User ${log.user_id.slice(0, 8)}`,
        email: `user-${log.user_id.slice(0, 8)}@app.com`,
        first_name: 'User',
        last_name: log.user_id.slice(0, 8)
      };
      
      return {
        ...log,
        email: userInfo.email,
        first_name: userInfo.first_name,
        last_name: userInfo.last_name,
        full_name: userInfo.full_name,
        pill_name: log.pills?.name || 'Unknown Pill'
      };
    });
    
    console.log(`✅ Enhanced ${logsWithRealUserInfo.length} logs with real user names`);
    return logsWithRealUserInfo;
  } catch (error) {
    console.error('❌ Get all users logs with real names failed:', error.message);
    throw error;
  }
};


// Get all user pills (ADMIN ONLY)
export const getAllUsersPills = async () => {
  try {
    console.log('🔍 Fetching all user pills with real names...');
    
    const { data: pills, error } = await supabaseAdmin
      .from('pills')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Pills fetch error:', error);
      throw error;
    }

    console.log(`✅ Found ${pills?.length || 0} pills`);

    // Get unique user IDs from pills
    const uniqueUserIds = [...new Set(pills?.map(pill => pill.user_id) || [])];
    console.log(`🔍 Need to get names for ${uniqueUserIds.length} users`);
    
    // Get real user data for each user ID
    const userNamesMap = new Map();
    
    for (const userId of uniqueUserIds) {
      try {
        const { data: userData, error } = await supabaseAdmin.auth.admin.getUserById(userId);
        
        if (!error && userData?.user) {
          const user = userData.user;
          const metadata = user.user_metadata || {};
          
          let displayName = 'Unknown User';
          let email = user.email || 'No email';
          
          // Extract real name
          if (metadata.first_name && metadata.last_name) {
            displayName = `${metadata.first_name} ${metadata.last_name}`;
          } else if (metadata.full_name) {
            displayName = metadata.full_name;
          } else if (user.email) {
            const emailPart = user.email.split('@')[0];
            displayName = emailPart.charAt(0).toUpperCase() + emailPart.slice(1);
          }
          
          userNamesMap.set(userId, {
            full_name: displayName,
            email: email,
            first_name: metadata.first_name || displayName.split(' ')[0],
            last_name: metadata.last_name || displayName.split(' ').slice(1).join(' ')
          });
          
          console.log(`✅ Got real name for ${userId.slice(0, 8)}: ${displayName}`);
        } else {
          // Fallback for missing user data
          userNamesMap.set(userId, {
            full_name: `User ${userId.slice(0, 8)}`,
            email: `user-${userId.slice(0, 8)}@app.com`,
            first_name: 'User',
            last_name: userId.slice(0, 8)
          });
          console.log(`⚠️ Using fallback name for ${userId.slice(0, 8)}`);
        }
      } catch (userError) {
        console.log(`❌ Error getting user ${userId.slice(0, 8)}:`, userError.message);
        userNamesMap.set(userId, {
          full_name: `User ${userId.slice(0, 8)}`,
          email: `user-${userId.slice(0, 8)}@app.com`,
          first_name: 'User',
          last_name: userId.slice(0, 8)
        });
      }
    }

    // Enhance pills with real user info
    const pillsWithRealUserInfo = (pills || []).map(pill => {
      const userInfo = userNamesMap.get(pill.user_id) || {
        full_name: `User ${pill.user_id.slice(0, 8)}`,
        email: `user-${pill.user_id.slice(0, 8)}@app.com`,
        first_name: 'User',
        last_name: pill.user_id.slice(0, 8)
      };
      
      return {
        ...pill,
        email: userInfo.email,
        first_name: userInfo.first_name,
        last_name: userInfo.last_name,
        full_name: userInfo.full_name
      };
    });
    
    console.log(`✅ Enhanced ${pillsWithRealUserInfo.length} pills with real user names`);
    return pillsWithRealUserInfo;
  } catch (error) {
    console.error('❌ Get all users pills with real names failed:', error.message);
    throw error;
  }
};// Debug notifications
export const debugNotifications = async () => {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log('📋 Scheduled notifications:', scheduled.length);
    
    scheduled.forEach((notif, index) => {
      console.log(`${index + 1}. ${notif.identifier}: ${notif.content.title}`);
      console.log(`   Trigger:`, notif.trigger);
    });
    
    return scheduled;
  } catch (error) {
    console.error('Debug notifications failed:', error.message);
    return [];
  }
};

// Export all functions
export default {
  initializeNotifications,
  getUserPills,
  addPill,
  updatePillStatus,
  deletePill,
  resetDailyPills,
  getTodaySchedule,
  getAdherenceStats,
  logPillTaken,
  getPillLogs,
  debugNotifications,
  getAllUsersStats,
  getAllUsersLogs,
  getAllUsersPills,
};
