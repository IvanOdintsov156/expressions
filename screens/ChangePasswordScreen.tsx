import React, { useState, useMemo, useContext, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Button, TextInput, useTheme, Text, HelperText } from 'react-native-paper';
import { NavigationContext } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { Toast } from '../elements/toast';
import { usePasswordStrength } from '../hooks/usePasswordStrength';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

export const ChangePasswordScreen = () => {
  const theme = useTheme();
  const navigation = useContext(NavigationContext);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '' });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  
  const { strength, strengthText, calculateStrength } = usePasswordStrength();

  useEffect(() => {
    calculateStrength(newPassword);
  }, [newPassword]);

  const validatePassword = () => {
    const checks = {
      length: newPassword.length >= 8,
      number: /\d/.test(newPassword),
      match: newPassword === confirmPassword,
      different: newPassword !== currentPassword
    };

    if (!checks.length) return 'Пароль должен быть не менее 8 символов';
    if (!checks.number) return 'Добавьте минимум 1 цифру';
    if (!checks.match) return 'Пароли не совпадают';
    if (!checks.different) return 'Новый пароль должен отличаться от текущего';
    return null;
  };

  const handleChangePassword = async () => {
    const errorMessage = validatePassword();
    if (errorMessage) return showToast(errorMessage);

    try {
      setIsLoading(true);
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      showToast('Пароль успешно изменён 🎉', 2000);
      setTimeout(() => navigation?.goBack(), 2500);

    } catch (error) {
      handleAuthError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthError = (error: any) => {
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
    
    if (message.includes('JWT expired')) {
      showToast('Сессия истекла. Войдите снова');
      supabase.auth.signOut();
    } else {
      showToast(`Ошибка: ${message}`);
    }
  };

  const showToast = (message: string, duration = 3000) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: '' }), duration);
  };

  const getStrengthColor = () => {
    return {
      weak: '#ff5252', // красный
      medium: '#ffb74d', // оранжевый
      strong: '#66bb6a', // зеленый
    }[strength];
  };


  const styles = useMemo(() => 
    StyleSheet.create({
      safeArea: {
        flex: 1,
        backgroundColor: theme.colors.background,
      },
      container: {
        flex: 1,
        padding: 24,
      },
      header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 32,
      },
      backButton: {
        marginRight: 16,
      },
      title: {
        fontSize: 24,
        fontWeight: '600',
        color: theme.colors.onBackground,
      },
      input: {
        marginBottom: 16,
        backgroundColor: theme.colors.elevation.level1,
      },
      strengthContainer: {
        height: 4,
        backgroundColor: theme.colors.surfaceVariant,
        borderRadius: 2,
        marginBottom: 8,
      },
      strengthBar: {
        height: '100%',
        borderRadius: 2,
        width: `${strength === 'weak' ? 33 : strength === 'medium' ? 66 : 100}%`,
        backgroundColor: getStrengthColor(),
      },
      button: {
        borderRadius: 12,
        marginTop: 24,
        paddingVertical: 8,
      },
      buttonLabel: {
        fontSize: 16,
        lineHeight: 28,
      },
      activityIndicator: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        backgroundColor: theme.colors.backdrop + '60',
      }
    }), [theme, strength]
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.safeArea}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container}>
         

          <TextInput
            label="Текущий пароль"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry={!showPasswords.current}
            style={styles.input}
            mode="outlined"
            left={<TextInput.Icon icon="lock" />}
            right={
              <TextInput.Icon
                icon={showPasswords.current ? 'eye-off' : 'eye'}
                onPress={() => setShowPasswords(prev => ({...prev, current: !prev.current}))}
              />
            }
          />

          <TextInput
            label="Новый пароль"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showPasswords.new}
            style={styles.input}
            mode="outlined"
            left={<TextInput.Icon icon="lock-alert" />}
            right={
              <TextInput.Icon
                icon={showPasswords.new ? 'eye-off' : 'eye'}
                onPress={() => setShowPasswords(prev => ({...prev, new: !prev.new}))}
              />
            }
          />

          <View style={styles.strengthContainer}>
            <View style={styles.strengthBar} />
          </View>
          <HelperText type="info" style={{ marginBottom: 16 }}>
            Сложность: {strengthText}
          </HelperText>

          <TextInput
            label="Подтвердите новый пароль"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPasswords.confirm}
            style={styles.input}
            mode="outlined"
            left={<TextInput.Icon icon="lock-check" />}
            right={
              <TextInput.Icon
                icon={showPasswords.confirm ? 'eye-off' : 'eye'}
                onPress={() => setShowPasswords(prev => ({...prev, confirm: !prev.confirm}))}
              />
            }
          />

          <Button
            mode="contained-tonal"
            onPress={handleChangePassword}
            loading={isLoading}
            disabled={isLoading}
            style={styles.button}
            labelStyle={styles.buttonLabel}
            icon="key-chain"
          >
            {isLoading ? 'Сохранение...' : 'Обновить пароль'}
          </Button>

          <Toast visible={toast.visible} message={toast.message} />
          
          {isLoading && (
            <ActivityIndicator 
              size="large"
              style={styles.activityIndicator}
              color={theme.colors.primary}
            />
          )}
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

export default ChangePasswordScreen;