import React, { useEffect, useState, createRef } from 'react';
import { Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer, StackActions } from '@react-navigation/native';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { PaperProvider } from 'react-native-paper';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './lib/supabase';
import { AuthScreen } from './screens/AuthScreen';
import { HomeScreen } from './screens/HomeScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import StatsScreen from './screens/StatsScreen';
import { TermsScreen } from './screens/TermsScreen';
import { PasswordResetScreen } from './screens/PasswordResetScreen';
import { ChangePasswordScreen } from './screens/ChangePasswordScreen';
import ChatScreen from './screens/AssistantChatScreen';
import { MaterialLightTheme, MaterialDarkTheme } from './theme';
import { useThemeContext, ThemeProvider } from './context/ThemeContext';

WebBrowser.maybeCompleteAuthSession();

const Stack = createStackNavigator();
const Tab = createMaterialTopTabNavigator();
const navigationRef = createRef<any>();

const MainTabs = () => {
  const { isDark } = useThemeContext();
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Tab.Navigator
        tabBarPosition="bottom"
        screenOptions={({ route }) => ({
          tabBarIndicatorStyle: {
            backgroundColor: isDark
              ? MaterialDarkTheme.colors.primary
              : MaterialLightTheme.colors.primary
          },
          tabBarStyle: {
            backgroundColor: isDark
              ? MaterialDarkTheme.colors.surface
              : MaterialLightTheme.colors.surface,
            borderTopWidth: 0
          },
          tabBarActiveTintColor: isDark
            ? MaterialDarkTheme.colors.primary
            : MaterialLightTheme.colors.primary,
          tabBarInactiveTintColor: 'gray',
          tabBarLabelStyle: { fontSize: 12 },
          tabBarIcon: ({ color }) => {
            let iconName: string;
            switch (route.name) {
              case 'Главная':
                iconName = 'home';
                break;
              case 'Статистика':
                iconName = 'analytics';
                break;
              case 'История':
                iconName = 'history';
                break;
              case 'Профиль':
                iconName = 'person';
                break;
              default:
                iconName = 'circle';
            }
            return <MaterialIcons name={iconName} size={26} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Главная" component={HomeScreen} />
        <Tab.Screen name="Статистика" component={StatsScreen} />
        <Tab.Screen name="История" component={HistoryScreen} />
        <Tab.Screen name="Профиль" component={ProfileScreen} />
      </Tab.Navigator>
    </SafeAreaView>
  );
};
const linking = {
  prefixes: ['yourapp://', 'exp://your-url'],
  config: {
    screens: {
      Auth: {
        path: 'auth',
        screens: {
          Login: 'login',
          SignUp: 'signup'
        }
      },
      PasswordReset: 'password-reset', // Упрощаем конфигурацию
      Home: {
        path: 'home',
        screens: {
          Главная: 'main',
          Профиль: 'profile'
        }
      }
    }
  }
};

const AppContent = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { isDark } = useThemeContext();

  const handleDeepLink = async (url: string | null) => {
    if (!url) return;
  
    if (url.includes('/password-reset')) {
      const params = new URLSearchParams(url.split('#')[1]);
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      const type = params.get('type');
  
      if (type === 'recovery' && access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
        // Добавляем сброс стека навигации
        navigationRef.current?.dispatch(
          StackActions.replace('PasswordReset')
        );
      }
      return;
    }
  
    if (url.includes('/auth/callback')) {
      const params = new URLSearchParams(url.split('#')[1]);
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
  
      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
        navigationRef.current?.dispatch(
          StackActions.replace('Home')
        );
      }
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        supabase.auth.startAutoRefresh();
      } catch (error) {
        console.error('Auth init error:', error);
      } finally {
        setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        
        // Удаляем автоматический переход при восстановлении пароля
        if (event === 'PASSWORD_RECOVERY' && !session) {
          navigationRef.current?.navigate('PasswordReset');
        }
        
        // Добавляем проверку текущего экрана
        if (session && navigationRef.current?.getCurrentRoute()?.name === 'PasswordReset') {
          navigationRef.current?.navigate('Auth');
        }
      }
    );

    Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    Linking.getInitialURL().then(handleDeepLink);
    initializeAuth();

    return () => {
      subscription?.unsubscribe();
      Linking.removeAllListeners('url');
    };
  }, []);

  if (loading) {
    return (
      <PaperProvider theme={isDark ? MaterialDarkTheme : MaterialLightTheme}>
        <ActivityIndicator size="large" style={{ flex: 1 }} />
      </PaperProvider>
    );
  }

  return (
    <PaperProvider theme={isDark ? MaterialDarkTheme : MaterialLightTheme}>
      <NavigationContainer
        ref={navigationRef}
        linking={linking}
        fallback={<ActivityIndicator size="large" />}
      >
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            ...TransitionPresets.SlideFromRightIOS,
          }}
        >
          {session ? (
            <Stack.Screen name="Home" component={MainTabs} />
          ) : (
            <Stack.Screen name="Auth" component={AuthScreen} />
          )}
          
          <Stack.Screen 
            name="PasswordReset" 
            component={PasswordResetScreen}
            options={{
              headerShown: true,
              title: 'Сброс пароля',
              headerStyle: {
                backgroundColor: isDark 
                  ? MaterialDarkTheme.colors.background 
                  : MaterialLightTheme.colors.background
              },
              headerTintColor: isDark 
                ? MaterialDarkTheme.colors.primary 
                : MaterialLightTheme.colors.primary
            }}
          />
          <Stack.Screen name="Terms" component={TermsScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: true,
              title: 'Чат c ассистентом',
              headerStyle: {
                backgroundColor: isDark 
                  ? MaterialDarkTheme.colors.background 
                  : MaterialLightTheme.colors.background
              },
              headerTintColor: isDark 
                ? MaterialDarkTheme.colors.primary 
                : MaterialLightTheme.colors.primary
            }}
          />
          <Stack.Screen 
            name="ChangePassword" 
            component={ChangePasswordScreen}
            options={{ 
              headerShown: true,
              title: 'Смена пароля',
              headerStyle: {
                backgroundColor: isDark 
                  ? MaterialDarkTheme.colors.background 
                  : MaterialLightTheme.colors.background
              },
              headerTintColor: isDark 
                ? MaterialDarkTheme.colors.primary 
                : MaterialLightTheme.colors.primary
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
