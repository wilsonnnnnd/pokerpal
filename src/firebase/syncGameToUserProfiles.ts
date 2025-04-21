import { db } from '@/firebase/config';
import {
    doc,
    getDoc,
    getDocs,
    writeBatch,
    collection,
    serverTimestamp,
    increment,
} from 'firebase/firestore';
import toast from 'react-native-toast-message';

/**
 * 将一场游戏中所有玩家的数据同步到每位用户的档案中（users-by-uid）
 */
export async function syncGameToUserProfiles(gameId: string) {
    const gameRef = doc(db, 'games', gameId);
    const playersRef = collection(gameRef, 'players');
    const playerSnaps = await getDocs(playersRef);
    toast.show({
        type: 'info',
        text1: '正在同步',
        text2: '请稍候...',
    });
    const batch = writeBatch(db);
    for (const snap of playerSnaps.docs) {
        const player = snap.data();
        const uid = player.playerId;
        const email = player.email?.toLowerCase();

        const userRef = doc(db, 'users-by-uid', uid);
        const emailRef = email ? doc(db, 'users-by-email', email) : null;

        // 1️⃣ 写入/合并用户主档案
        const userSnap = await getDoc(userRef);
        interface UserUpdate {
            nickname: string;
            photoURL: string;
            email: string;
            isActive: boolean;
            updatedAt: ReturnType<typeof serverTimestamp>;
            createdAt?: ReturnType<typeof serverTimestamp>;
        }

        const userUpdate: UserUpdate = {
            nickname: player.nickname,
            photoURL: player.photoURL || '',
            email: player.email || '',
            isActive: true,
            updatedAt: serverTimestamp(),
        };
        if (!userSnap.exists()) {
            userUpdate.createdAt = serverTimestamp();
        }
        batch.set(userRef, userUpdate, { merge: true });

        // 2️⃣ 写入 email → uid 映射
        if (email && emailRef) {
            batch.set(emailRef, { uid, registered: true }, { merge: true });
        }

        // 3️⃣ 写入游戏历史记录
        const gameHistoryRef = doc(db, 'users-by-uid', uid, 'games', gameId);
        batch.set(gameHistoryRef, {
            gameId,
            createdAt: serverTimestamp(),
            totalBuyInChips: player.totalBuyInChips,
            totalBuyInCash: player.totalBuyInCash ?? null,
            settleCashAmount: player.endingChipCount ?? null,
            settleCashDiff: player.cashDifference ?? null,
            settleROI: player.roi ?? null,
        });

        // 4️⃣ 写入统计字段增量
        batch.update(userRef, {
            totalBuyIn: increment(player.totalBuyInChips ?? 0),
            totalProfit: increment(player.cashDifference ?? 0),
            roiSum: increment(player.roi ?? 0),
            gamesPlayed: increment(1),
        });

        // 5️⃣ 写入图表 summary（最多保留最近10条）
        const graphRef = doc(db, 'users-by-uid', uid, 'graphData', 'summary');
        const graphSnap = await getDoc(graphRef);
        const newEntry = {
            gameId,
            diff: player.cashDifference ?? 0,
            roi: player.roi ?? 0,
            ts: Date.now(),
        };

        interface HistoryEntry {
            gameId: string;
            diff: number;
            roi: number;
            ts: number;
        }

        let history: HistoryEntry[] = [];
        if (graphSnap.exists()) {
            const data = graphSnap.data();
            history = Array.isArray(data.history) ? data.history : [];
        }

        const updatedHistory = [newEntry, ...history.filter(h => h.gameId !== gameId)]
            .sort((a, b) => b.ts - a.ts)
            .slice(0, 10);

        batch.set(graphRef, {
            history: updatedHistory,
            updatedAt: serverTimestamp(),
        }, { merge: true });
    }

    // ☁️ 提交所有写操作
    try {
        await batch.commit();
        console.log(`✅ 同步完成：gameId = ${gameId}`);
        toast.show({
            type: 'success',
            text1: '同步完成',
            text2: `游戏数据已成功同步到玩家档案`,
        });
    } catch (error) {
        console.error('❌ 批量写入失败', error);
    }
}
