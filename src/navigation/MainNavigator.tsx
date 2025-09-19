import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Header } from '@/components/Header';
import HomeScreen from '@/screens/HomeScreen';
import GamePlayScreen from '@/screens/GamePlayScreen';
import GameHistoryScreen from '@/screens/GameHistoryScreen';
import GameDetailScreen from '@/screens/GameDetailScreen';
import GamePlayerRankScreen from '@/screens/PlayerRankingScreen';
import DatabaseScreen from '@/screens/DatabaseScreen';

const Stack = createNativeStackNavigator();

export default function MainNavigator() {
    return (
        <Stack.Navigator
            screenOptions={{
                header: () => <Header />,
            }}>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="GamePlay" component={GamePlayScreen} />
            <Stack.Screen name="GameHistory" component={GameHistoryScreen} />
            <Stack.Screen name="GameDetail" component={GameDetailScreen} />
            <Stack.Screen name="GamePlayerRank" component={GamePlayerRankScreen} />
            <Stack.Screen name="Database" component={DatabaseScreen} />
        </Stack.Navigator>
    );
}
