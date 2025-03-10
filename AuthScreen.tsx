import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, TextInput, Button, Checkbox, useTheme } from 'react-native-paper';
import * as Linking from 'expo-linking';
import { StackActions } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { AuthError } from '@supabase/supabase-js';
import { Toast } from '../elements/toast';
import DynamicGradient from '../elements/DynamicGradient';

import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';

export const AuthScreen = ({ navigation }: any) => {
  const theme = useTheme();
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOnline] = useState(true);
  const [toast, setToast] = useState({ visible: false, message: '' });
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((_, session) => {
      if (session) navigation.navigate('Home');
    });
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      if (event.url.includes('/auth/callback')) {
        navigation.navigate('Home');
      }
    };
    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => subscription.remove();
  }, [navigation]);

  const showToast = (message: string) => {
    setToast({ visible: true, message });
  };

  const handleEmailAuth = async (isSignUp: boolean) => {
    if (!isOnline) {
      showToast('Проверьте интернет-соединение');
      return;
    }
    if (isSignUp && !acceptedTerms) {
      showToast('Примите условия пользования');
      return;
    }
    try {
      setLoading(true);
      const { error } = isSignUp
        ? await supabase.auth.signUp({
            email,
            password,
            options: { data: { first_name: firstName, last_name: lastName } },
          })
        : await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigation.navigate('Home');
    } catch (err) {
      const message =
        err instanceof AuthError ? err.message : 'Ошибка аутентификации';
      showToast(message);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'github') => {
    if (!isOnline) {
      showToast('Проверьте интернет-соединение');
      return;
    }
    try {
      setLoading(true);
      const redirectUrl = Linking.createURL('/auth/callback');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: redirectUrl },
      });
      if (error) throw error;
      if (data?.url) {
        await Linking.openURL(data.url);
      }
    } catch (err) {
      const message =
        err instanceof AuthError
          ? err.message
          : `Ошибка входа через ${provider === 'google' ? 'Google' : 'GitHub'}`;
      showToast(message);
    } finally {
      setLoading(false);
    }
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        modeButtonsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
        title: {
          marginBottom: 40,
          textAlign: 'center',
          fontSize: 28,
          fontWeight: '700',
          marginTop: 60,
          // Добавляем улучшенный теневой эффект для заголовка
          textShadowColor: theme.dark ? '#ffffffaa' : '#000000aa',
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 10,
        },
        form: { gap: 20, paddingHorizontal: 20 },
        input: { backgroundColor: theme.colors.surface, borderRadius: 8 },
        button: { borderRadius: 8, paddingVertical: 10, elevation: 2 },
        orText: { textAlign: 'center', marginVertical: 16, color: theme.colors.onSurface },
        oauthButtonsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
        oauthButton: { flex: 1 },
        termsContainer: { flexDirection: 'row', alignItems: 'center' },
        termsText: { textDecorationLine: 'underline', color: theme.colors.primary },
      }),
    [theme]
  );

  return (
    <DynamicGradient style={styles.container}>
      <MaskedView
        maskElement={
          <Text style={[styles.title, { backgroundColor: 'transparent' }]}>
            Трекер эмоций
          </Text>
        }
      >
        <LinearGradient
          colors={['#FFD700', '#FFC107', '#FFD700']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={[styles.title, { opacity: 0 }]}>Трекер эмоций</Text>
        </LinearGradient>
      </MaskedView>
      <View style={styles.modeButtonsRow}>
        <Button
          mode={!isSignUpMode ? 'contained' : 'text'}
          onPress={() => setIsSignUpMode(false)}
          disabled={loading}
        >
          Войти
        </Button>
        <Button
          mode={isSignUpMode ? 'contained' : 'text'}
          onPress={() => setIsSignUpMode(true)}
          disabled={loading}
        >
          Регистрация
        </Button>
      </View>
      <View style={styles.form}>
        <TextInput
          label="Email"
          mode="outlined"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          disabled={loading}
        />
        <TextInput
          label="Пароль"
          mode="outlined"
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          secureTextEntry
          disabled={loading}
        />
        {isSignUpMode && (
          <>
            <TextInput
              label="Имя"
              mode="outlined"
              value={firstName}
              onChangeText={setFirstName}
              style={styles.input}
              autoCapitalize="words"
              disabled={loading}
            />
            <TextInput
              label="Фамилия"
              mode="outlined"
              value={lastName}
              onChangeText={setLastName}
              style={styles.input}
              autoCapitalize="words"
              disabled={loading}
            />
            <View style={styles.termsContainer}>
              <Checkbox
                status={acceptedTerms ? 'checked' : 'unchecked'}
                onPress={() => setAcceptedTerms(!acceptedTerms)}
                disabled={loading}
              />
              <Text onPress={() => navigation.navigate('Terms')} style={styles.termsText}>
                Я принимаю условия пользования
              </Text>
            </View>
          </>
        )}
        <Button
          mode="contained"
          onPress={() => handleEmailAuth(isSignUpMode)}
          loading={loading}
          disabled={loading || !isOnline}
          style={styles.button}
          labelStyle={{ color: theme.colors.onPrimary, fontSize: 18, textAlign: 'center' }}
        >
          {!isSignUpMode ? 'Войти' : 'Создать аккаунт'}
        </Button>
        <Text style={styles.orText}>ИЛИ</Text>
        <View style={styles.oauthButtonsRow}>
          <Button
            mode="contained-tonal"
            onPress={() => handleOAuth('google')}
            disabled={loading || !isOnline}
            style={[styles.button, styles.oauthButton, { backgroundColor: '#4285F4' }]}
            icon="google"
            labelStyle={{ color: '#fff' }}
          >
            Google
          </Button>
          <Button
            mode="contained-tonal"
            onPress={() => handleOAuth('github')}
            disabled={loading || !isOnline}
            style={[styles.button, styles.oauthButton, { marginLeft: 8, backgroundColor: '#333' }]}
            icon="github"
            labelStyle={{ color: '#fff' }}
          >
            GitHub
          </Button>
        </View>
      </View>
      <View>
        <Toast visible={toast.visible} message={toast.message} />
      </View>
    </DynamicGradient>
  );
};

export default AuthScreen;
