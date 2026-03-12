
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize } from '../../constants/theme';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../utils/supabase';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { injectSimulatedSOS } from '../../utils/bluetoothSOS';

interface Post {
  id: string;
  category: string;
  description: string;
  location_addr: string;
  latitude?: number;
  longitude?: number;
  media_url?: string;
  user_name: string;
  user_email: string;
  created_at: string;
  reactions: number;
  comments: number;
  status: 'pending' | 'approved' | 'rejected';
  is_own?: boolean;
}

const CATEGORIES = ['Harassment', 'Unsafe Area', 'Driver Behavior', 'Street Lighting', 'Positive Story', 'Other'];

export default function CommunityScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  
  // Create post states
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [location, setLocation] = useState('');
  const [coords, setCoords] = useState<{lat: number; lng: number} | null>(null);
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [isGuardian, setIsGuardian] = useState(false);
  const [activeAlertCount, setActiveAlertCount] = useState(0);

  useEffect(() => {
    loadPosts();
    checkGuardianStatus();
    loadActiveAlertCount();
  }, []);

  const checkGuardianStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('is_guardian').eq('id', user.id).single();
      if (data) setIsGuardian(data.is_guardian);
    }
  };

  const loadActiveAlertCount = async () => {
    const { count } = await supabase
      .from('emergency_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');
    setActiveAlertCount(count || 0);
  };

  const simulateNearbySignal = async () => {
    // Injects into the Radar list
    injectSimulatedSOS('Community Member (Test)');

    Notifications.scheduleNotificationAsync({
      content: {
        title: "🚨 NEARBY OFFLINE SOS DETECTED!",
        body: `A help signal was found via Bluetooth from Community Member (Test) very close to you.`,
        data: { type: 'BLE_SOS', name: 'Community Member (Test)', rssi: -45 },
        sound: 'alert.wav',
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: null,
    });
    Alert.alert("Test Started", "The offline SOS simulation has been triggered. Look for the overlay!");
  };

  const loadPosts = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Fetch: (approved posts) OR (my own posts)
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .or(`status.eq.approved,user_id.eq.${user?.id}`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading posts:', error);
      }

      if (data) {
        setPosts(data.map((d: any) => ({
          id: d.id,
          category: d.category,
          description: d.description,
          location_addr: d.location_addr,
          latitude: d.latitude,
          longitude: d.longitude,
          media_url: d.media_url,
          user_name: d.user_name || 'Anonymous',
          user_email: d.user_email,
          created_at: d.created_at,
          reactions: d.reactions || 0,
          comments: d.comments || 0,
          status: d.status, // Preserve status for badge
          is_own: d.user_id === user?.id
        })));
      }
    } catch (e) {
      console.error('Error loading posts:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Allow location access to tag your post.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      const [rev] = await Location.reverseGeocodeAsync({ 
        latitude: loc.coords.latitude, 
        longitude: loc.coords.longitude 
      });
      if (rev) setLocation(`${rev.name || ''} ${rev.street || ''}, ${rev.city || ''}`);
    } catch (e) {
      Alert.alert('Error', 'Failed to fetch location.');
    }
  };

  const pickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Allow media access to add photos/videos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setMediaUri(result.assets[0].uri);
    }
  };

  const handlePost = async () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Please add a description');
      return;
    }

    setPosting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      let uploadedUrl = null;
      if (mediaUri) {
        console.log('[Community] Uploading media:', mediaUri);
        const fileName = `${user?.id}/${Date.now()}.jpg`;
        
        // Use FormData for robust React Native uploads
        const formData = new FormData();
        formData.append('file', {
          uri: mediaUri,
          name: fileName,
          type: 'image/jpeg'
        } as any);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('complaints')
          .upload(fileName, formData);

        if (uploadError) {
          console.error('[Community] Upload error:', uploadError);
          throw new Error('Failed to upload image');
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('complaints')
          .getPublicUrl(fileName);
        
        uploadedUrl = publicUrl;
        console.log('[Community] Uploaded success:', uploadedUrl);
      }

      const { error } = await supabase.from('complaints').insert([{
        category,
        description,
        location_addr: location || 'Not specified',
        latitude: coords?.lat,
        longitude: coords?.lng,
        media_url: uploadedUrl,
        status: 'pending',
        user_id: user?.id,
        user_email: user?.email,
        user_name: profile?.full_name || 'Anonymous',
        user_phone: profile?.phone_number
      }]);

      if (error) {
        console.error('Post error:', error);
        if (error.message.includes('column')) {
          Alert.alert(
            'Database Setup Required',
            'Please run the database migration first. Check DATABASE_SETUP_GUIDE.md in your project folder.',
            [{ text: 'OK' }]
          );
        } else {
          throw error;
        }
        return;
      }

      Alert.alert('Posted!', 'Your post has been shared with the community and reported to admins.');
      setDescription('');
      setCategory(CATEGORIES[0]);
      setLocation('');
      setCoords(null);
      setMediaUri(null);
      setShowCreatePost(false);
      loadPosts();
    } catch (e) {
      console.error('Post error:', e);
      Alert.alert('Error', 'Failed to post. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const handleReaction = async (postId: string) => {
    // Placeholder for reaction functionality
    Alert.alert('Coming Soon', 'Reaction feature will be available soon!');
  };

  if (showCreatePost) {
    return (
      <View style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => setShowCreatePost(false)}>
            <Ionicons name="close" size={28} color={Colors.text} />
          </TouchableOpacity>
          <Text style={s.title}>Create Post</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView style={s.createForm} contentContainerStyle={{ padding: Spacing.lg }}>
          <Text style={s.label}>Category</Text>
          <View style={s.categories}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[s.catBtn, category === cat && s.catBtnActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[s.catText, category === cat && s.catTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.label}>What's happening?</Text>
          <TextInput
            style={s.textArea}
            placeholder="Share your experience or report an incident..."
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={6}
            value={description}
            onChangeText={setDescription}
          />

          <Text style={s.label}>Add Media (Optional)</Text>
          <TouchableOpacity style={s.mediaBtn} onPress={pickMedia}>
            <Ionicons name="image" size={24} color={Colors.accent} />
            <Text style={s.mediaBtnText}>
              {mediaUri ? 'Media Added ✓' : 'Add Photo/Video'}
            </Text>
          </TouchableOpacity>

          {mediaUri && (
            <View style={s.mediaPreview}>
              <Image source={{ uri: mediaUri }} style={s.mediaImage} />
              <TouchableOpacity 
                style={s.removeMedia} 
                onPress={() => setMediaUri(null)}
              >
                <Ionicons name="close-circle" size={24} color={Colors.sos} />
              </TouchableOpacity>
            </View>
          )}

          <Text style={s.label}>Location</Text>
          <View style={s.locRow}>
            <TextInput
              style={[s.input, { flex: 1 }]}
              placeholder="Add location..."
              placeholderTextColor={Colors.textMuted}
              value={location}
              onChangeText={setLocation}
            />
            <TouchableOpacity style={s.locBtn} onPress={getCurrentLocation}>
              <Ionicons name="location" size={20} color={Colors.white} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[s.postBtn, posting && s.postBtnDisabled]} 
            onPress={handlePost}
            disabled={posting}
          >
            {posting ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <Ionicons name="send" size={20} color={Colors.white} />
                <Text style={s.postBtnText}>Post & Report</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Community</Text>
        <TouchableOpacity 
          style={s.createBtn} 
          onPress={() => setShowCreatePost(true)}
        >
          <Ionicons name="add-circle" size={28} color={Colors.sos} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.feed}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => { 
              setRefreshing(true); 
              loadPosts(); 
              loadActiveAlertCount();
            }} 
            tintColor={Colors.sos}
          />
        }
      >
        {isGuardian && (
          <TouchableOpacity 
            style={s.guardianBanner}
            onPress={() => router.push('/active-alerts')}
          >
            <View style={s.guardianIcon}>
              <Ionicons name="shield-half" size={24} color={Colors.white} />
            </View>
            <View style={s.guardianInfo}>
              <Text style={s.guardianTitle}>Guardian Dashboard</Text>
              <Text style={s.guardianSub}>
                {activeAlertCount > 0 
                  ? `🚨 ${activeAlertCount} active help request(s) nearby!` 
                  : 'System active: Monitoring for emergencies...'}
              </Text>
            </View>
            {activeAlertCount > 0 && (
              <View style={s.alertBadge}>
                <Text style={s.alertBadgeText}>{activeAlertCount}</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={20} color={Colors.white} style={{ opacity: 0.7 }} />
            
            <TouchableOpacity 
              style={s.bannerSimBtn} 
              onPress={(e) => {
                e.stopPropagation();
                simulateNearbySignal();
              }}
            >
              <Ionicons name="flask" size={16} color={Colors.white} />
              <Text style={s.bannerSimText}>TEST</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {loading && posts.length === 0 ? (
          <View style={s.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.sos} />
            <Text style={s.loadingText}>Loading community posts...</Text>
          </View>
        ) : posts.length === 0 ? (
          <View style={s.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={Colors.textMuted} />
            <Text style={s.emptyText}>No posts yet</Text>
            <Text style={s.emptySubtext}>Be the first to share!</Text>
          </View>
        ) : (
          posts.map(post => (
            <View key={post.id} style={s.postCard}>
              <View style={s.postHeader}>
                <View style={s.avatar}>
                  <Ionicons name="person" size={20} color={Colors.textMuted} />
                </View>
                <View style={s.postMeta}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={s.userName}>{post.user_name}</Text>
                    {post.status !== 'approved' && (
                      <View style={[s.statusBadge, post.status === 'pending' ? s.pendingBadge : s.rejectedBadge]}>
                        <Text style={s.statusBadgeText}>{post.status.toUpperCase()}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.postTime}>
                    {new Date(post.created_at).toLocaleDateString()} • {post.category}
                  </Text>
                </View>
              </View>

              <Text style={s.postDescription}>{post.description}</Text>

              {post.media_url && (
                <Image source={{ uri: post.media_url }} style={s.postImage} />
              )}

              {post.location_addr && (
                <View style={s.postLocation}>
                  <Ionicons name="location" size={14} color={Colors.textMuted} />
                  <Text style={s.locationText}>{post.location_addr}</Text>
                </View>
              )}

              <View style={s.postActions}>
                <TouchableOpacity 
                  style={s.actionBtn}
                  onPress={() => handleReaction(post.id)}
                >
                  <Ionicons name="heart-outline" size={20} color={Colors.textSecondary} />
                  <Text style={s.actionText}>{post.reactions || 0}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.actionBtn}>
                  <Ionicons name="chatbubble-outline" size={20} color={Colors.textSecondary} />
                  <Text style={s.actionText}>{post.comments || 0}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.actionBtn}>
                  <Ionicons name="share-outline" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: Spacing.lg, 
    paddingTop: 60, 
    paddingBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border
  },
  guardianBanner: {
    backgroundColor: Colors.sos,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    elevation: 4,
    shadowColor: Colors.sos,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  guardianIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guardianInfo: { flex: 1 },
  guardianTitle: { color: Colors.white, fontSize: FontSize.md, fontWeight: '800' },
  guardianSub: { color: 'rgba(255,255,255,0.9)', fontSize: FontSize.xs, marginTop: 2 },
  alertBadge: {
    backgroundColor: Colors.white,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 4
  },
  alertBadgeText: { color: Colors.sos, fontSize: 10, fontWeight: '900' },
  title: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: '800' },
  createBtn: { padding: Spacing.xs },
  feed: { flex: 1 },
  loadingContainer: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 60 
  },
  loadingText: { 
    color: Colors.textSecondary, 
    marginTop: Spacing.md 
  },
  emptyContainer: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 80 
  },
  emptyText: { 
    color: Colors.text, 
    fontSize: FontSize.lg, 
    fontWeight: '700',
    marginTop: Spacing.md
  },
  emptySubtext: { 
    color: Colors.textMuted, 
    fontSize: FontSize.sm,
    marginTop: Spacing.xs
  },
  postCard: {
    backgroundColor: Colors.card,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm
  },
  postMeta: { flex: 1 },
  userName: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '700'
  },
  postTime: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginTop: 2
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pendingBadge: {
    backgroundColor: Colors.accent + '20',
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  rejectedBadge: {
    backgroundColor: Colors.sos + '20',
    borderWidth: 1,
    borderColor: Colors.sos,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.sos,
  },
  bannerSimBtn: {
    position: 'absolute',
    top: 8,
    right: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bannerSimText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '800',
  },
  postDescription: {
    color: Colors.text,
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginBottom: Spacing.sm
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: Radius.sm,
    marginBottom: Spacing.sm
  },
  postLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: 4
  },
  locationText: {
    color: Colors.textMuted,
    fontSize: FontSize.xs
  },
  postActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
    gap: Spacing.lg
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  actionText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm
  },
  createForm: { flex: 1 },
  label: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '700',
    marginBottom: Spacing.sm,
    marginTop: Spacing.md
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md
  },
  catBtn: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full
  },
  catBtnActive: {
    backgroundColor: Colors.sos,
    borderColor: Colors.sos
  },
  catText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600'
  },
  catTextActive: {
    color: Colors.white,
    fontWeight: '700'
  },
  textArea: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    color: Colors.text,
    fontSize: FontSize.md,
    height: 150,
    textAlignVertical: 'top'
  },
  mediaBtn: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm
  },
  mediaBtnText: {
    color: Colors.text,
    fontSize: FontSize.sm
  },
  mediaPreview: {
    position: 'relative',
    marginTop: Spacing.md
  },
  mediaImage: {
    width: '100%',
    height: 200,
    borderRadius: Radius.md
  },
  removeMedia: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.white,
    borderRadius: 12
  },
  locRow: {
    flexDirection: 'row',
    gap: Spacing.sm
  },
  input: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    color: Colors.text,
    fontSize: FontSize.md
  },
  locBtn: {
    backgroundColor: Colors.accent,
    padding: Spacing.md,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    width: 50
  },
  postBtn: {
    backgroundColor: Colors.sos,
    padding: Spacing.lg,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
    marginBottom: Spacing.xxl
  },
  postBtnDisabled: {
    opacity: 0.6
  },
  postBtnText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '800'
  }
});
