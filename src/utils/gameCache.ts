import AsyncStorage from '@react-native-async-storage/async-storage';
import { Player } from '@/types';
import { useGameStore } from '@/stores/useGameStore';
import { formatPlayerSnapshot, formatGameNumbers } from '@/utils/formatSnapshot';

export async function cacheGameForRetry(gameId: string, players: Player[]) {
    const gameState = useGameStore.getState().getGame();

    // compute rate (cash per chip) for normalization
    const rate = (gameState && gameState.baseChipAmount && Number(gameState.baseChipAmount) !== 0)
        ? (Number(gameState.baseCashAmount ?? 0) / Number(gameState.baseChipAmount))
        : 1;

    const normalizedPlayers = (players || []).map((p: Player) => ({
        ...formatPlayerSnapshot(p, rate),
        // preserve some extra fields if present
        id: p.id,
        email: p.email,
    }));

    const normalizedGame = {
        ...gameState,
        ...formatGameNumbers(gameState),
    };

    await AsyncStorage.setItem(
        `unsaved-game-${gameId}`,
        JSON.stringify({
            gameId,
            players: normalizedPlayers,
            game: normalizedGame,
            timestamp: Date.now(),
        })
    );
}
