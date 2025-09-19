import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import GamePlayScreen from './src/screens/GamePlayScreen';
import GameHistoryScreen from './src/screens/GameHistoryScreen';
import GameDetailScreen from './src/screens/GameDetailScreen';
import GamePlayerRankScreen from './src/screens/PlayerRankingScreen';
import DatabaseScreen from './src/screens/DatabaseScreen';
import { Header } from '@/components/Header';
import { PopupProvider } from '@/components/PopupProvider';
import Toast from 'react-native-toast-message';
import { onAuthStateChanged, restoreUser } from '@/services/localAuth';
import storage from '@/services/storageService';
import localDb from '@/services/localDb';


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
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const [initializing, setInitializing] = useState(true);

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

    // restore persisted user (if any) into auth shim before subscribing
    (async () => {
      try {
        const user = await storage.getLocal('@pokerpal:currentUser');
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
        // Wait for navigation to be ready to avoid navigation errors
        const tryNavigate = () => {
          if (!navigationRef.isReady()) {
            setTimeout(tryNavigate, 50);
            return;
          }

          if (user) {
            // already logged in -> go to Home
            navigationRef.navigate('Home');
          } else {
            // not logged in -> go to Login
            navigationRef.navigate('Login');
          }
          setInitializing(false);
        };

        tryNavigate();
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
      <PopupProvider>
        <NavigationContainer ref={navigationRef}>
          {initializing && (
            <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="large" />
            </View>
          )}
          <Stack.Navigator
            initialRouteName="Login"
            screenOptions={{
              header: () => <Header />,
            }}>

            <>
              <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="GamePlay" component={GamePlayScreen} />
              <Stack.Screen name="GameHistory" component={GameHistoryScreen} />
              <Stack.Screen name="GameDetail" component={GameDetailScreen} />
              <Stack.Screen name="GamePlayerRank" component={GamePlayerRankScreen} />
              <Stack.Screen name="Database" component={DatabaseScreen} />
            </>

          </Stack.Navigator>
        </NavigationContainer>
      </PopupProvider>
      <Toast />
    </SafeAreaProvider>
  );
}
