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

type GraphPoint = {
    gameId: string
    diff: number
    roi: number
    ts: Timestamp | FieldValue
}

// ✅ 写入图表数据（用于折线图展示，保留最近 10 条）
async function preparePlayerGraphBatch(player: Player, gameId: string, batch: ReturnType<typeof writeBatch>) {
    if (!player.finalized || player.settleCashDiff == null || player.settleROI == null) return

    const graphRef = doc(db, userDoc, player.id, 'graphData', 'summary')
    const snapshot = await getDoc(graphRef)

    const newEntry: GraphPoint = {
        gameId,
        diff: player.settleCashDiff,
        roi: player.settleROI,
        ts: serverTimestamp(),
    }

    const graphMap = new Map<string, GraphPoint>()

    if (snapshot.exists()) {
        const data = snapshot.data()
        const history = Array.isArray(data.history) ? data.history : []
        for (const item of history) {
            if (item.gameId && typeof item.ts === 'number') {
                graphMap.set(item.gameId, item)
            }
        }
    }

    graphMap.set(gameId, newEntry)

    const sortedHistory = Array.from(graphMap.values())
        .sort((a, b) => {
            const getTime = (ts: GraphPoint['ts']) => {
                if (ts instanceof Timestamp) return ts.toMillis()
                return 0 // FieldValue（如 serverTimestamp()）无法排序
            }

            return getTime(b.ts) - getTime(a.ts)
        })
        .slice(0, 10)

    // ✅ 使用 merge 保留其他字段
    batch.set(graphRef, {
        history: sortedHistory,
        updatedAt: serverTimestamp(),
    }, { merge: true })
}

// ✅ 保存整场游戏和玩家信息至 Firebase
export async function saveGameToFirebase(gameId: string, players?: Player[]): Promise<void> {
    const game = useGameStore.getState()
    const batch = writeBatch(db)
    const rate = game.baseCashAmount / game.baseChipAmount
    const isOngoing = players?.length !== 0

    // 1️⃣ 写入游戏主数据（不需要 merge，每局都是新记录）
    const gameRef = doc(db, gameDoc, gameId)
    batch.set(gameRef, {
        gameId,

        smallBlind: game.smallBlind,
        bigBlind: game.bigBlind,
        baseCashAmount: game.baseCashAmount,
        baseChipAmount: game.baseChipAmount,
        playerCount: players?.length ?? 0,
        createdBy: 'host@hdpoker.xyz',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        finalized: !isOngoing,
        status: isOngoing ? 'ongoing' : 'finished',
        token: game.token,
    })

    for (const player of players ?? []) {
        const playerRef = doc(db, gameDoc, gameId, playerDoc, player.id)
        const totalBuyInCash = player.totalBuyInChips * rate

        // 2️⃣ 保存玩家在该局游戏中的表现
        batch.set(playerRef, {
            playerId: player.id,
            nickname: player.nickname,
            email: player.email || null,
            photoURL: player.photoURL || null,
            buyInCount: player.buyInChipsList.length,
            totalBuyInChips: player.totalBuyInChips,
            totalBuyInCash,
            settleCashAmount: player.settleCashAmount ?? null,
            settleCashDiff: player.settleCashDiff ?? null,
            settleROI: player.settleROI ?? null,
        })

        // 3️⃣ 检查 email 合法性（避免空 email）
        const hasValidEmail = typeof player.email === 'string' && player.email.includes('@')
        if (!hasValidEmail) {
            console.warn(`⚠️ 跳过未绑定邮箱的玩家：${player.nickname}`)
            continue
        }

        const userRef = doc(db, userDoc, player.id)
        const emailRef = player.email
            ? doc(db, 'users-by-email', player.email.toLowerCase())
            : null

        // 4️⃣ 写入/更新用户档案
        const userSnap = await getDoc(userRef)
        const userData: any = {
            nickname: player.nickname,
            email: player.email,
            photoURL: player.photoURL || '',
            isActive: true,
            [userSnap.exists() ? 'updatedAt' : 'createdAt']: serverTimestamp(),
        }

        batch.set(userRef, userData, { merge: true })

        // 5️⃣ 写入 email 映射（防止误覆盖 role 字段）
        if (emailRef) {
            batch.set(emailRef, {
                nickname: player.nickname,
                uid: player.id,
                registered: true,
            }, { merge: true })
        }

        // 6️⃣ 玩家游戏历史（避免重复写入）
        const gameHistoryRef = doc(db, userDoc, player.id, 'games', gameId)
        const gameHistorySnap = await getDoc(gameHistoryRef)
        if (!gameHistorySnap.exists()) {
            batch.set(gameHistoryRef, {
                gameId,
                createdAt: serverTimestamp(),
                totalBuyInChips: player.totalBuyInChips,
                totalBuyInCash,
                settleCashAmount: player.settleCashAmount ?? null,
                settleCashDiff: player.settleCashDiff ?? null,
                settleROI: player.settleROI ?? null,
            })
        }

        // 7️⃣ 累加用户统计字段（buyIn、盈亏、ROI、对局数）
        batch.update(userRef, {
            totalBuyIn: increment(player.totalBuyInChips),
            totalProfit: increment(player.settleCashDiff ?? 0),
            roiSum: increment(player.settleROI ?? 0),
            gamesPlayed: increment(1),
        })

        // 8️⃣ 更新玩家图表数据（保留最近 10 条）
        await preparePlayerGraphBatch(player, gameId, batch)
    }

    // 9️⃣ 批量提交写入
    try {
        await batch.commit()
        Toast.show({
            type: 'success',
            text1: '✅ 上传成功',
            text2: `已保存游戏 ${gameId}，共 ${players?.length ?? 0} 位玩家记录`,
            visibilityTime: 2500,
            position: 'bottom',
        })
    } catch (err) {
        console.error('Error saving game to Firebase:', err)
        Toast.show({
            type: 'error',
            text1: '❌ 上传失败',
            text2: `游戏 ${gameId} 保存失败，请检查网络`,
            visibilityTime: 3000,
            position: 'bottom',
        })
    }
}
function slice(arg0: number, arg1: number) {
    throw new Error('Function not implemented.')
}

