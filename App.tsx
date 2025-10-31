import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { enableScreens } from 'react-native-screens';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PopupProvider } from '@/providers/PopupProvider';
import { SettingsProvider } from '@/providers/SettingsProvider';
import { setSimpleTLocale } from '@/i18n/simpleT';
import AuthProvider from '@/providers/AuthProvider';
import Toast from 'react-native-toast-message';
import { onAuthStateChanged, restoreUser } from '@/services/authService';
import { getLocal } from '@/services/storageService';
import localDb from '@/services/localDb';
import { Header } from '@/components/Header';
import HomeScreen from '@/screens/HomeScreen';
import GamePlayScreen from '@/screens/GamePlayScreen';
import GameHistoryScreen from '@/screens/GameHistoryScreen';
import GameDetailScreen from '@/screens/GameDetailScreen';
import LoginScreen from '@/screens/LoginScreen';
import PlayerRankingScreen from '@/screens/PlayerRankingScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import { CURRENT_USER_KEY, SETTINGS_KEY } from '@/constants/namingVar';
import { userHasRole } from '@/firebase/getUserProfile';
import usePermission from '@/hooks/usePermission';


export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  GameSetup: undefined;
  AddPlayer: undefined;
  GamePlay: { gameId: string };
  GameHistory: { initialTab?: 'local' | 'cloud' } | undefined;
  GameDetail: { game: any };
  GamePlayerRank: undefined;

  Profile: undefined;
  Settings: undefined;
  AuthInspector: undefined;
  HealthCheck: undefined;
};

// Opt-in to native screens for improved memory and performance
enableScreens();

// If app was resumed and global settings were restored synchronously, seed simpleT
try {
  const seedLang = (global as any).__pokerpal_settings?.language;
  if (seedLang) {
    try { setSimpleTLocale(seedLang); } catch (e) { /* ignore */ }
  }
} catch (e) {
  // ignore
}

const Stack = createNativeStackNavigator<RootStackParamList>();

function MainNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        header: () => <Header />,
      }}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="HealthCheck" component={require('@/screens/HealthCheckScreen').default} />
      <Stack.Screen name="GamePlay" component={GamePlayScreen} />
      <Stack.Screen name="GameHistory" component={GameHistoryScreen} />
      <Stack.Screen name="GameDetail" component={GameDetailScreen} />
      <Stack.Screen name="GamePlayerRank" component={PlayerRankingScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}



function AuthNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

export default function App() {
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  // initializing is driven by permission loading state from usePermission
  const { authUser, loading: permLoading, isHost } = usePermission();
  const [initializing] = useState(true); // kept for render gating until bootstrapped + permLoading handled below
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    // Cold-start: read persisted settings before rendering providers so simpleT has correct locale
    (async () => {
      try {
        const s = await getLocal(SETTINGS_KEY);
        if (s) {
          try { setSimpleTLocale(s.language); } catch (e) { /* ignore */ }
          try { (global as any).__pokerpal_settings = s; } catch (e) { /* ignore */ }
        }
      } catch (e) {
        // ignore
      } finally {
        setBootstrapped(true);
      }
    })();

    // initialize local DB (expo-sqlite)
    (async () => {
      try {
        // localDb exports initSchema; older name initLocalDb was removed
        if (typeof (localDb as any).initSchema === 'function') {
          await (localDb as any).initSchema();
        } else {
          console.warn('localDb.initSchema not found, skipping local DB initialization');
        }
      } catch (e) {
        console.warn('local DB init failed', e);
      }
    })();

    // restore persisted user (if any) into auth shim before subscribing
    (async () => {
      try {
        const user = await getLocal(CURRENT_USER_KEY);
        if (user) {
          // shape-checking minimal: ensure uid exists
          if ((user as any).uid) {
            restoreUser(user as any);
          }
        }
      } catch (e) {
        console.warn('failed to restore persisted user', e);
      }
    })();

    // No explicit subscription here: `usePermission` handles auth subscription and remote role check.
    // We only need to return a noop cleanup since no subscription was created in this effect.
    return () => {};
  }, []);

  if (!bootstrapped) {
    return (
      <SafeAreaProvider>
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <AuthProvider>
          <PopupProvider>
            <NavigationContainer
              ref={navigationRef}
              onReady={() => {
                // If no auth subsystem available, navigate to Login immediately when navigation is ready
                if (typeof onAuthStateChanged !== 'function') {
                  try {
                    if (!navigationRef.isReady()) return;
                    navigationRef.navigate('Login');
                  } catch (e) {
                    // ignore
                  }
                }
              }}
            >
              {(bootstrapped && permLoading) && (
                <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator size="large" />
                </View>
              )}
              {authUser ? <MainNavigator /> : <AuthNavigator />}
            </NavigationContainer>
            <Toast />
          </PopupProvider>
        </AuthProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
