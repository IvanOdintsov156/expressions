import React, { useEffect, useState, createRef } from 'react';
import { Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { PaperProvider, ActivityIndicator } from 'react-native-paper';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './lib/supabase';
import { AuthScreen } from './screens/AuthScreen';
import StatsScreen from './screens/StatsScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { CameraScreen } from './screens/CameraScreen';
import { HomeScreen } from './screens/HomeScreen';
import { TermsScreen } from './screens/TermsScreen';
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
  prefixes: ['exp://172.17.195.65:8081', 'com.expressions.app://'],
  config: {
    screens: {
      Аутентификация: 'auth',
      PhoneAuth: 'phone-auth',
      Камера: 'camera',
      Главная: {
        path: 'home',
        screens: {
          Главная: 'home',
          Статистика: 'stats',
          История: 'history',
          Профиль: 'profile',
        },
      },
    },
  },
};

function AppContent() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { isDark } = useThemeContext();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        supabase.auth.startAutoRefresh();
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
      setSession(session);
      if (event === 'SIGNED_OUT') {
        await WebBrowser.dismissBrowser();
      }
    });

    const handleDeepLink = async (event: { url: string }) => {
      if (
        event.url.includes('/auth/v1/callback') ||
        event.url.includes('/auth/callback')
      ) {
        const params = new URLSearchParams(event.url.split('#')[1]);
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');

        if (access_token && refresh_token) {
          await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
        }
      }
    };

    Linking.addEventListener('url', handleDeepLink);
    initializeAuth();

    return () => {
      subscription?.unsubscribe();
      Linking.removeAllListeners('url');
    };
  }, []);

  if (loading) {
    const currentTheme = isDark ? MaterialDarkTheme : MaterialLightTheme;
    return (
      <PaperProvider theme={currentTheme}>
        <ActivityIndicator size="large" style={{ flex: 1 }} />
      </PaperProvider>
    );
  }
  const currentTheme = isDark ? MaterialDarkTheme : MaterialLightTheme;

  return (
    <PaperProvider theme={currentTheme}>
      <NavigationContainer linking={linking} fallback={<ActivityIndicator size="large" />} ref={navigationRef}>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            ...TransitionPresets.FadeFromRightAndroid,
          }}
        >
          {session ? (
            <Stack.Screen name="Главная" component={MainTabs} />
          ) : (
            <Stack.Screen name="Аутентификация" component={AuthScreen} />
          )}
          <Stack.Screen name="Камера" component={CameraScreen} options={{ title: 'Камера' }} />
          <Stack.Screen name="Terms" component={TermsScreen} options={{ title: 'Условия' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

