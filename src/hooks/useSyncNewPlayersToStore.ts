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
        totalBuyInChips: baseChipAmount,
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

    logFn('Sync', `📡 Attempting to start listener for gameId=${gameId}`);
    if (!enabled) {
        logFn('Sync', '🛑 Listener not enabled, skipping.');
        stopPlayerSyncListener(logFn);
        return;
    }

    if (currentGameIdRef === gameId) {
        logFn('Sync', `⚠️ Listener already active for gameId=${gameId}, skipping.`);
        return;
    }

    stopPlayerSyncListener(logFn);
    logFn('Sync', `📡 Starting new listener for gameId=${gameId}`);
    currentGameIdRef = gameId;
    setSyncing(true);

    const playerRef = collection(db, `games/${gameId}/players`);
    unsubscribeRef = onSnapshot(
        playerRef,
        (snapshot) => {
            logFn('Sync', `✅ Received ${snapshot.docs.length} remote players for gameId=${gameId}`);
            const remotePlayers = snapshot.docs.map((doc) => {
                const raw = doc.data();
                logFn('Sync', `Player data: ${JSON.stringify(raw)}`);
                return sanitizeRemotePlayer({ id: doc.id, ...raw }, baseChipAmount);
            });

            mergePlayers(remotePlayers);
            logFn('Sync', `✅ 合并 ${remotePlayers.length} 位远程玩家数据`);
            setSyncing(false);
        },
        (error) => {
            console.error('Error syncing players:', error);
            setSyncing(false);
            logFn('Sync', `❌ Error syncing players for gameId=${gameId}: ${error.message}`);
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
