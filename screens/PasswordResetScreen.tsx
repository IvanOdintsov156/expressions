import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Button, TextInput, Text, useTheme, HelperText } from 'react-native-paper';
import { supabase } from '../lib/supabase';
import { Toast } from '../elements/toast';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { usePasswordStrength } from '../hooks/usePasswordStrength';
import { StackActions } from '@react-navigation/native';

export const PasswordResetScreen = ({ navigation }: any ) => {
  const theme = useTheme();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { strength, strengthText, calculateStrength } = usePasswordStrength();

  useEffect(() => {
    calculateStrength(password);
  }, [password, calculateStrength]);

  const showToast = useCallback((message: any) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: '' }), 3000);
  }, []);

  const validatePassword = useCallback(() => {
    if (password !== confirmPassword) {
      showToast('Пароли не совпадают');
      return false;
    }
    if (password.length < 8) {
      showToast('Пароль должен быть не менее 8 символов');
      return false;
    }
    if (!/\d/.test(password)) {
      showToast('Добавьте минимум 1 цифру');
      return false;
    }
    return true;
  }, [password, confirmPassword, showToast]);

  const handleReset = useCallback(async () => {
    if (!validatePassword()) return;
    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      showToast('Пароль успешно изменен!');
      
      // Выход пользователя и явный переход на AuthScreen
      await supabase.auth.signOut();
      navigation.dispatch(
        StackActions.replace('Auth', { screen: 'Auth' })
      );
    } catch (err) {
      showToast('Ошибка: Не удалось изменить пароль');
    } finally {
      setLoading(false);
    }
  }, [password, validatePassword, navigation]);

  const getStrengthColor = () => {
    switch (strength) {
      case 'weak':
        return '#ff5252';
      case 'medium':
        return '#ffb74d';
      case 'strong':
        return '#66bb6a';
      default:
        return theme.colors.outline;
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.content}>
        <MaterialIcons 
          name="lock-reset" 
          size={80} 
          color={theme.colors.primary}
          style={styles.icon}
        />
        <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
          Новый пароль
        </Text>
        <TextInput
          label="Новый пароль"
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          secureTextEntry={!showPassword}
          right={
            <TextInput.Icon
              icon={showPassword ? 'eye-off' : 'eye'}
              onPress={() => setShowPassword(!showPassword)}
            />
          }
          outlineColor={theme.colors.outline}
          activeOutlineColor={theme.colors.primary}
          mode="outlined"
          autoCapitalize="none"
        />
        <View style={styles.strengthContainer}>
          <View style={[styles.strengthBar, { 
            width: `${(strength === 'weak' ? 33 : strength === 'medium' ? 66 : 100)}%`,
            backgroundColor: getStrengthColor()
          }]} />
        </View>
        <HelperText type="info" style={styles.helperText}>
          {strengthText}
        </HelperText>
        <TextInput
          label="Подтвердите пароль"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          style={styles.input}
          secureTextEntry={!showConfirmPassword}
          right={
            <TextInput.Icon
              icon={showConfirmPassword ? 'eye-off' : 'eye'}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            />
          }
          outlineColor={theme.colors.outline}
          activeOutlineColor={theme.colors.primary}
          mode="outlined"
          autoCapitalize="none"
        />
        <Button
          mode="contained"
          onPress={handleReset}
          loading={loading}
          disabled={loading}
          style={[styles.button, { backgroundColor: theme.colors.primary }]}
          labelStyle={styles.buttonLabel}
          contentStyle={styles.buttonContent}
        >
          {loading ? 'Сохранение...' : 'Сохранить пароль'}
        </Button>
        <Button
          mode="text"
          onPress={() => {
          supabase.auth.signOut()
            .then(() => {
              navigation.navigate('Auth');
            })
            .catch(() => {
              showToast('Ошибка: Не удалось выйти из системы');
            });}}
          style={styles.backButton}
          labelStyle={{ color: theme.colors.secondary }}
        >
          Назад к входу
        </Button>
      </View>
      <Toast visible={toast.visible} message={toast.message} />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  icon: {
    alignSelf: 'center',
    marginBottom: 30,
  },
  title: {
    textAlign: 'center',
    marginBottom: 30,
    fontWeight: '600',
  },
  input: {
    marginBottom: 10,
  },
  strengthContainer: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginBottom: 8,
  },
  strengthBar: {
    height: '100%',
    borderRadius: 2,
  },
  helperText: {
    marginBottom: 20,
  },
  button: {
    borderRadius: 12,
    marginTop: 25,
    elevation: 0,
  },
  buttonLabel: {
    color: 'white',
    fontSize: 16,
    height: 46,
  },
  buttonContent: {
    height: 46,
  },
  backButton: {
    marginTop: 20,
  },
});

export default PasswordResetScreen;
