import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from 'react-native-paper';

const DynamicGradient = ({ style, children }: { style?: any; children?: React.ReactNode }) => {
  const theme = useTheme();
  // Профессиональный мягкий градиент подбирается в зависимости от темы.
  const gradientPairs: [string, string][] = theme.dark
    ? [
        ['#0f2027', '#203a43'],
        ['#203a43', '#2c5364'],
        ['#2c5364', '#0f2027'],
      ]
    : [
        ['#e0eafc', '#cfdef3'],
        ['#fdfcfb', '#e2d1c3'],
        ['#e0eafc', '#d4fc79'],
      ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Функция цепной анимации:
    const animateGradient = () => {
      Animated.sequence([
        // Плавное появление следующего градиента
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        // Задержка пока следующий градиент полностью виден
        Animated.delay(2000),
        // Плавное исчезновение наложения
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]).start(() => {
        // Обновление индекса для следующей итерации и запуск анимации вновь
        setCurrentIndex(prev => (prev + 1) % gradientPairs.length);
        animateGradient();
      });
    };
    animateGradient();
    // Очищать анимацию вручную не требуется, так как animateGradient запускается рекурсивно
  }, [fadeAnim, gradientPairs.length]);

  const currentColors = gradientPairs[currentIndex];
  const nextColors = gradientPairs[(currentIndex + 1) % gradientPairs.length];

  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        style={StyleSheet.absoluteFill}
        colors={currentColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
        <LinearGradient
          style={StyleSheet.absoluteFill}
          colors={nextColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
});

export default DynamicGradient;

