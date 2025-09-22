import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { enableScreens } from 'react-native-screens';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PopupProvider } from '@/components/PopupProvider';
import { SettingsProvider } from '@/providers/SettingsProvider';
import Toast from 'react-native-toast-message';
import { onAuthStateChanged, restoreUser } from '@/services/localAuth';
import storage, { getLocal, setLocal } from '@/services/storageService';
import localDb from '@/services/localDb';
import { Header } from '@/components/Header';
import HomeScreen from '@/screens/HomeScreen';
import GamePlayScreen from '@/screens/GamePlayScreen';
import GameHistoryScreen from '@/screens/GameHistoryScreen';
import GameDetailScreen from '@/screens/GameDetailScreen';
import DatabaseScreen from '@/screens/DatabaseScreen';
import LoginScreen from '@/screens/LoginScreen';
import PlayerRankingScreen from '@/screens/PlayerRankingScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import { CURRENT_USER_KEY, SETTINGS_KEY } from '@/constants/namingVar';


export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  GameSetup: undefined;
  AddPlayer: undefined;
  GamePlay: { gameId: string };
  GameHistory: undefined;
  GameDetail: { game: any };
  GamePlayerRank: undefined;
  Database: undefined;
  Settings: undefined;
};

// Opt-in to native screens for improved memory and performance
enableScreens();

const Stack = createNativeStackNavigator<RootStackParamList>();

function MainNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        header: () => <Header />,
      }}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="GamePlay" component={GamePlayScreen} />
      <Stack.Screen name="GameHistory" component={GameHistoryScreen} />
      <Stack.Screen name="GameDetail" component={GameDetailScreen} />
      <Stack.Screen name="GamePlayerRank" component={PlayerRankingScreen} />
      <Stack.Screen name="Database" component={DatabaseScreen} />
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
  const [initializing, setInitializing] = useState(true);
  const [authUser, setAuthUser] = useState<any | null>(null);

  useEffect(() => {
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

    // load app setting object (language/timezone/currency) and attach for sync reads
    (async () => {
      try {
        const raw = await getLocal<any>(SETTINGS_KEY);
        const defaults = { language: 'en', timezone: 'UTC', currency: 'AUD' };

        let settings: any;
        if (!raw) {
          settings = defaults;
          try { await setLocal(SETTINGS_KEY, settings); } catch (e) { /* ignore */ }
        } else if (typeof raw === 'string') {
          settings = { ...defaults, language: raw };
          try { await setLocal(SETTINGS_KEY, settings); } catch (e) { /* ignore */ }
        } else {
          settings = {
            language: raw.language ?? defaults.language,
            timezone: raw.timezone ?? defaults.timezone,
            currency: raw.currency ?? defaults.currency,
            // keep extra fields if present
            ...raw,
          };
          // persist if missing keys
          if (!raw.language || !raw.timezone || !raw.currency) {
            try { await setLocal(SETTINGS_KEY, settings); } catch (e) { /* ignore */ }
          }
        }

        try { (global as any).__pokerpal_settings = settings; } catch (e) { /* ignore */ }
      } catch (e) {
        console.warn('failed to load app settings', e);
        try { (global as any).__pokerpal_settings = { language: 'en', timezone: 'UTC', currency: 'USD' }; } catch (e) { /* ignore */ }
      }
    })();

    // restore persisted user (if any) into auth shim before subscribing
    (async () => {
      try {
        const user = await storage.getLocal(CURRENT_USER_KEY);
        if (user) {
          // shape-checking minimal: ensure uid exists
          if (user.uid) {
            restoreUser(user as any);
          }
        }
      } catch (e) {
        console.warn('failed to restore persisted user', e);
      }
    })();

    // guard: auth may be undefined in some non-firebase-enabled environments
    let unsub: (() => void) | undefined;

    if (typeof onAuthStateChanged === 'function') {
      unsub = onAuthStateChanged((user: any) => {
        // update local auth state
        setAuthUser(user ?? null);

        // Simply update auth state and mark initialization done.
        // The navigator rendered in JSX will switch based on `authUser`.
        setInitializing(false);
      });
    } else {
      // no auth available: just navigate to Login once navigation is ready
      const tryNavigate = () => {
        if (!navigationRef.isReady()) {
          setTimeout(tryNavigate, 50);
          return;
        }
        navigationRef.navigate('Login');
        setInitializing(false);
      };
      tryNavigate();
    }

    return () => {
      try {
        if (typeof unsub === 'function') unsub();
      } catch (e) {
        // ignore
      }
    };
  }, [navigationRef]);

  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <PopupProvider>
          <NavigationContainer ref={navigationRef}>
            {initializing && (
              <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" />
              </View>
            )}
            {authUser ? <MainNavigator /> : <AuthNavigator />}
          </NavigationContainer>
        </PopupProvider>
        <Toast />
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
