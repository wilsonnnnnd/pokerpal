/**
 * gameWriters.ts
 * --------------
 * Firestore 写入的原子函数集合，供 saveGame.ts 调用。
 */
import {
    doc,
    getDoc,
    serverTimestamp,
    increment,
    Timestamp,
} from 'firebase/firestore'
import { BatchBuilder } from './batchBuilder'
import { gameDoc, playerDoc, userDoc } from '@/constants/namingDb'
import { Player } from '@/types'
import { preparePlayerGraphBatch } from './preparePlayerGraphBatch'

export type GraphPoint = {
    gameId: string
    diff: number
    roi: number
    ts: Timestamp
}

// 计算游戏的汇率（基于初始现金和筹码）
export function calcRate(baseCashAmount: number, baseChipAmount: number) {
    return baseChipAmount === 0 ? 0 : baseCashAmount / baseChipAmount
}

// 构建游戏主数据的 payload
export function makeGamePayload(gameId: string, game: any, playerCount: number, createdBy: string) {
    return {
        gameId,                                                     // 游戏 ID
        smallBlind: game.smallBlind,                               // 小盲注
        bigBlind: game.bigBlind,                                   // 大盲注
        baseCashAmount: game.baseCashAmount,                       // 初始现金
        baseChipAmount: game.baseChipAmount,                       // 初始筹码
        rate: calcRate(game.baseCashAmount, game.baseChipAmount), // 汇率
        playerCount,                                               // 玩家数量
        createdBy,                                                  // 创建者 UID
        created: game.created ?? serverTimestamp(),                 // 创建时间
        updated: serverTimestamp(),                                 // 更新时间
        finalized: game.finalized ?? false,                         // 是否已结束
        status: game.finalized ? 'finalized' : 'open',              // 游戏状态
        token: game.token ?? null,                                   // 游戏令牌（可选）
    }
}
// 将游戏主数据写入 Firestore
export function queueGameDocWrite(bb: BatchBuilder, db: any, gameId: string, payload: any) {
    const gameRef = doc(db, gameDoc, gameId)
    bb.set(gameRef, payload)
    return gameRef
}

// 将玩家数据写入 Firestore
export function queuePlayerGameWrite(
    bb: BatchBuilder,
    db: any,
    gameId: string,
    player: Player,
    rate: number
) {
    const playerRef = doc(db, gameDoc, gameId, playerDoc, player.id)
    const totalBuyInCash = player.totalBuyInChips * rate
    bb.set(playerRef, {
        playerId: player.id,
        buyInCount: player.buyInChipsList.length,
        totalBuyInCash,
        settleCashAmount: player.settleCashAmount ?? null,
        settleCashDiff: player.settleCashDiff ?? null,
        settleROI: player.settleROI ?? null,
    })
    return { playerRef, totalBuyInCash }
}

export function hasValidEmail(email?: string | null) {
    return typeof email === 'string' && email.includes('@')
}

/**
 * 用户档案与累计统计（现金口径）
 * - buyinInCash: increment(本局买入现金)
 * - totalProfit: increment(本局利润现金)
 * - averageROI: totalProfit / buyinInCash
 */
export async function upsertUserAndCounters(
    bb: BatchBuilder,
    db: any,
    player: Player,
    totalBuyInCash: number
) {
    const userRef = doc(db, userDoc, player.id)
    const userSnap = await getDoc(userRef)
    const existing = userSnap.exists() ? (userSnap.data() as any) : {}

    bb.set(userRef, {
        nickname: player.nickname,
        email: player.email ?? '',
        photoURL: player.photoURL || '',
        isActive: true,
        role: 'player',
        [userSnap.exists() ? 'updated' : 'created']: serverTimestamp(),
    }, { merge: true })

    const playerBuyInCash = totalBuyInCash
    const playerProfitCash = player.settleCashDiff ?? 0

    const currentBuyInCash = existing.buyinInCash ?? 0
    const currentProfit = existing.totalProfit ?? 0
    const newBuyInCash = currentBuyInCash + playerBuyInCash
    const newProfit = currentProfit + playerProfitCash
    const newAverageROI = newBuyInCash === 0 ? 0 : newProfit / newBuyInCash

    bb.update(userRef, {
        buyinInCash: increment(playerBuyInCash),
        totalProfit: increment(playerProfitCash),
        averageROI: newAverageROI,
        gamesPlayed: increment(1),
        lastPlayedAt: serverTimestamp(),
        // wins / losses（可选）
        ...(playerProfitCash > 0 ? { wins: increment(1) } : playerProfitCash < 0 ? { losses: increment(1) } : {}),
    })

    return { userRef, userSnap }
}

export function upsertEmailIndex(bb: BatchBuilder, db: any, player: Player) {
    if (!player.email) return
    const emailKey = player.email.toLowerCase().trim()
    const emailRef = doc(db, 'users-by-email', emailKey)
    bb.set(emailRef, {
        nickname: player.nickname,
        uid: player.id,
        photoURL: player.photoURL ?? '',
        registered: true,
        lastLinkedAt: serverTimestamp(),
    }, { merge: true })
}

export async function ensureUserGameHistory(
    bb: BatchBuilder,
    db: any,
    player: Player,
    gameId: string,
    totalBuyInCash: number
) {
    const gameHistoryRef = doc(db, userDoc, player.id, gameDoc, gameId)
    const snap = await getDoc(gameHistoryRef)
    if (!snap.exists()) {
        bb.set(gameHistoryRef, {
            gameId,
            created: serverTimestamp(),
            settleCashAmount: player.settleCashAmount ?? null,
            settleCashDiff: player.settleCashDiff ?? null,
            settleROI: player.settleROI ?? null,
            totalBuyInChips: player.totalBuyInChips,
            totalBuyInCash,
            result: (player.settleCashDiff ?? 0) > 0 ? 'win' : (player.settleCashDiff ?? 0) < 0 ? 'lose' : 'even',
            finalizedAt: serverTimestamp(),
        })
    }
}

export async function collectGraphWrites(
    bb: BatchBuilder,
    player: Player,
    gameId: string
) {
    const graphResult = await preparePlayerGraphBatch(player, gameId, bb.batch)
    return graphResult // { ref, history } | null
}
