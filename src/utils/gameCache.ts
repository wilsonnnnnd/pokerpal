import AsyncStorage from '@react-native-async-storage/async-storage';
import { Player } from '@/types';
import { useGameStore } from '@/stores/useGameStore';

export async function cacheGameForRetry(gameId: string, players: Player[]) {
    const gameState = useGameStore.getState().getGame();

    // compute rate (cash per chip) for normalization
    const rate = (gameState && gameState.baseChipAmount && Number(gameState.baseChipAmount) !== 0)
        ? (Number(gameState.baseCashAmount ?? 0) / Number(gameState.baseChipAmount))
        : 1;

    const normalizedPlayers = (players || []).map((p: Player) => ({
        ...p,
        totalBuyInCash: Number(((Number(p.totalBuyInChips) || 0) * rate).toFixed(2)),
        settleCashAmount: typeof p.settleCashAmount === 'number' ? Number((p.settleCashAmount).toFixed(2)) : p.settleCashAmount,
        settleCashDiff: typeof p.settleCashDiff === 'number' ? Number((p.settleCashDiff).toFixed(2)) : p.settleCashDiff,
        settleROI: typeof p.settleROI === 'number' ? Number((p.settleROI).toFixed(6)) : p.settleROI,
    }));

    const normalizedGame = {
        ...gameState,
        baseCashAmount: typeof gameState?.baseCashAmount === 'number' ? Number((gameState.baseCashAmount).toFixed(2)) : gameState?.baseCashAmount,
        baseChipAmount: typeof gameState?.baseChipAmount === 'number' ? Number((gameState.baseChipAmount).toFixed(2)) : gameState?.baseChipAmount,
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
