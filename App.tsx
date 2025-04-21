import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, NavigationProp } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from './src/screens/HomeScreen';
import GamePlayScreen from './src/screens/GamePlayScreen';
import GameHistoryScreen from './src/screens/GameHistoryScreen';
import GameDetailScreen from './src/screens/GameDetailScreen';
import GamePlayerRankScreen from './src/screens/PlayerRankingScreen';
import { PopupProvider } from '@/components/PopupProvider';

import { useNavigationContainerRef } from '@react-navigation/native';
import './src/firebase/config';
import { Header } from '@/components/Header';
import Toast from 'react-native-toast-message';


export type RootStackParamList = {
  Login: undefined
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



  return (
    <SafeAreaProvider>
      <PopupProvider>
        <NavigationContainer ref={navigationRef}>
          <Stack.Navigator
            screenOptions={{
              header: () => <Header />,
            }}>

            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="GamePlay" component={GamePlayScreen} />
            <Stack.Screen name="GameHistory" component={GameHistoryScreen} />
            <Stack.Screen name="GameDetail" component={GameDetailScreen} />

          </Stack.Navigator>
        </NavigationContainer>
      </PopupProvider>
      <Toast />
    </SafeAreaProvider>
  );
}