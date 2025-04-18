import React, { useState, useEffect, useMemo, useContext, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Image,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import { Button, IconButton, TextInput, useTheme } from 'react-native-paper';
import Lottie from 'lottie-react-native';
import { NavigationContext } from '@react-navigation/native';
import { supabase, deleteUserAccount } from '../lib/supabase';
import { Toast } from '../elements/toast';
import { getGlobalStyles } from '../globalStyles';
import ThemeToggle from '../elements/ThemeToggle';
import { useThemeContext } from '../context/ThemeContext';

interface UserMetadata {
  name?: string;
  avatar_url?: string;
  first_name?: string;
  last_name?: string;
}

interface User {
  id: string;
  email?: string;
  user_metadata: UserMetadata;
  new_email?: string;
}

export const ProfileScreen = () => {
  const theme = useTheme();
  const spacing = useMemo(() => ({
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32
  }), []);
  
  const globalStyles = getGlobalStyles(theme);
  const { isDark, toggleTheme } = useThemeContext();
  const navigation = useContext(NavigationContext);
  
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '' });
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  // Анимационные значения
  const menuAnimation = useRef(new Animated.Value(0)).current;
  const themeScale = useRef(new Animated.Value(1)).current;
  const menuTranslateY = menuAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0]
  });

  // Обработка глубоких ссылок
  useEffect(() => {
    const handleDeepLink = async (url: string | null) => {
      if (url?.includes('email-update-confirm')) {
        await supabase.auth.refreshSession();
        loadUser();
      }
    };

    Linking.getInitialURL().then(handleDeepLink);
    const subscription = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    
    return () => subscription.remove();
  }, []);

  // Слушатель состояния аутентификации
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'USER_UPDATED' || event === 'INITIAL_SESSION') {
        loadUser();
      }
    });

    return () => authListener?.subscription.unsubscribe();
  }, []);

  // Загрузка данных пользователя
  const loadUser = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) throw error || new Error('User not found');
      
      const meta = user.user_metadata || {};
      setUser({
        id: user.id,
        email: user.email,
        user_metadata: meta,
        new_email: user.new_email
      });
      
      setEmail(user.new_email || user.email || '');
      setFirstName(meta.first_name || meta.name?.split(' ')[0] || '');
      setLastName(meta.last_name || meta.name?.split(' ')[1] || '');

    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Ошибка загрузки профиля');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { 
    loadUser(); 
  }, [loadUser]);

  // Уведомления
  const showToast = useCallback((message: string, duration = 3000) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: '' }), duration);
  }, []);

  // Анимация меню
  const toggleMenu = useCallback(() => {
    Animated.timing(menuAnimation, {
      toValue: isMenuVisible ? 0 : 1,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setIsMenuVisible(!isMenuVisible));
  }, [isMenuVisible]);

  // Анимация переключателя темы
  const handleThemePress = useCallback(() => {
    Animated.sequence([
      Animated.timing(themeScale, {
        toValue: 0.8,
        duration: 80,
        useNativeDriver: true
      }),
      Animated.spring(themeScale, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true
      })
    ]).start();
    toggleTheme();
  }, [toggleTheme]);

  // Обновление профиля
  const handleUpdateProfile = useCallback(async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('Некорректный email');
      return;
    }

    try {
      setIsLoading(true);
      
      const attributes = {
        data: {
          ...user?.user_metadata,
          first_name: firstName.trim(),
          last_name: lastName.trim()
        },
        ...(email !== user?.email && { email })
      };

      const { error } = await supabase.auth.updateUser(attributes, {
        emailRedirectTo: 'com.expressions.app://email-update-confirm'
      });

      if (error) throw error;
      showToast('Профиль обновлен');

    } catch (error) {
      const errorMessages = {
        'duplicate key': 'Email уже используется',
        'Email rate limit exceeded': 'Слишком много запросов'
      };
      showToast(error instanceof Error ? 
        (errorMessages as Record<string, string>)[error.message] || error.message : 
        'Ошибка обновления профиля');
    } finally {
      setIsLoading(false);
    }
  }, [email, user, firstName, lastName]);

  // Удаление аккаунта
  const handleDeleteAccount = useCallback(async () => {
    Alert.alert(
      'Удаление аккаунта',
      'Все данные будут удалены безвозвратно',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              const { data: { user } } = await supabase.auth.getUser();
              
              if (!user) {
                showToast('Пользователь не авторизован');
                return;
              }

              const { error } = await deleteUserAccount(user.id);
              
              if (error) throw error;
              
              await supabase.auth.signOut();
              navigation?.navigate('Auth');
              showToast('Аккаунт удален');

            } catch (error) {
              const message = error instanceof Error 
                ? error.message 
                : 'Неизвестная ошибка';
              showToast(`Ошибка удаления: ${message}`);
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  }, [navigation, showToast]);

  // Стили
  const styles = useMemo(() => 
    StyleSheet.create({
      safeArea: { 
        flex: 1, 
        backgroundColor: theme.colors.background 
      },
      container: {
        flex: 1,
        padding: spacing.md,
      },
      header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
      },
      headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
      },
      menuIcon: {
        transform: [{ rotate: '90deg' }],
      },
      themeToggle: {
        borderRadius: 20,
        backgroundColor: theme.colors.elevation.level2,
      },
      avatarSection: {
        alignItems: 'center',
        marginVertical: spacing.lg,
      },
      avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 2,
        borderColor: theme.colors.primary,
      },
      inputGroup: {
        backgroundColor: theme.colors.elevation.level1,
        borderRadius: 16,
        padding: spacing.md,
        marginBottom: spacing.lg,
      },
      chatWidget: {
        backgroundColor: theme.colors.elevation.level1,
        borderRadius: 16,
        padding: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        marginBottom: spacing.lg,
        marginTop: spacing.md,
      },
      lottieContainer: {
        width: 60,
        height: 60,
      },
      buttonGroup: {
        gap: spacing.sm,
      },
      menuOverlay: {
        flex: 1,
        backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.3)',
        justifyContent: 'flex-end',
      },
      menuContainer: {
        backgroundColor: theme.colors.background,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        padding: spacing.md,
        paddingBottom: spacing.xl,
      },
      menuItem: {
        justifyContent: 'flex-start',
        marginVertical: spacing.sm,
        borderRadius: 8,
      },
      deleteItem: {
        backgroundColor: theme.colors.errorContainer,
      }
    }), 
    [theme, spacing]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={globalStyles.headerText}>Профиль</Text>
          
          <View style={styles.headerActions}>
            <IconButton
              icon="dots-vertical"
              onPress={toggleMenu}
              style={styles.menuIcon}
              animated
            />
            
            <Animated.View style={{ transform: [{ scale: themeScale }] }}>
              <ThemeToggle
                isDark={isDark}
                toggleTheme={handleThemePress}
                style={styles.themeToggle}
              />
            </Animated.View>
          </View>
        </View>

        <ScrollView>
          <View style={styles.avatarSection}>
            <Image
              source={{ uri: user?.user_metadata.avatar_url || 'https://via.placeholder.com/120' }}
              style={styles.avatar}
            />
          </View>

          <View style={styles.inputGroup}>
            <TextInput
              label="Имя"
              value={firstName}
              onChangeText={setFirstName}
              mode="outlined"
              left={<TextInput.Icon icon="account" />}
              disabled={isLoading}
            />

            <TextInput
              label="Фамилия"
              value={lastName}
              onChangeText={setLastName}
              mode="outlined"
              left={<TextInput.Icon icon="account" />}
              disabled={isLoading}
              style={{ marginTop: spacing.md }}
            />

            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              left={<TextInput.Icon icon="email" />}
              disabled={isLoading}
              style={{ marginTop: spacing.md }}
            />
          </View>

          {/* Блок персонального ассистента */}
          <TouchableOpacity 
            style={styles.chatWidget}
            onPress={() => navigation?.navigate('Chat')}
          >
            <Lottie
              source={require('../assets/animations/robot-animation.json')}
              autoPlay
              loop
              style={styles.lottieContainer}
            />
            <Text style={{ 
              flex: 1, 
              color: theme.colors.onSurface,
              fontSize: 16,
              fontWeight: '500'
            }}>
              Персональный ассистент
            </Text>
            <IconButton 
              icon="chevron-right" 
              size={24} 
              iconColor={theme.colors.primary} 
            />
          </TouchableOpacity>

          <View style={styles.buttonGroup}>
            <Button
              mode="contained"
              onPress={handleUpdateProfile}
              loading={isLoading}
              icon="content-save"
              style={{ borderRadius: 12 }}>
              Сохранить изменения
            </Button>
          </View>
        </ScrollView>

        <Modal transparent visible={isMenuVisible} onRequestClose={toggleMenu}>
          <TouchableOpacity
            style={styles.menuOverlay}
            activeOpacity={1}
            onPressOut={toggleMenu}>
            <Animated.View 
              style={[
                styles.menuContainer,
                { transform: [{ translateY: menuTranslateY }] }
              ]}>
              
              <Button
                mode="text"
                onPress={() => {
                  toggleMenu();
                  navigation?.navigate('ChangePassword');
                }}
                icon="lock"
                style={styles.menuItem}>
                Сменить пароль
              </Button>

              <Button
                mode="text"
                onPress={() => {
                  toggleMenu();
                  supabase.auth.signOut();
                }}
                icon="logout"
                style={styles.menuItem}>
                Выйти
              </Button>

              <Button
                mode="text"
                onPress={handleDeleteAccount}
                icon="delete"
                style={[styles.menuItem, styles.deleteItem]}
                labelStyle={{ color: theme.colors.error }}>
                Удалить аккаунт
              </Button>
            </Animated.View>
          </TouchableOpacity>
        </Modal>

        <Toast visible={toast.visible} message={toast.message} />
        
        {isLoading && (
          <View style={StyleSheet.absoluteFill}>
            <ActivityIndicator 
              size="large" 
              color={theme.colors.primary} 
              style={{ backgroundColor: theme.colors.backdrop }}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};