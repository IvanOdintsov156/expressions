import React, { useRef, useEffect, useState, useMemo } from "react";
import { Text, StyleSheet, Animated } from "react-native";
import { useTheme } from "react-native-paper";

interface ToastProps {
  visible: boolean;
  message: string;
}

export const Toast: React.FC<ToastProps> = ({ visible, message }) => {
  const theme = useTheme();
  // При темной теме показываем светлый toast, иначе — темный
  const bgColor = theme.dark ? theme.colors.surface : theme.colors.onSurface;
  const txtColor = theme.dark ? theme.colors.onSurface : theme.colors.surface;

  const [internalVisible, setInternalVisible] = useState(visible);
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      position: 'absolute',
      left: 20,
      right: 20,
      bottom: 20,
      backgroundColor: bgColor,
      padding: 15,
      borderRadius: 8,
      alignItems: 'center',
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 5,
    },
    text: {
      color: txtColor,
    },
  }), [bgColor, txtColor, theme]);

  useEffect(() => {
    if (visible) {
      setInternalVisible(true);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setInternalVisible(false));
      }, 3000);
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setInternalVisible(false));
    }
  }, [visible, opacity]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!internalVisible) return null;

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
};