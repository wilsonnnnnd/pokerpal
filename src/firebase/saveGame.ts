/**
 * saveGameToFirebase（唯一入口）
 * ------------------------------
 * 集中写：games、players、users、users-by-email、users/{uid}/games、graph
 */
import { db } from '@/firebase/config'
import { useGameStore } from '@/stores/useGameStore'
import { Player } from '@/types'
import Toast from 'react-native-toast-message'
import { cacheGameForRetry } from '@/utils/gameCache'
import { logInfo } from '@/utils/useLogger'
import {
    calcRate,
    makeGamePayload,
    queueGameDocWrite,
    queuePlayerGameWrite,
    hasValidEmail,
    upsertUserAndCounters,
    upsertEmailIndex,
    ensureUserGameHistory,
    collectGraphWrites,
} from './gameWriters'
import { BatchBuilder } from './batchBuilder'
import { getDoc } from 'firebase/firestore'

function validateSettlement(players: Player[]) {
    if (!players?.length) return
    const sum = players.reduce((acc, p) => acc + (p.settleCashDiff ?? 0), 0)
    if (Math.abs(sum) > 0.01) {
        throw new Error(`结算不平衡：所有玩家盈亏合计 = ${sum}`)
    }
}

export async function saveGameToFirebase(gameId: string, players: Player[] = []) {
    const game = useGameStore.getState()
    const originalGameState = { ...game }
    const rate = calcRate(game.baseCashAmount, game.baseChipAmount)

    if (rate === 0 && players.some(p => p.totalBuyInChips > 0)) {
        throw new Error('基础筹码为 0 导致汇率为 0，请检查游戏设置')
    }

    const createdBy = 'host' // TODO: 替换为真实 UID

    logInfo('Saving game to Firebase', { gameId, playerCount: players.length })

    try {
        validateSettlement(players)
    } catch (e: any) {
        Toast.show({ type: 'error', text1: '结算校验失败', text2: e?.message || '', position: 'bottom' })
        throw e
    }

    const bb = new BatchBuilder(db, 450)
    const gamePayload = makeGamePayload(gameId, game, players.length, createdBy)
    queueGameDocWrite(bb, db, gameId, gamePayload)

    const graphWrites: { ref: any, history: any[] }[] = []

    try {
        for (const player of players) {
            const { totalBuyInCash } = queuePlayerGameWrite(bb, db, gameId, player, rate)

            if (!hasValidEmail(player.email)) {
                console.warn(`⚠️ 跳过未绑定邮箱的玩家：${player.nickname}`)
                continue
            }

            await upsertUserAndCounters(bb, db, player, totalBuyInCash)
            upsertEmailIndex(bb, db, player)
            await ensureUserGameHistory(bb, db, player, gameId, totalBuyInCash)

            const graphResult = await collectGraphWrites(bb, player, gameId)
            if (graphResult) graphWrites.push(graphResult)
        }

        await bb.commitAll()

        for (const { ref } of graphWrites) {
            try {
                const snap = await getDoc(ref)
                const saved = ((snap.data() as { history?: any[] })?.history) ?? []
                logInfo('Graph history saved', { len: saved.length })
            } catch { /* ignore */ }
        }

        Toast.show({
            type: 'success',
            text1: '✅ 上传成功',
            text2: `已保存游戏 ${gameId}，共 ${players.length} 位玩家记录`,
            visibilityTime: 2500,
            position: 'bottom',
        })
    } catch (err: any) {
        console.error('Error saving game to Firebase:', err)
        useGameStore.setState(originalGameState)
        await cacheGameForRetry(gameId, players)
        Toast.show({
            type: 'error',
            text1: '❌ 上传失败',
            text2: err?.message || '未知错误',
            visibilityTime: 3000,
            position: 'bottom',
        })
        throw err
    }
}
