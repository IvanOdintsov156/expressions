import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { Card, Text, Avatar, useTheme, TouchableRipple } from 'react-native-paper';
import { supabase } from '../lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';

type EmotionEntry = {
  id: string;
  emotion: string | null;
  created_at: string;
};

const PAGE_SIZE = 10;
const EMOTION_ICONS: Record<string, string> = {
  'Злой': 'emoticon-angry-outline',
  'Отвращение': 'emoticon-poop',
  'Страх': 'emoticon-frown-outline',
  'Счастливый': 'emoticon-happy-outline',
  'Грустный': 'emoticon-sad-outline',
  'Удивление': 'emoticon-excited-outline',
  'Нейтральный': 'emoticon-neutral-outline',
  'Неизвестно': 'emoticon-confused-outline'
};

export const HistoryScreen = () => {
  const theme = useTheme();
  const [history, setHistory] = useState<EmotionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchHistory = useCallback(async (reset = false) => {
    try {
      const currentPage = reset ? 0 : page;
      const offset = currentPage * PAGE_SIZE;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error, count } = await supabase
        .from('emotions')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) throw error;
      
      setHasMore((count || 0) > offset + PAGE_SIZE);
      setHistory(prev => reset ? data || [] : [...prev, ...(data || [])]);
      if (reset) setPage(0); else setPage(p => p + 1);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHistory(true);
  }, [fetchHistory]);

  useEffect(() => { fetchHistory(true); }, []);

  const getEmotionIcon = (emotion: string | null) => {
    return EMOTION_ICONS[emotion || 'Неизвестно'] || EMOTION_ICONS['Неизвестно'];
  };

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flexGrow: 1,
      padding: 16,
      backgroundColor: theme.colors.background
    },
    card: {
      marginBottom: 12,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
      elevation: 2,
      overflow: 'hidden'
    },
    cardContent: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      justifyContent: 'space-between'
    },
    avatar: {
      backgroundColor: theme.colors.surfaceVariant,
      marginLeft: 12
    },
    textContainer: {
      flex: 1,
      marginHorizontal: 12
    },
    date: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 12,
      marginTop: 4
    },
    emotionText: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.onSurface
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40
    },
    emptyText: {
      textAlign: 'center',
      marginTop: 16,
      color: theme.colors.onSurfaceVariant,
      fontSize: 16
    },
    loader: {
      paddingVertical: 16
    }
  }), [theme]);

  const renderItem = ({ item }: { item: EmotionEntry }) => (
    <Card style={styles.card}>
      <TouchableRipple onPress={() => {}} borderless>
        <View style={styles.cardContent}>
          <View style={styles.textContainer}>
            <Text style={styles.emotionText}>
              {item.emotion || 'Неизвестно'}
            </Text>
            <Text style={styles.date}>
              {dayjs(item.created_at).locale('ru').format('D MMMM YYYY • HH:mm')}
            </Text>
          </View>
          <Avatar.Icon 
            icon={getEmotionIcon(item.emotion)}
            size={44}
            style={styles.avatar}
            color={theme.colors.primary}
          />
        </View>
      </TouchableRipple>
    </Card>
  );

  const renderFooter = () => {
    if (!hasMore) return null;
    return (
      <ActivityIndicator 
        size="small" 
        color={theme.colors.primary} 
        style={styles.loader}
      />
    );
  };

  if (loading) {
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      data={history}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.container}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons 
            name="emoticon-sad-outline" 
            size={48} 
            color={theme.colors.onSurfaceVariant} 
          />
          <Text style={styles.emptyText}>Нет записей эмоций</Text>
        </View>
      }
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={handleRefresh}
          colors={[theme.colors.primary]}
          tintColor={theme.colors.primary}
        />
      }
      onEndReached={() => hasMore && fetchHistory()}
      onEndReachedThreshold={0.5}
      ListFooterComponent={renderFooter}
      initialNumToRender={PAGE_SIZE}
      windowSize={5}
    />
  );
};

export default HistoryScreen;