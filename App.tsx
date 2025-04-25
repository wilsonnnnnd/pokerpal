import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from './src/screens/HomeScreen';
import GamePlayScreen from './src/screens/GamePlayScreen';
import GameHistoryScreen from './src/screens/GameHistoryScreen';
import GameDetailScreen from './src/screens/GameDetailScreen';
import GamePlayerRankScreen from './src/screens/PlayerRankingScreen';
import LoginScreen from './src/screens/LoginScreen'; // ✅ 登录页面
import { Header } from '@/components/Header';
import { PopupProvider } from '@/components/PopupProvider';
import Toast from 'react-native-toast-message';

import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './src/firebase/config';
import { useAuthStore } from '@/stores/useAuthStore';

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  GameSetup: undefined;
  AddPlayer: undefined;
  GamePlay: { gameId: string };
  GameHistory: undefined;
  GameDetail: { gameId: string };
  GamePlayerRank: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const [isAuthInitialized, setIsAuthInitialized] = useState(false);
  const user = useAuthStore((state) => state.user)
  const setAuthUser = useAuthStore((state) => state.login)
  const clearAuthUser = useAuthStore((state) => state.logout)
  
  // ✅ 监听登录状态
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setAuthUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email ?? '',
          displayName: firebaseUser.displayName ?? '',
          photoURL: firebaseUser.photoURL ?? '',
        })
      } else {
        clearAuthUser()
      }
      setIsAuthInitialized(true)
    })
    return unsubscribe
  }, [])
  if (!isAuthInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <PopupProvider>
        <NavigationContainer ref={navigationRef}>
          <Stack.Navigator
            screenOptions={{
              header: () => <Header />,
            }}>
            {/* ✅ 根据是否登录切换初始页面 */}
            {user ? (
              <>
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="GamePlay" component={GamePlayScreen} />
                <Stack.Screen name="GameHistory" component={GameHistoryScreen} />
                <Stack.Screen name="GameDetail" component={GameDetailScreen} />
                <Stack.Screen name="GamePlayerRank" component={GamePlayerRankScreen} />
              </>
            ) : (
              <Stack.Screen
                name="Login"
                component={LoginScreen}
                options={{ headerShown: false }}
              />
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </PopupProvider>
      <Toast />
    </SafeAreaProvider>
  );
}
