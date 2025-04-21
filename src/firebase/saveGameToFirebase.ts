import { db } from '@/firebase/config';
import {
    doc,
    setDoc,
    writeBatch,
    increment,
    serverTimestamp,
    getDoc,
} from 'firebase/firestore';
import { useGameStore } from '@/stores/useGameStore';
import { Player } from '@/types';
import { playerDoc, gameDoc, userDoc } from '@/constants/namingDb';
import Toast from 'react-native-toast-message';

type GraphPoint = {
    gameId: string;
    diff: number;
    roi: number;
    ts: number;
};

// ✅ 写入图表数据（用于折线图展示）
async function preparePlayerGraphBatch(player: Player, gameId: string, batch: ReturnType<typeof writeBatch>) {
    if (!player.finalized || player.settleCashDiff == null || player.settleROI == null) return;

    const graphRef = doc(db, userDoc, player.id, 'graphData', 'summary');
    const snapshot = await getDoc(graphRef);

    const newEntry: GraphPoint = {
        gameId,
        diff: player.settleCashDiff,
        roi: player.settleROI,
        ts: Date.now(),
    };

    const graphMap = new Map<string, GraphPoint>();

    if (snapshot.exists()) {
        const data = snapshot.data();
        const history = Array.isArray(data.history) ? data.history : [];
        for (const item of history) {
            if (item.gameId && typeof item.ts === 'number') {
                graphMap.set(item.gameId, item);
            }
        }
    }

    graphMap.set(gameId, newEntry);

    const sortedHistory = Array.from(graphMap.values())
        .sort((a, b) => b.ts - a.ts)
        .slice(0, 10);

    batch.set(graphRef, {
        history: sortedHistory,
        updatedAt: serverTimestamp(),
    }, { merge: true });
}

// ✅ 保存整场游戏和玩家信息至 Firebase
export async function saveGameToFirebase(gameId: string, players?: Player[]): Promise<void> {
    const game = useGameStore.getState();
    const batch = writeBatch(db);
    const rate = game.baseCashAmount / game.baseChipAmount;
    const isOngoing = players?.length !== 0;

    // 1️⃣ 写入游戏主数据
    const gameRef = doc(db, gameDoc, gameId);
    batch.set(gameRef, {
        gameId,
        startTime: game.startTime,
        endTime: new Date().toISOString(),
        smallBlind: game.smallBlind,
        bigBlind: game.bigBlind,
        baseCashAmount: game.baseCashAmount,
        baseChipAmount: game.baseChipAmount,
        playerCount: players?.length ?? 0,
        createdBy: 'host@hdpoker.xyz',
        createdAt: serverTimestamp(),
        finalized: !isOngoing,
        status: isOngoing ? 'ongoing' : 'finished',
        token: game.token,
    });

    for (const player of players ?? []) {
        const playerRef = doc(db, gameDoc, gameId, playerDoc, player.id);
        const totalBuyInCash = player.totalBuyInChips * rate;

        // ✅ 保存玩家在该游戏中的表现
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
        });

        // ✅ 检查 email 是否存在且合法（避免空值写入）
        const hasValidEmail =
            typeof player.email === 'string' && player.email.includes('@');

        if (!hasValidEmail) {
            console.warn(`⚠️ 跳过未绑定邮箱的玩家：${player.nickname}`);
            continue;
        }

        const userRef = doc(db, userDoc, player.id);
        const emailRef = player.email
            ? doc(db, 'users-by-email', player.email.toLowerCase())
            : null;

        // ✅ 获取已有用户（判断是否新用户）
        const userSnap = await getDoc(userRef);
        const userData: any = {
            nickname: player.nickname,
            email: player.email,
            photoURL: player.photoURL || '',
            isActive: true,
        };

        if (!userSnap.exists()) {
            userData.createdAt = serverTimestamp();
        } else {
            userData.updatedAt = serverTimestamp();
        }

        // ✅ 写入档案 & email 映射
        batch.set(userRef, userData, { merge: true });
        if (emailRef) {
            batch.set(emailRef, {
                uid: player.id,
                registered: true,
            });
        }

        // ✅ 玩家游戏历史记录
        const gameHistoryRef = doc(db, userDoc, player.id, 'games', gameId);
        batch.set(gameHistoryRef, {
            gameId,
            createdAt: serverTimestamp(),
            totalBuyInChips: player.totalBuyInChips,
            totalBuyInCash,
            settleCashAmount: player.settleCashAmount ?? null,
            settleCashDiff: player.settleCashDiff ?? null,
            settleROI: player.settleROI ?? null,
        });

        // ✅ 累加总统计字段（注意 null 安全）
        batch.update(userRef, {
            totalBuyIn: increment(player.totalBuyInChips),
            totalProfit: increment(player.settleCashDiff ?? 0),
            roiSum: increment(player.settleROI ?? 0),
            gamesPlayed: increment(1),
        });

        // ✅ 图表折线图数据（summary/history）
        await preparePlayerGraphBatch(player, gameId, batch);
    }

    // 7️⃣ 提交写入
    try {
        await batch.commit();
        Toast.show({
            type: 'success',
            text1: '✅ 上传成功',
            text2: `已保存游戏 ${gameId}，共 ${players?.length ?? 0} 位玩家记录`,
            visibilityTime: 2500,
            position: 'bottom',
        });
    } catch (err) {
        console.error('Error saving game to Firebase:', err);
        Toast.show({
            type: 'error',
            text1: '❌ 上传失败',
            text2: `游戏 ${gameId} 保存失败，请检查网络`,
            visibilityTime: 3000,
            position: 'bottom',
        });
    }
}
