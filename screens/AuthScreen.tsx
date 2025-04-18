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
import { usePasswordStrength } from '../hooks/usePasswordStrength';

export const AuthScreen = ({ navigation }: any) => {
  const theme = useTheme();
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOnline] = useState(true);
  const [toast, setToast] = useState({ visible: false, message: '' });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [hidePassword, setHidePassword] = useState(true);
  
  const { strength, strengthText, calculateStrength } = usePasswordStrength();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((_, session) => {
      if (session) {
        showToast('Вход выполнен успешно!');
        navigation.navigate('Home');
      }
    });
    return () => authListener?.subscription.unsubscribe();
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

  const showToast = (message: string, duration = 3000) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: '' }), duration);
  };

  const handlePasswordReset = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('Введите корректный email для сброса');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: Linking.createURL('/password-reset'),
      });
      
      if (error) throw error;
      showToast('Письмо для сброса отправлено на вашу почту');
      setShowResetPassword(false);
    } catch (err) {
      showToast('Ошибка при отправке письма');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (isSignUp: boolean) => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('Введите корректный email');
      return;
    }

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
      const { data, error } = isSignUp
        ? await supabase.auth.signUp({
            email,
            password,
            options: { 
              data: { 
                first_name: firstName, 
                last_name: lastName 
              },
              emailRedirectTo: Linking.createURL('/auth/callback')
            },
          })
        : await supabase.auth.signInWithPassword({ email, password });

      if (error) throw error;

      if (isSignUp) {
        if (data.user?.identities?.length === 0) {
          showToast('Этот email уже зарегистрирован');
          return;
        }

        if (data.user && !data.session) {
          showToast('Вам отправлено письмо для подтверждения email, проверьте свою почту');
          navigation.dispatch(StackActions.replace('Auth'));
          return;
        }
      }

      showToast('Вход выполнен успешно!');
      navigation.dispatch(StackActions.replace('Home'));
    } catch (err) {
      const message = err instanceof AuthError 
        ? getAuthErrorMessage(err) 
        : 'Ошибка аутентификации';
      showToast(message);
    } finally {
      setLoading(false);
    }
  };

  const getAuthErrorMessage = (error: AuthError) => {
    switch (error.message) {
      case 'Email not confirmed':
        return 'Подтвердите email по ссылке в письме';
      case 'Invalid login credentials':
        return 'Неверные учетные данные';
      case 'User already registered':
        return 'Этот email уже зарегистрирован';
      case 'Email rate limit exceeded':
        return 'Слишком много запросов, попробуйте позже';
      default:
        return error.message;
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
        showToast(`Перенаправление на ${provider}...`);
      }
    } catch (err) {
      const message = err instanceof AuthError
        ? err.message
        : `Ошибка входа через ${provider === 'google' ? 'Google' : 'GitHub'}`;
      showToast(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((_, session) => {
      if (session) {
        showToast('Вход выполнен успешно!');
        navigation.navigate('Home');
      }
    });
    return () => authListener?.subscription.unsubscribe();
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

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        modeButtonsRow: { 
          flexDirection: 'row', 
          justifyContent: 'space-around', 
          marginBottom: 20 
        },
        title: {
          marginBottom: 40,
          textAlign: 'center',
          fontSize: 28,
          fontWeight: '700',
          marginTop: 60,
          textShadowColor: theme.dark ? '#ffffffaa' : '#000000aa',
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 10,
        },
        form: { gap: 20, paddingHorizontal: 20 },
        input: { 
          backgroundColor: theme.colors.surface, 
          borderRadius: 8 
        },
        button: { 
          borderRadius: 8, 
          paddingVertical: 10, 
          elevation: 2 
        },
        orText: { 
          textAlign: 'center', 
          marginVertical: 16, 
          color: theme.colors.onSurface 
        },
        oauthButtonsRow: { 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          gap: 8 
        },
        oauthButton: { flex: 1 },
        termsContainer: { 
          flexDirection: 'row', 
          alignItems: 'center' 
        },
        termsText: { 
          textDecorationLine: 'underline', 
          color: theme.colors.primary 
        },
        resetPasswordContainer: {
          marginTop: 20,
          gap: 15
        },
        passwordStrengthBar: {
          flexDirection: 'row',
          gap: 4,
          marginTop: 8,
          marginBottom: 4
        },
        strengthBar: {
          height: 4,
          flex: 1,
          borderRadius: 2,
        },
        strengthText: {
          fontSize: 12,
          color: '#666'
        }
      }),
    [theme]
  );

  const getStrengthColor = () => {
    switch(strength) {
      case 'weak': return '#ff4444';
      case 'medium': return '#ffc107';
      case 'strong': return '#00c851';
      default: return '#e0e0e0';
    }
  };


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
          mode={!isSignUpMode && !showResetPassword ? 'contained' : 'text'}
          onPress={() => {
            setIsSignUpMode(false);
            setShowResetPassword(false);
          }}
          disabled={loading}
        >
          Войти
        </Button>
        <Button
          mode={isSignUpMode ? 'contained' : 'text'}
          onPress={() => {
            setIsSignUpMode(true);
            setShowResetPassword(false);
          }}
          disabled={loading}
        >
          Регистрация
        </Button>
      </View>

      {showResetPassword ? (
        <View style={[styles.form, styles.resetPasswordContainer]}>
          <TextInput
            label="Email для сброса"
            mode="outlined"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            disabled={loading}
          />
          <Button
            mode="contained"
            onPress={handlePasswordReset}
            loading={loading}
            disabled={loading}
            style={styles.button}
          >
            Отправить ссылку
          </Button>
          <Button
            mode="text"
            onPress={() => setShowResetPassword(false)}
            disabled={loading}
          >
            Назад к входу
          </Button>
        </View>
      ) : isSignUpMode ? (
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
            onChangeText={(text) => {
              setPassword(text);
              calculateStrength(text);
            }}
            style={styles.input}
            secureTextEntry={hidePassword}
            right={
              <TextInput.Icon
                icon={hidePassword ? 'eye-off' : 'eye'}
                onPress={() => setHidePassword(!hidePassword)}
              />
            }
            disabled={loading}
          />
          <View style={styles.passwordStrengthBar}>
            {[1, 2, 3].map((_, index) => (
              <View
                key={index}
                style={[
                  styles.strengthBar,
                  { 
                    backgroundColor: index < 
                      (strength === 'weak' ? 1 : strength === 'medium' ? 2 : 3)
                      ? getStrengthColor()
                      : '#e0e0e0'
                  }
                ]}
              />
            ))}
          </View>
          <Text style={[styles.strengthText, { color: getStrengthColor() }]}>
            {strengthText}
          </Text>

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
            <Text 
              onPress={() => navigation.navigate('Terms')} 
              style={styles.termsText}
            >
              Я принимаю условия пользования
            </Text>
          </View>
          <Button
            mode="contained"
            onPress={() => handleEmailAuth(true)}
            loading={loading}
            disabled={loading || !isOnline}
            style={styles.button}
          >
            Создать аккаунт
          </Button>
        </View>
      ) : (
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
            secureTextEntry={hidePassword}
            right={
              <TextInput.Icon
                icon={hidePassword ? 'eye-off' : 'eye'}
                onPress={() => setHidePassword(!hidePassword)}
              />
            }
            disabled={loading}
          />
          <Button
            mode="contained"
            onPress={() => handleEmailAuth(false)}
            loading={loading}
            disabled={loading || !isOnline}
            style={styles.button}
          >
            Войти
          </Button>
          <Button 
            mode="text" 
            onPress={() => setShowResetPassword(true)}
            disabled={loading}
            style={{ alignSelf: 'center' }}
          >
            Забыли пароль?
          </Button>
        </View>
      )}

      {!showResetPassword && (
        <>
          <Text style={styles.orText}>ИЛИ</Text>
          <View style={[styles.form, styles.oauthButtonsRow]}>
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
              style={[styles.button, styles.oauthButton, { backgroundColor: '#333' }]}
              icon="github"
              labelStyle={{ color: '#fff' }}
            >
              GitHub
            </Button>
          </View>
        </>
      )}

      <Toast visible={toast.visible} message={toast.message} />
    </DynamicGradient>
  );
};

export default AuthScreen;
