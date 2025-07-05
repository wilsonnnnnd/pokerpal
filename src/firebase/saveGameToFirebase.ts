import { db } from '@/firebase/config'
import {
    doc,
    setDoc,
    writeBatch,
    increment,
    serverTimestamp,
    getDoc,
    FieldValue,
    Timestamp,
} from 'firebase/firestore'
import { useGameStore } from '@/stores/useGameStore'
import { Player } from '@/types'
import { playerDoc, gameDoc, userDoc } from '@/constants/namingDb'
import Toast from 'react-native-toast-message'
import { logInfo } from '@/utils/useLogger'
import { cacheGameForRetry } from '@/utils/gameCache'
import { preparePlayerGraphBatch } from './preparePlayerGraphBatch'

type GraphPoint = {
    gameId: string
    diff: number
    roi: number
    ts: Timestamp | FieldValue
}

export async function saveGameToFirebase(gameId: string, players?: Player[]): Promise<void> {
    const game = useGameStore.getState()
    const batch = writeBatch(db)
    const rate = game.baseCashAmount / game.baseChipAmount
    const isOngoing = players?.length !== 0
    const host = 'host'
    const originalGameState = { ...useGameStore.getState() }

    const gameRef = doc(db, gameDoc, gameId)
    batch.set(gameRef, {
        gameId,
        smallBlind: game.smallBlind,
        bigBlind: game.bigBlind,
        baseCashAmount: game.baseCashAmount,
        baseChipAmount: game.baseChipAmount,
        playerCount: players?.length ?? 0,
        createdBy: host,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        finalized: !isOngoing,
        status: isOngoing ? 'ongoing' : 'finished',
        token: game.token,
    })


    let operationCount = 1
    const graphWrites: { ref: ReturnType<typeof doc>, history: GraphPoint[] }[] = []

    for (const player of players ?? []) {
        const playerRef = doc(db, gameDoc, gameId, playerDoc, player.id)
        const totalBuyInCash = player.totalBuyInChips * rate
        batch.set(playerRef, {
            playerId: player.id,
            nickname: player.nickname,
            email: player.email || null,
            photoURL: player.photoURL || null,
            buyInCount: player.buyInChipsList.length,
            totalBuyInCash,
            settleCashAmount: player.settleCashAmount ?? null,
            settleCashDiff: player.settleCashDiff ?? null,
            settleROI: player.settleROI ?? null,
        })


        const hasValidEmail = typeof player.email === 'string' && player.email.includes('@')
        if (!hasValidEmail) {
            console.warn(`⚠️ 跳过未绑定邮箱的玩家：${player.nickname}`)
            continue
        }

        const userRef = doc(db, userDoc, player.id)
        const emailRef = player.email ? doc(db, 'users-by-email', player.email.toLowerCase()) : null
        const userSnap = await getDoc(userRef)
        const userData: any = {
            nickname: player.nickname,
            email: player.email,
            photoURL: player.photoURL || '',
            isActive: true,
            role: 'player',
            [userSnap.exists() ? 'updatedAt' : 'createdAt']: serverTimestamp(),
        }

        batch.set(userRef, userData, { merge: true })

        const playerBuyIn = player.totalBuyInChips
        const playerProfit = player.settleCashDiff ?? 0
        const existing = userSnap.exists() ? userSnap.data() : {}
        const currentBuyIn = existing.totalBuyIn ?? 0
        const currentProfit = existing.totalProfit ?? 0
        const newBuyIn = currentBuyIn + playerBuyIn
        const newProfit = currentProfit + playerProfit
        const newAverageROI = newBuyIn === 0 ? 0 : newProfit / newBuyIn

        batch.update(userRef, {
            totalBuyIn: increment(playerBuyIn),
            totalProfit: increment(playerProfit),
            averageROI: newAverageROI,
            gamesPlayed: increment(1),
        })

        operationCount += 5

        if (emailRef) {
            batch.set(emailRef, {
                nickname: player.nickname,
                uid: player.id,
                photoURL: player.photoURL,
                registered: true,
            }, { merge: true })
            operationCount++
        }

        const gameHistoryRef = doc(db, userDoc, player.id, 'games', gameId)
        const gameHistorySnap = await getDoc(gameHistoryRef)
        if (!gameHistorySnap.exists()) {
            batch.set(gameHistoryRef, {
                gameId,
                createdAt: serverTimestamp(),
                settleCashAmount: player.settleCashAmount ?? null,
                settleCashDiff: player.settleCashDiff ?? null,
                settleROI: player.settleROI ?? null,
                totalBuyInChips: player.totalBuyInChips,
                totalBuyInCash,
            })
            operationCount++
        }
        const graphResult = await preparePlayerGraphBatch(player, gameId, batch)

        if (graphResult) {
            graphWrites.push(graphResult)

        }
    }

    try {
        if (operationCount > 450) {
            throw new Error('批处理操作超出Firebase限制(500)，请减少玩家数量')
        }

        await batch.commit()


        for (const { ref, history } of graphWrites) {
            const snap = await getDoc(ref)
            const saved = snap.data()?.history ?? []
            const savedIds = saved.map((i: any) => i.gameId).sort()
            const expectedIds = history.map(i => i.gameId).sort()


        }

        Toast.show({
            type: 'success',
            text1: '✅ 上传成功',
            text2: `已保存游戏 ${gameId}，共 ${players?.length ?? 0} 位玩家记录`,
            visibilityTime: 2500,
            position: 'bottom',
        })
    } catch (err: any) {
        console.error('Error saving game to Firebase:', err)
        useGameStore.setState(originalGameState)

        let errorMessage = '游戏保存失败，请检查网络'
        if (err?.code === 'permission-denied') {
            errorMessage = '权限不足，需要管理员账户'
        } else if (err?.code === 'auth/admin-restricted-operation') {
            errorMessage = '管理员操作受限，请重新登录'
        } else if (err.message) {
            errorMessage = err.message
        }

        await cacheGameForRetry(gameId, players || [])

        Toast.show({
            type: 'error',
            text1: '❌ 上传失败',
            text2: errorMessage,
            visibilityTime: 3000,
            position: 'bottom',
        })
    }
}
