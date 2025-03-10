import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { Card, Text, Avatar, useTheme } from 'react-native-paper';
import { supabase } from '../lib/supabase';

type EmotionEntry = {
  id: string;
  emotion: string | null;
  created_at: string;
  photo: string | null;
  user_id: string;
};

export const HistoryScreen = () => {
  const theme = useTheme();
  const spacing = (theme as any).spacing || { sm: 8, md: 16, lg: 24 };
  const [history, setHistory] = useState<EmotionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    const { data: emotions, error } = await supabase
      .from('emotions')
      .select('id, emotion, created_at, photo, user_id')
      .order('created_at', { ascending: false })
      .limit(10);
    if (error) {
      console.error('Error fetching history:', error);
    } else {
      setHistory(emotions || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const styles = useMemo(() => StyleSheet.create({
    container: { 
      flexGrow: 1, 
      padding: spacing.md, 
      backgroundColor: theme.colors.background 
    },
    card: { 
      marginBottom: spacing.sm, 
      borderRadius: 8, 
      backgroundColor: theme.colors.surface 
    },
    cardContent: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      padding: spacing.sm 
    },
    image: { 
      width: 64, 
      height: 64, 
      marginRight: spacing.sm 
    },
    avatar: { 
      marginRight: spacing.sm 
    },
    textContainer: { 
      flex: 1 
    },
    date: { 
      color: theme.colors.onSurfaceVariant 
    },
    center: { 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center' 
    },
    emptyText: { 
      textAlign: 'center', 
      marginTop: spacing.lg, 
      color: theme.colors.onSurface 
    },
  }), [theme, spacing]);

  const renderItem = ({ item }: { item: EmotionEntry }) => (
    <Card style={styles.card}>
      <Card.Content style={styles.cardContent}>
        {item.photo && <Image source={{ uri: item.photo }} style={styles.image} />}
        <View style={styles.textContainer}>
          <Text variant="titleMedium" numberOfLines={1}>
          <Text variant="titleMedium" numberOfLines={1}>
            {item.emotion || 'Н/Д'}
          </Text>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
        <Avatar.Text 
          label={item.emotion ? item.emotion[0].toUpperCase() : ''} 
          size={64} 
          style={styles.avatar} 
        />
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.center}>
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
      ListEmptyComponent={<Text style={styles.emptyText}>Нет записей</Text>}
      refreshControl={
        <RefreshControl 
          refreshing={loading} 
          onRefresh={fetchHistory} 
          colors={[theme.colors.primary]} 
          tintColor={theme.colors.primary}
        />
      }
    />
  );
};

export default HistoryScreen;
