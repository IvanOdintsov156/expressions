import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { ScrollView, View, StyleSheet, useWindowDimensions, Alert, RefreshControl } from 'react-native';
import { Card, Text, Button, ActivityIndicator, useTheme } from 'react-native-paper';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { Toast } from '../elements/toast';
import type { MD3Theme } from 'react-native-paper';
import { CircularProgress } from 'react-native-circular-progress';

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

type EmotionStat = { 
  emotion: string; 
  count: number 
};

type ChartDataItem = {
  name: string;
  value: number;
  color: string;
  legendFontColor: string;
  legendFontSize: number;
};

const EMOTION_COLORS: Record<string, string> = {
  happy: '#FFD700',
  sad: '#2196F3',
  angry: '#F44336',
  disgust: '#9C27B0',
  fear: '#4CAF50',
  surprise: '#FF9800',
  neutral: '#9E9E9E',
};

const EMOTION_TRANSLATIONS: Record<string, string> = {
  angry: 'Злость',
  disgust: 'Отвращение',
  fear: 'Страх',
  happy: 'Радость',
  sad: 'Грусть',
  surprise: 'Удивление',
  neutral: 'Нейтрально',
};

const EMOTION_ICONS: Record<string, MaterialIconName> = {
  angry: 'mood-bad',
  disgust: 'sick',
  fear: 'warning',
  happy: 'mood',
  sad: 'sentiment-dissatisfied',
  surprise: 'sentiment-very-satisfied',
  neutral: 'sentiment-neutral',
};

const parseRGB = (colorStr: string) => {
  const hex = colorStr.replace('#', '');
  const bigint = parseInt(hex, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  };
};

const getHappinessDescription = (index: number): string => {
  if (index >= 80) return 'Отличное настроение! 😊';
  if (index >= 60) return 'Хорошее настроение! 🙂';
  if (index >= 40) return 'Нейтральное настроение 😐';
  if (index >= 20) return 'Подавленное настроение 😞';
  return 'Тяжелый период 😢';
};

const StatsScreen: React.FC = () => {
  const theme = useTheme() as MD3Theme;
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [stats, setStats] = useState<EmotionStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '' });

  const showToast = useCallback((message: string) => {
    setToast({ visible: true, message });
    const timer = setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
    return () => clearTimeout(timer);
  }, []);

  const processEmotionData = useCallback((data: { emotion: string }[]): EmotionStat[] => {
    const counts = data.reduce((acc, { emotion }) => {
      const key = emotion.toLowerCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .map(([emotion, count]) => ({
        emotion: EMOTION_TRANSLATIONS[emotion] || emotion,
        count
      }))
      .sort((a, b) => b.count - a.count);
  }, []);

  const happinessIndex = useMemo(() => {
    const EMOTION_WEIGHTS: Record<string, number> = {
      happy: 1,
      surprise: 0.3,
      neutral: 0,
      sad: -0.5,
      angry: -1,
      disgust: -0.8,
      fear: -0.6,
    };

    let totalScore = 0;
    let totalEntries = 0;

    stats.forEach(({ emotion, count }) => {
      const originalEmotion = Object.entries(EMOTION_TRANSLATIONS)
        .find(([_, translation]) => translation === emotion)?.[0] || emotion;
      
      const weight = EMOTION_WEIGHTS[originalEmotion.toLowerCase()] || 0;
      totalScore += count * weight;
      totalEntries += count;
    });

    return totalEntries > 0 
      ? Math.round(((totalScore + totalEntries) / (2 * totalEntries)) * 100)
      : null;
  }, [stats]);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setRefreshing(true);
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
  
      const { data, error } = await supabase
        .from('emotions')
        .select('emotion')
        .eq('user_id', user.id)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false });
  
      if (error) throw error;
      setStats(processEmotionData(data || []));
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Ошибка получения статистики');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [processEmotionData, showToast]);

  const clearStatistics = useCallback(async () => {
    Alert.alert(
      'Очистка истории',
      'Вы уверены, что хотите удалить всю историю эмоций? Это действие нельзя отменить.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const { error } = await supabase
                .from('emotions')
                .delete()
                .neq('emotion', null);

              if (error) throw error;
              setStats([]);
              showToast('История эмоций очищена');
            } catch (error) {
              showToast(error instanceof Error ? error.message : 'Ошибка очистки');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }, [showToast]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const chartConfig = useMemo(() => {
    const primary = parseRGB(theme.colors.primary);
    const onSurface = parseRGB(theme.colors.onSurface);

    return {
      backgroundGradientFrom: theme.colors.background,
      backgroundGradientTo: theme.colors.background,
      decimalPlaces: 0,
      color: (opacity = 1) => `rgba(${primary.r}, ${primary.g}, ${primary.b}, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(${onSurface.r}, ${onSurface.g}, ${onSurface.b}, ${opacity})`,
      propsForDots: { r: '4' },
      barPercentage: 0.6,
    };
  }, [theme]);

  const styles = useMemo(() => StyleSheet.create({
    container: { 
      padding: screenWidth * 0.05,
      backgroundColor: theme.colors.background,
      minHeight: screenHeight,
    },
    card: {
      marginBottom: 20,
      borderRadius: 16,
      backgroundColor: theme.colors.surfaceVariant,
      elevation: 4,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
    },
    cardContent: {
      padding: screenWidth * 0.05,
    },
    gridRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 20,
      gap: 16,
    },
    statContainer: {
      flex: 1,
      alignItems: 'center',
    },
    title: {
      fontSize: screenWidth * 0.05,
      fontWeight: '600',
      color: theme.colors.onSurface,
      marginBottom: 8,
      textAlign: 'center',
    },
    emotionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 4,
      padding: 12,
      borderRadius: 8,
      backgroundColor: theme.colors.surface,
    },
    emotionIcon: {
      marginRight: 12,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    emptyText: {
      fontSize: screenWidth * 0.04,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      marginTop: 16,
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 16,
      marginVertical: 20,
    },
    chartHeader: {
      fontSize: screenWidth * 0.045,
      fontWeight: '500',
      color: theme.colors.onSurface,
      marginBottom: 16,
      textAlign: 'center',
    },
    progressContainer: {
      alignItems: 'center',
      marginVertical: 20,
    },
    legendContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      marginTop: 16,
      gap: 12,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 8,
      borderRadius: 8,
      backgroundColor: theme.colors.surface,
    },
    legendColor: {
      width: screenWidth * 0.04,
      height: screenWidth * 0.04,
      borderRadius: screenWidth * 0.02,
      marginRight: 8,
    },
    buttonContent: {
      height: 48,
      justifyContent: 'center',
    },
  }), [theme, screenWidth]);

  const renderCharts = () => {
    if (!stats.length) {
      return (
        <View style={styles.emptyState}>
          <MaterialIcons 
            name="insights" 
            size={screenWidth * 0.12} 
            color={theme.colors.onSurfaceVariant} 
          />
          <Text style={styles.emptyText}>Нет данных за последние 7 дней</Text>
        </View>
      );
    }

    const distributionData: ChartDataItem[] = stats.map(({ emotion, count }) => {
      const originalEmotion = Object.entries(EMOTION_TRANSLATIONS)
        .find(([_, translation]) => translation === emotion)?.[0] || emotion;
      
      return {
        name: emotion,
        value: count,
        color: EMOTION_COLORS[originalEmotion.toLowerCase()] || '#CCCCCC',
        legendFontColor: theme.colors.onSurface,
        legendFontSize: 14,
      };
    });

    const barChartData = {
      labels: stats.map(s => s.emotion),
      datasets: [{ data: stats.map(s => s.count) }],
    };

    return (
      <>
        <Card style={styles.card}>
          <View style={styles.cardContent}>
            <Text style={styles.chartHeader}>
              <MaterialIcons name="pie-chart" size={20} color={theme.colors.primary} /> Распределение
            </Text>
            <PieChart
              data={distributionData}
              width={screenWidth - 40}
              height={220}
              chartConfig={chartConfig}
              accessor="value"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
              hasLegend={false}
            />
            <View style={styles.legendContainer}>
              {distributionData.map((item, index) => (
                <View key={index} style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                  <Text style={{ 
                    color: theme.colors.onSurface,
                    fontSize: screenWidth * 0.035,
                    fontWeight: '500'
                  }}>
                    {item.name} ({item.value})
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </Card>

        <Card style={styles.card}>
          <View style={styles.cardContent}>
            <Text style={styles.chartHeader}>
              <MaterialIcons name="bar-chart" size={20} color={theme.colors.primary} /> Частота
            </Text>
            <BarChart
              data={barChartData}
              width={screenWidth - 40}
              height={Math.max(240, screenWidth / 2)}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={{
                ...chartConfig,
                fillShadowGradient: theme.colors.primary,
                fillShadowGradientOpacity: 0.3,
              }}
              verticalLabelRotation={-45}
              fromZero
              showBarTops={false}
              withCustomBarColorFromData
              flatColor
              style={{
                marginLeft: -24,
                borderRadius: 8
              }}
            />
          </View>
        </Card>
      </>
    );
  };

  return (
    <ScrollView 
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={fetchStats}
          colors={[theme.colors.primary]}
          tintColor={theme.colors.primary}
        />
      }
    >
      <View style={styles.gridRow}>
        <Card style={[styles.card, { flex: 1 }]}>
          <View style={styles.cardContent}>
            <Text style={styles.title}>
              <MaterialIcons 
                name="star" 
                size={screenWidth * 0.06} 
                color={theme.colors.primary} 
              /> Преобладает
            </Text>
            {stats[0] ? (
              <View style={styles.emotionRow}>
                <MaterialIcons
                  name={EMOTION_ICONS[stats[0].emotion.toLowerCase()] || 'help-outline'}
                  size={screenWidth * 0.06}
                  color={theme.colors.primary}
                  style={styles.emotionIcon}
                />
                <Text style={{ 
                  fontSize: screenWidth * 0.045, 
                  color: theme.colors.onSurface,
                  fontWeight: '500'
                }}>
                  {stats[0].emotion}
                </Text>
              </View>
            ) : (
              <Text style={{ 
                color: theme.colors.onSurfaceVariant, 
                textAlign: 'center',
                fontStyle: 'italic'
              }}>
                Нет данных
              </Text>
            )}
          </View>
        </Card>

        <Card style={[styles.card, { flex: 1 }]}>
          <View style={styles.cardContent}>
            <Text style={styles.title}>
              <MaterialIcons 
                name="mood" 
                size={screenWidth * 0.06} 
                color={theme.colors.primary} 
              /> Индекс
            </Text>
            <View style={styles.progressContainer}>
              {happinessIndex !== null ? (
                <>
                  <CircularProgress
                    size={screenWidth * 0.25}
                    width={screenWidth * 0.03}
                    fill={happinessIndex}
                    tintColor={theme.colors.primary}
                    backgroundColor={theme.colors.surface}
                    rotation={0}
                    lineCap="round"
                  >
                    {(fill) => (
                      <Text style={{ 
                        fontSize: screenWidth * 0.06, 
                        fontWeight: '600',
                        color: theme.colors.onSurface 
                      }}>
                        {Math.round(fill)}%
                      </Text>
                    )}
                  </CircularProgress>
                  <Text style={{ 
                    marginTop: 8,
                    color: theme.colors.onSurfaceVariant,
                    textAlign: 'center',
                    fontSize: screenWidth * 0.035,
                    maxWidth: screenWidth * 0.35,
                  }}>
                    {getHappinessDescription(happinessIndex)}
                  </Text>
                </>
              ) : (
                <Text style={{ 
                  color: theme.colors.onSurfaceVariant,
                  fontStyle: 'italic'
                }}>
                  Недостаточно данных
                </Text>
              )}
            </View>
          </View>
        </Card>
      </View>

      {renderCharts()}

      <View style={styles.buttonRow}>
        <Button
          mode="contained-tonal"
          onPress={fetchStats}
          icon="refresh"
          style={{ 
            borderRadius: 12,
            flex: 1 
          }}
          contentStyle={styles.buttonContent}
          labelStyle={{ 
            color: theme.colors.onSecondaryContainer,
            fontWeight: '600',
            fontSize: screenWidth * 0.04
          }}
          loading={loading}
          disabled={loading}
        >
          Обновить
        </Button>

        <Button
          mode="contained-tonal"
          onPress={clearStatistics}
          icon="delete"
          style={{ 
            borderRadius: 12,
            flex: 1,
            backgroundColor: theme.colors.errorContainer 
          }}
          contentStyle={styles.buttonContent}
          labelStyle={{ 
            color: theme.colors.onErrorContainer,
            fontWeight: '600',
            fontSize: screenWidth * 0.04
          }}
          disabled={loading}
        >
          Очистить
        </Button>
      </View>

      <Toast visible={toast.visible} message={toast.message} />
      
      {loading && (
        <ActivityIndicator 
          size="large" 
          color={theme.colors.primary} 
          style={{ marginVertical: 24 }}
        />
      )}
    </ScrollView>
  );
};

export default StatsScreen;