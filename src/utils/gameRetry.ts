import { saveGameToFirebase } from '@/firebase/saveGame'
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function retryCachedGames() {
    const keys = await AsyncStorage.getAllKeys();
    const gameKeys = keys.filter(k => k.startsWith('unsaved-game-'));

    const MAX_AGE = 24 * 60 * 60 * 1000;

    for (const key of gameKeys) {
        try {
            const raw = await AsyncStorage.getItem(key);
            if (!raw) continue;

            const parsed = JSON.parse(raw);
            const { gameId, players, timestamp, retryCount = 0 } = parsed;

            if (!gameId || !players || Date.now() - timestamp > MAX_AGE || retryCount >= 3) {
                await AsyncStorage.removeItem(key);
                continue;
            }

            await saveGameToFirebase(gameId, players);
            await AsyncStorage.removeItem(key);

        } catch (err) {
            console.warn(`[retryCachedGames] Retry failed: ${key}`, err);
            // 增加 retryCount
            try {
                const raw = await AsyncStorage.getItem(key);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    parsed.retryCount = (parsed.retryCount || 0) + 1;
                    await AsyncStorage.setItem(key, JSON.stringify(parsed));
                } else {
                    await AsyncStorage.removeItem(key); // 避免死循环
                }
            } catch (e) {
                await AsyncStorage.removeItem(key); // 避免死循环
            }
        }
    }
}
