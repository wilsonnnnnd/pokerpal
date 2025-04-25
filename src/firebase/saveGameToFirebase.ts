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
import { useAuthStore } from '@/stores/useAuthStore'
import { logInfo } from '@/utils/useLogger';

type GraphPoint = {
    gameId: string
    diff: number
    roi: number
    ts: Timestamp | FieldValue
}

// ✅ 写入图表数据（用于折线图展示，保留最近 10 条）
async function preparePlayerGraphBatch(player: Player, gameId: string, batch: ReturnType<typeof writeBatch>) {
    if (!player.finalized || player.settleCashDiff == null || player.settleROI == null) {
        return
    }

    const graphRef = doc(db, userDoc, player.id, 'graphData', 'summary')
    const snapshot = await getDoc(graphRef)

    const newEntry: GraphPoint = {
        gameId,
        diff: player.settleCashDiff,
        roi: player.settleROI,
        ts: serverTimestamp(),      // 仍然保留
    }

    const graphMap = new Map<string, GraphPoint>()

    if (snapshot.exists()) {
        const data = snapshot.data()
        const history = Array.isArray(data.history) ? data.history : []

        for (const item of history) {
            if (item.gameId && (typeof item.ts === 'number' || item.ts instanceof Timestamp)) {
                graphMap.set(item.gameId, item)
            } else {
                logInfo('Error', `Invalid graph data for gameId: ${item.gameId}`)
            }
        }
    }

    graphMap.set(gameId, newEntry)


    const sortedHistory = Array.from(graphMap.values())
        .sort((a, b) => {
            const getTime = (item: GraphPoint) => {
                if (item.ts instanceof Timestamp) return item.ts.toMillis();
                // 对于新添加的项目，使用当前时间戳确保排在最前
                return item.gameId === gameId ? Date.now() : 0;
            }
            return getTime(b) - getTime(a);
        })
        .slice(0, 10);

    // ✅ 最终写入 batch
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
    const host = useAuthStore.getState().user?.displayName

    const originalGameState = { ...useGameStore.getState() }


    // 1️⃣ 写入游戏主数据（不需要 merge，每局都是新记录）
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

    let operationCount = 1; // Initialize operation count with 1 for the game main data

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
            role: 'player',
            [userSnap.exists() ? 'updatedAt' : 'createdAt']: serverTimestamp(),
        }

        batch.set(userRef, userData, { merge: true })

        // 5️⃣ 累加用户统计字段（buyIn、盈亏、ROI、对局数）
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

        operationCount += 5; 

        // 6️⃣ 写入 email 映射（防止误覆盖 role 字段）
        if (emailRef) {
            batch.set(emailRef, {
                nickname: player.nickname,
                uid: player.id,
                registered: true,
            }, { merge: true })
            operationCount++;
        }

        // 7️⃣ 玩家游戏历史（避免重复写入）
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
            operationCount++;
        }



        // 8️⃣ 更新玩家图表数据（保留最近 10 条）
        await preparePlayerGraphBatch(player, gameId, batch)
    }

    // 9️⃣ 批量提交写入
    try {
        let operationCount = 1; // 游戏主数据
        operationCount += (players?.length || 0) * 5; // 每个玩家约5个操作

        if (operationCount > 450) { // 留出安全余量
            throw new Error('批处理操作超出Firebase限制(500)，请减少玩家数量');
        }
        await batch.commit()
        Toast.show({
            type: 'success',
            text1: '✅ 上传成功',
            text2: `已保存游戏 ${gameId}，共 ${players?.length ?? 0} 位玩家记录`,
            visibilityTime: 2500,
            position: 'bottom',
        })
    } catch (err: any) {
        console.error('Error saving game to Firebase:', err);
        useGameStore.setState(originalGameState);
        
        let errorMessage = '游戏保存失败，请检查网络';
        if (err?.code === 'permission-denied') {
            errorMessage = '权限不足，需要管理员账户';
        } else if (err?.code === 'auth/admin-restricted-operation') {
            errorMessage = '管理员操作受限，请重新登录';
        } else if (err.message) {
            errorMessage = err.message;
        }
        
        Toast.show({
            type: 'error',
            text1: '❌ 上传失败',
            text2: errorMessage,
            visibilityTime: 3000,
            position: 'bottom',
        });
    }
}
