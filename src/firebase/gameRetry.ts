/**
 * 离线重试：最多 5 次，记录 lastError，成功后清理缓存。
 */
import AsyncStorage from '@react-native-async-storage/async-storage'
import Toast from 'react-native-toast-message'
import { saveGameToFirebase } from '@/firebase/saveGame'

const PREFIX = 'offline-game:'
const MAX_RETRIES = 5

type CachedPayload = {
    gameId: string
    players: any[]
    retryCount?: number
    lastError?: string
}

export async function retryPendingGames() {
    const keys = await AsyncStorage.getAllKeys()
    const targets = keys.filter(k => k.startsWith(PREFIX))

    for (const key of targets) {
        try {
            const raw = await AsyncStorage.getItem(key)
            if (!raw) { await AsyncStorage.removeItem(key); continue }
            const data: CachedPayload = JSON.parse(raw)
            const { gameId, players } = data
            if (!gameId) { await AsyncStorage.removeItem(key); continue }

            await saveGameToFirebase(gameId, players)
            await AsyncStorage.removeItem(key)
            Toast.show({ type: 'success', text1: '✅ 已重试保存', text2: `游戏 ${gameId}`, position: 'bottom' })
        } catch (err: any) {
            try {
                const raw = await AsyncStorage.getItem(key)
                if (raw) {
                    const v: CachedPayload = JSON.parse(raw)
                    const next = { ...v, retryCount: (v.retryCount || 0) + 1, lastError: String(err?.message || err) }
                    if ((next.retryCount || 0) >= MAX_RETRIES) {
                        await AsyncStorage.removeItem(key)
                        Toast.show({ type: 'error', text1: '❌ 重试失败（已放弃）', text2: key, position: 'bottom' })
                    } else {
                        await AsyncStorage.setItem(key, JSON.stringify(next))
                    }
                } else {
                    await AsyncStorage.removeItem(key)
                }
            } catch {
                await AsyncStorage.removeItem(key)
            }
        }
    }
}
