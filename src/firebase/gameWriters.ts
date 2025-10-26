/**
 * gameWriters.ts
 * --------------
 * Firestore 写入的原子函数集合，供 saveGame.ts 调用。
 */
import {
    doc,
    getDoc,
    increment,
    Timestamp,
} from 'firebase/firestore'
import { BatchBuilder } from './batchBuilder'
import { gameDoc, playerDoc, userByEmailDoc, userDoc } from '@/constants/namingVar'
import { Player } from '@/types'
import { preparePlayerGraphBatch } from './preparePlayerGraphBatch'
import { formatPlayerSnapshot, formatGameNumbers } from '@/utils/formatSnapshot'
import { getHosterId } from '@/utils/hostInfo'

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
export function makeCreateGamePayload(game: {
    gameId: string;
    smallBlind: number;
    bigBlind: number;
    baseCashAmount: number;
    baseChipAmount: number;
    finalized?: boolean;
    token?: string | null;
    createdBy?: string;
    playerCount?: number;
}) {
    const rate = game.baseChipAmount === 0 ? 0 : game.baseCashAmount / game.baseChipAmount;

    return {
        gameId: game.gameId,
        smallBlind: game.smallBlind,
        bigBlind: game.bigBlind,
        baseCashAmount: game.baseCashAmount,
        baseChipAmount: game.baseChipAmount,
        rate,
        playerCount: game.playerCount ?? 0,
        createdBy: game.createdBy ?? null,

        // ✅ 只有创建时写 created
        created: new Date().toISOString(),

        // 更新字段可以在创建时也写一次，问题不大
        updated: new Date().toISOString(),
        finalized: !!game.finalized,
        status: game.finalized ? 'finalized' : 'open',
        token: game.token ?? null,
    };
}

export function makeUpdateGamePayload(patch: Partial<{
    smallBlind: number;
    bigBlind: number;
    baseCashAmount: number;
    baseChipAmount: number;
    finalized: boolean;
    status: string;
    token: string | null;
    playerCount: number;
}>) {
    const base: any = { ...patch };

    // 如传了汇率相关数据，顺带算 rate
    if (typeof patch.baseCashAmount === 'number' && typeof patch.baseChipAmount === 'number') {
        base.rate = patch.baseChipAmount === 0 ? 0 : patch.baseCashAmount / patch.baseChipAmount;
    }

    // ✅ 只在更新时写 updated，不要带上 created
    base.updated = new Date().toISOString();
    return base;
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
    // normalize numeric fields to consistent precision
    const formatted = formatPlayerSnapshot(player, rate);

    bb.set(playerRef, {
        playerId: player.id,
        nickname: player.nickname,
        // use formatted.buyInCount from formatPlayerSnapshot (writer computes from canonical snapshot)
        buyInCount: Number((formatted as any).buyInCount || 0),
        totalBuyInCash: formatted.totalBuyInCash,
        settleCashAmount: formatted.settleCashAmount,
        settleCashDiff: formatted.settleCashDiff,
        settleROI: formatted.settleROI,
    })
    return { playerRef, totalBuyInCash: formatted.totalBuyInCash }
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
        [userSnap.exists() ? 'updated' : 'created']: new Date().toISOString(),
    }, { merge: true })

    const playerBuyInCash = totalBuyInCash
    const playerProfitCash = player.settleCashDiff ?? 0

    const currentBuyInCash = existing.buyinInCash ?? 0
    const currentProfit = existing.totalProfit ?? 0
    const newBuyInCash = currentBuyInCash + playerBuyInCash
    const newProfit = currentProfit + playerProfitCash
        const newAverageROI = newBuyInCash === 0 ? 0 : newProfit / newBuyInCash
        const storedAverageROI = Number(newAverageROI.toFixed(6));

    bb.update(userRef, {
        buyinInCash: increment(playerBuyInCash),
        totalProfit: increment(playerProfitCash),
            averageROI: storedAverageROI,
        gamesPlayed: increment(1),
        lastPlayedAt: new Date().toISOString(),
        // wins / losses（可选）
        ...(playerProfitCash > 0 ? { wins: increment(1) } : playerProfitCash < 0 ? { losses: increment(1) } : {}),
    })

    return { userRef, userSnap }
}

export async function upsertEmailIndex(bb: BatchBuilder, db: any, player: Player) {
    if (!player.email) return
    const emailKey = player.email.toLowerCase().trim()
    const hosterEmail = await getHosterId()
    if (!hosterEmail) return
    const emailRef = doc(db, userByEmailDoc, hosterEmail, playerDoc, emailKey)
    bb.set(emailRef, {
        nickname: player.nickname,
        uid: player.id,
        photoURL: player.photoURL ?? '',
        registered: true,
        lastLinkedAt: new Date().toISOString(),
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
        const formatted = formatPlayerSnapshot(player);
        const gameNums = formatGameNumbers({ baseCashAmount: totalBuyInCash });
        bb.set(gameHistoryRef, {
            gameId,
            created: new Date().toISOString(),
            settleCashAmount: formatted.settleCashAmount ?? null,
            settleCashDiff: formatted.settleCashDiff ?? null,
            settleROI: formatted.settleROI ?? null,
            totalBuyInChips: formatted.totalBuyInChips,
            totalBuyInCash: typeof totalBuyInCash === 'number' ? Number((totalBuyInCash).toFixed(2)) : totalBuyInCash,
            result: (formatted.settleCashDiff ?? 0) > 0 ? 'win' : (formatted.settleCashDiff ?? 0) < 0 ? 'lose' : 'even',
            finalizedAt: new Date().toISOString(),
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
