import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from './src/screens/HomeScreen';
import GamePlayScreen from './src/screens/GamePlayScreen';
import GameHistoryScreen from './src/screens/GameHistoryScreen';
import GameDetailScreen from './src/screens/GameDetailScreen';
import GamePlayerRankScreen from './src/screens/PlayerRankingScreen';
import { PopupProvider } from '@/components/PopupProvider';
import { useAuthStore } from '@/stores/useAuthStore';

import './src/firebase/config';
import { Header } from '@/components/Header';
import Toast from 'react-native-toast-message';
import LoginScreen from '@/screens/LoginScreen';


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
  interface AuthState {
    user: AuthUser | null;
    loading: boolean;
    listenToAuth: () => void;
  }

  interface AuthUser {
    id?: string;
    name?: string;
    email?: string;
  }

  const user: AuthUser | null = useAuthStore((state: AuthState) => state.user);
  const loading: boolean = useAuthStore((state: { loading: boolean }) => state.loading)
  const listenToAuth: () => void = useAuthStore((state: { listenToAuth: () => void }) => state.listenToAuth)

  useEffect(() => {
    listenToAuth()
  }, [])


  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    )
  }



  return (
    <SafeAreaProvider>
      <PopupProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Home"
            screenOptions={{
              header: () => <Header />,
            }}>
            {user ? (
              <>
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="GamePlay" component={GamePlayScreen} />
                <Stack.Screen name="GameHistory" component={GameHistoryScreen} />
                <Stack.Screen name="GameDetail" component={GameDetailScreen} />
                <Stack.Screen name="GamePlayerRank" component={GamePlayerRankScreen} />
              </>
            ) : (
              <>
                <Stack.Screen name="Login" component={LoginScreen} />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </PopupProvider>
      <Toast />
    </SafeAreaProvider>
  );
}
