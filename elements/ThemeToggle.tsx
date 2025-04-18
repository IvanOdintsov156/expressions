import React, { FC, memo } from 'react';
import { IconButton, useTheme } from 'react-native-paper';
import { StyleProp, ViewStyle } from 'react-native';

interface ThemeToggleProps {
  isDark: boolean;
  toggleTheme: () => void;
  style?: StyleProp<ViewStyle>;
}

const ThemeToggle: FC<ThemeToggleProps> = ({ isDark, toggleTheme, style }) => {
  const theme = useTheme();
  const iconName = isDark ? 'weather-sunny' : 'weather-night';

  return (
    <IconButton
      icon={iconName}
      size={30}
      iconColor={theme.colors.primary}
      onPress={toggleTheme}
      style={style}
    />
  );
};

export default memo(ThemeToggle);