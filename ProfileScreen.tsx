import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput as NativeTextInput,
  Image,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Button, TextInput, IconButton, useTheme } from 'react-native-paper';
import { supabase } from '../lib/supabase';
import { Toast } from '../elements/toast';
import { GestureResponderEvent } from 'react-native';
import { getGlobalStyles } from '../globalStyles';
import ThemeToggle from '../elements/ThemeToggle';
import { useThemeContext } from '../context/ThemeContext';

interface UserMetadata {
  name?: string;
  phone?: string;
  avatar_url?: string;
}

interface User {
  id: string;
  email: string;
  user_metadata: UserMetadata;
}

export const ProfileScreen = () => {
  const theme = useTheme();
  const spacing = (theme as any).spacing || { sm: 16, md: 20, lg: 40 };
  const globalStyles = getGlobalStyles(theme);
  const { isDark, toggleTheme } = useThemeContext();
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const otpInputs = useRef<Array<NativeTextInput | null>>([]);
  const otpIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [toast, setToast] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: '',
  });

  const formatPhoneNumber = (text: string): string => {
    const cleaned = text.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('7') || cleaned.startsWith('+7')) {
        const digits = cleaned.replace(/\D/g, '');
        const part1 = digits.slice(0, 1);
        const part2 = digits.slice(1, 4);
        const part3 = digits.slice(4, 7);
        const part4 = digits.slice(7, 9);
        const part5 = digits.slice(9, 11);
        let formatted = (part1 === '7' ? '+7' : '+' + part1);
        if (part2) formatted += ' (' + part2 + (part2.length === 3 ? ')' : '');
        if (part3) formatted += ' ' + part3;
        if (part4) formatted += '-' + part4;
        if (part5) formatted += '-' + part5;
        return formatted;
    }
    return cleaned;
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
            setToast({ visible: true, message: 'Ошибка получения пользователя: ' + error.message });
            return;
        }

        if (data.user) {
          const currentUser = data.user as User;
          setUser(currentUser);
          setEmail(currentUser.email || '');
          setName(currentUser.user_metadata?.name || '');
          setPhoneInput(currentUser.user_metadata?.phone || '');
        }
      } catch (error) {
        setToast({ visible: true, message: 'Ошибка получения пользователя: ' + (error as Error).message });
      }
    };
    fetchUser();

    return () => {
      if (otpIntervalRef.current) clearInterval(otpIntervalRef.current);
    };
  }, []);

  async function handleUpdateProfile(e: GestureResponderEvent): Promise<void> {
    try {
      const { error } = await supabase.auth.updateUser({
        email,
        data: {
          name,
          phone: phoneInput,
        },
      });
      if (error) {
        setToast({ visible: true, message: 'Ошибка обновления профиля: ' + error.message });
      } else {
        setToast({ visible: true, message: 'Профиль успешно обновлен.' });
        //update local user data
        setUser(prev => prev ? {...prev, email: email, user_metadata: { ...prev.user_metadata, name, phone: phoneInput}} : null)
      }
    } catch (error) {
      setToast({ visible: true, message: 'Ошибка обновления профиля: ' + (error as Error).message });
    }
  }

  async function handleSendOtp(): Promise<void> {
    if (!phoneInput) {
      setToast({ visible: true, message: 'Введите номер телефона.' });
      return;
    }
    // in real life, you should send request on server here
    Alert.alert("Уведомление", "OTP-код: 123456", [{ text: "OK" }]);

    setOtpSent(true);
    setCountdown(60);
    otpIntervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(otpIntervalRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    setToast({ visible: true, message: 'OTP отправлен.' });
  }

  async function handleVerifyOtp(): Promise<void> {
      // in real life, you should send request on server here
    if (otpCode.trim() !== '123456') {
      setToast({ visible: true, message: 'Неверный OTP код.' });
      return;
    }
    setToast({ visible: true, message: 'OTP успешно верифицирован.' });
    setOtpSent(false);
    setOtpCode('');
  }

  function handleOtpChange(index: number, value: string): void {
    const currentOtp = otpCode.split('');
    currentOtp[index] = value.slice(-1);
    const newOtp = currentOtp.join('');
    setOtpCode(newOtp);

    if (value && index < otpInputs.current.length - 1) {
      otpInputs.current[index + 1]?.focus();
    }
  }

  async function handleLogout(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setToast({ visible: true, message: 'Ошибка выхода: ' + error.message });
      } else {
        setUser(null);
        setToast({ visible: true, message: 'Вы вышли из системы.' });
      }
    } catch (error) {
      setToast({ visible: true, message: 'Ошибка выхода: ' + (error as Error).message });
    }
  }
  const styles = useMemo(() => StyleSheet.create({
    safeArea: { flex: 1 },
    headerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between', // выравниваем заголовок и переключатель
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      backgroundColor: theme.colors.surface,
    },
    scrollContainer: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.lg,
      alignItems: 'center',
    },
    avatarWrapper: {
      marginVertical: spacing.md,
      alignItems: 'center',
    },
    avatar: {
      width: 120,
      height: 120,
      borderRadius: 60,
    },
    inputsContainer: {
      width: '100%',
    },
    input: {
      marginBottom: spacing.sm,
      backgroundColor: theme.colors.surface,
    },
    phoneBlock: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    sendOtpButton: {
      marginLeft: spacing.sm,
      backgroundColor: theme.colors.primary,
    },
    otpSection: {
      width: '100%',
      marginBottom: spacing.md,
      alignItems: 'center',
    },
    otpTitle: {
      fontSize: 16,
      fontWeight: '500',
      marginBottom: spacing.sm,
      color: theme.colors.onSurface,
    },
    otpContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '80%',
      marginBottom: spacing.sm,
    },
    otpInput: {
      width: 45,
      height: 50,
      borderWidth: 1,
      borderColor: theme.colors.onSurfaceVariant,
      borderRadius: 8,
      textAlign: 'center',
      fontSize: 18,
      backgroundColor: theme.colors.surface,
    },
    verifyButton: {
      backgroundColor: theme.colors.primary,
      width: '60%',
    },
    buttonsContainer: {
      width: '100%',
      alignItems: 'center',
      marginVertical: spacing.md,
    },
    actionButton: {
      width: '90%',
      marginVertical: spacing.sm,
    },
  }), [theme]);

  return (
    <View style={globalStyles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerContainer}>
          <Text style={globalStyles.headerText}>Профиль</Text>
          <ThemeToggle isDark={isDark} toggleTheme={toggleTheme} />
        </View>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.avatarWrapper}>
            {user?.user_metadata.avatar_url && (
              <Image style={styles.avatar} source={{ uri: user.user_metadata.avatar_url }} />
            )}
          </View>
          <View style={styles.inputsContainer}>
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              style={[styles.input, globalStyles.input]}
              keyboardType="email-address"
            />
            <TextInput
              label="Имя"
              value={name}
              onChangeText={setName}
              style={[styles.input, globalStyles.input]}
            />
            <View style={styles.phoneBlock}>
              <TextInput
                label="Номер телефона"
                value={phoneInput}
                onChangeText={text => setPhoneInput(formatPhoneNumber(text))}
                style={[styles.input, globalStyles.input, { flex: 1 }]}
                keyboardType="phone-pad"
                disabled={otpSent}
              />
              <Button
                mode="contained"
                style={styles.sendOtpButton}
                onPress={handleSendOtp}
                disabled={otpSent && countdown > 0}
              >
                {countdown > 0 ? `Повторить (${countdown})` : 'OTP'}
              </Button>
            </View>
            {otpSent && (
              <View style={styles.otpSection}>
                <Text style={[styles.otpTitle, globalStyles.text]}>
                  Введите код подтверждения
                </Text>
                <View style={styles.otpContainer}>
                  {Array.from({ length: 6 }, (_, i) => (
                    <NativeTextInput
                      key={i}
                      ref={ref => (otpInputs.current[i] = ref)}
                      style={styles.otpInput}
                      keyboardType="number-pad"
                      maxLength={1}
                      value={otpCode[i] ?? ''}
                      onChangeText={v => handleOtpChange(i, v)}
                      placeholder="X"
                    />
                  ))}
                </View>
                <Button mode="contained" style={styles.verifyButton} onPress={handleVerifyOtp}>
                  Подтвердить
                </Button>
              </View>
            )}
          </View>
          <View style={styles.buttonsContainer}>
            <Button mode="contained" style={styles.actionButton} onPress={handleUpdateProfile}>
              Обновить профиль
            </Button>
            <Button mode="contained" style={[styles.actionButton, { backgroundColor: '#f44336' }]} onPress={handleLogout}>
              Выйти
            </Button>
          </View>
          <Toast visible={toast.visible} message={toast.message} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default ProfileScreen;



