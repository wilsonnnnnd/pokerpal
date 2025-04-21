import { collection, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Player } from '@/types';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useLogger } from '@/utils/useLogger';
import Toast from 'react-native-toast-message';

function sanitizeRemotePlayer(remote: Partial<Player>, baseChipAmount: number): Player {
    return {
        id: remote.id!,
        nickname: remote.nickname || '未命名',
        email: (remote.email || '').toLowerCase(),
        photoURL: remote.photoURL || '',
        buyInChipsList: Array.isArray(remote.buyInChipsList) ? remote.buyInChipsList : [],
        totalBuyInChips: remote.totalBuyInChips ?? baseChipAmount,
        isActive: remote.isActive ?? true,
        joinAt: remote.joinAt || new Date().toISOString(),
        isSyncing: remote.isSyncing ?? false,

        // 🆕 统一 settle 命名字段
        settleChipCount: remote.settleChipCount ?? undefined,
        settleChipDiff: remote.settleChipDiff ?? undefined,
        settleCashDiff: remote.settleCashDiff ?? undefined,
        settleCashAmount: remote.settleCashAmount ?? undefined,
        settleROI: remote.settleROI ?? undefined,
        finalized: remote.finalized ?? false,
    };
}

let unsubscribeRef: Unsubscribe | null = null;
let currentGameIdRef: string | null = null;

export function startPlayerSyncListener(
    gameId: string,
    baseChipAmount: number,
    enabled = true,
    logFn: ReturnType<typeof useLogger>['log']
) {
    const { mergePlayers, setSyncing } = usePlayerStore.getState();

    if (!enabled) {
        logFn('Sync', '🛑 取消监听条件满足，终止远程玩家监听');
        stopPlayerSyncListener(logFn);
        return;
    }

    if (currentGameIdRef === gameId) {
        logFn('Sync', `⚠️ 已监听 gameId=${gameId}，跳过重复监听`);
        return;
    }

    stopPlayerSyncListener(logFn);
    logFn('Sync', `📡 开始监听远程玩家数据 gameId=${gameId}`);
    currentGameIdRef = gameId;
    setSyncing(true);

    const playerRef = collection(db, `games/${gameId}/players`);
    unsubscribeRef = onSnapshot(
        playerRef,
        (snapshot) => {
            const remotePlayers = snapshot.docs.map((doc) => {
                const raw = doc.data();
                return sanitizeRemotePlayer({ id: doc.id, ...raw }, baseChipAmount);
            });

            mergePlayers(remotePlayers);
            logFn('Sync', `✅ 合并 ${remotePlayers.length} 位远程玩家数据`);
            setSyncing(false);
        },
        (error) => {
            console.error('Error syncing players:', error);
            setSyncing(false);
            Toast.show({
                type: 'error',
                text1: '同步失败',
                text2: '无法从服务器获取玩家数据',
            });
        }
    );
}

export function stopPlayerSyncListener(logFn: ReturnType<typeof useLogger>['log']) {
    if (unsubscribeRef) {
        unsubscribeRef();
        unsubscribeRef = null;
        logFn('Sync', `🛑 取消监听 gameId=${currentGameIdRef}`);
    }
    currentGameIdRef = null;
}
