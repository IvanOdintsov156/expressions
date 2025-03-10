/* cspell:ignore supabase */
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Dimensions, ScrollView, View, StyleSheet } from 'react-native';
import { Card, Text, Button, ActivityIndicator, useTheme } from 'react-native-paper';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { supabase } from '../lib/supabase';
import { Toast } from '../elements/toast';

const screenWidth = Dimensions.get('window').width;

// Добавляем функцию parseRGB
const parseRGB = (colorStr: string) => {
  const result = colorStr.match(/\d+/g);
  if (result && result.length >= 3) {
    return {
      r: parseInt(result[0], 10),
      g: parseInt(result[1], 10),
      b: parseInt(result[2], 10),
    };
  }
  return { r: 0, g: 0, b: 0 };
};

const StatsScreen: React.FC = () => {
  const theme = useTheme();
  const spacing = (theme as any).spacing || { sm: 8, md: 12, lg: 16 };
  const [stats, setStats] = useState<{ emotion: string; count: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '' });

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setToast({ visible: false, message: '' });
    const { data, error } = await supabase
      .from('emotions')
      .select('emotion')
      .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString())
      .order('created_at', { ascending: false });
    if (error) {
      setToast({ visible: true, message: 'Ошибка получения статистики' });
      setLoading(false);
      return;
    }
    const emotionCounts = data.reduce((acc: Record<string, number>, { emotion }: { emotion: string }) => {
      acc[emotion] = (acc[emotion] || 0) + 1;
      return acc;
    }, {});
    const newStats = Object.entries(emotionCounts)
      .map(([emotion, count]) => ({ emotion, count }))
      .sort((a, b) => b.count - a.count);
    setStats(newStats);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const topEmotion = stats.length ? stats[0].emotion : 'None';
  const distributionData = stats.map(s => ({
    name: s.emotion,
    population: s.count,
    color: '#' + Math.floor(Math.random() * 16777215).toString(16),
    legendFontColor: theme.colors.onSurface,
    legendFontSize: 12,
  }));
  const barChartData = {
    labels: stats.map(s => s.emotion),
    datasets: [{ data: stats.map(s => s.count) }],
  };

  const chartConfig = useMemo(() => {
    const primaryRGB = parseRGB(theme.colors.primary);
    const onSurfaceRGB = parseRGB(theme.colors.onSurface);
    return {
      backgroundGradientFrom: theme.colors.background,
      backgroundGradientTo: theme.colors.background,
      decimalPlaces: 0,
      color: (opacity = 1) =>
        `rgba(${primaryRGB.r}, ${primaryRGB.g}, ${primaryRGB.b}, ${opacity})`,
      labelColor: (opacity = 1) =>
        `rgba(${onSurfaceRGB.r}, ${onSurfaceRGB.g}, ${onSurfaceRGB.b}, ${opacity})`,
    };
  }, [theme]);

  const styles = useMemo(() => StyleSheet.create({
    container: { padding: spacing.md, backgroundColor: theme.colors.background },
    card: { marginBottom: spacing.sm, borderRadius: 8, backgroundColor: theme.colors.surface, padding: spacing.sm },
    title: { marginBottom: spacing.sm, textAlign: 'center', fontWeight: 'bold', color: theme.colors.onSurface },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    updateButton: { marginTop: spacing.sm, borderRadius: 8 },
  }), [theme, spacing]);

  return (
    <ScrollView style={{ backgroundColor: theme.colors.background }} contentContainerStyle={styles.container}>
      {/* Top Emotion */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.title}>
            Top Emotion: {topEmotion}
          </Text>
        </Card.Content>
      </Card>

      {/* Distribution Pie Chart */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.title}>
            Emotional Distribution
          </Text>
          <PieChart
            data={distributionData}
            width={screenWidth - spacing.md * 2}
            height={180}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </Card.Content>
      </Card>

      {/* Emotion Counts Bar Chart */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.title}>
            Emotion Counts
          </Text>
          <BarChart
            data={barChartData}
            width={screenWidth - spacing.md * 2}
            height={180}
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={chartConfig}
            style={{ marginVertical: spacing.sm, borderRadius: 8 }}
          />
          <Button
            mode="contained"
            onPress={fetchStats}
            icon="refresh"
            style={styles.updateButton}
            labelStyle={{ color: theme.colors.onPrimary }}
          >
            Обновить
          </Button>
        </Card.Content>
      </Card>

      <Toast visible={toast.visible} message={toast.message} />
      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}
    </ScrollView>
  );
};

export default StatsScreen;

