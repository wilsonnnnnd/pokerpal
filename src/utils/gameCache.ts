import AsyncStorage from '@react-native-async-storage/async-storage';
import { Player } from '@/types';
import { useGameStore } from '@/stores/useGameStore';

export async function cacheGameForRetry(gameId: string, players: Player[]) {
    const gameState = useGameStore.getState().getGame();

    await AsyncStorage.setItem(
        `unsaved-game-${gameId}`,
        JSON.stringify({
            gameId,
            players,
            game: gameState,
            timestamp: Date.now(),
        })
    );
}
