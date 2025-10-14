import { collection, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Player } from '@/types';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useLogger } from '@/utils/useLogger';
import Toast from 'react-native-toast-message';
import { gameDoc, playerDoc } from '@/constants/namingVar';

function sanitizeRemotePlayer(remote: Partial<Player>, baseChipAmount: number): Player {
    return {
        id: remote.id!,
        nickname: remote.nickname || '未命名',
        email: (remote.email || '').toLowerCase(),
        photoURL: remote.photoURL || '',
        buyInChipsList: Array.isArray(remote.buyInChipsList) ? remote.buyInChipsList : [],
        totalBuyInChips: baseChipAmount,
        isActive: remote.isActive ?? true,
        joinAt: remote.joinAt || '',
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
    logFn?: ReturnType<typeof useLogger>['log']
) {
    const { mergePlayers, setSyncing } = usePlayerStore.getState();

    if (!enabled) {

        stopPlayerSyncListener();
        return;
    }

    if (currentGameIdRef === gameId) {
        return;
    }

    stopPlayerSyncListener();
    currentGameIdRef = gameId;
    setSyncing(true);

    const playerRef = collection(db, gameDoc, gameId, playerDoc);
    unsubscribeRef = onSnapshot(
        playerRef,
        (snapshot) => {
    
            const remotePlayers = snapshot.docs.map((doc) => {
                const raw = doc.data();

                const sanitizedPlayer = sanitizeRemotePlayer({ id: doc.id, ...raw }, baseChipAmount);
 
                return sanitizedPlayer;
            });
            mergePlayers(remotePlayers);
            setSyncing(false);
        },
        (error) => {
            setSyncing(false);
            console.error(`❌ Error syncing players for gameId=${gameId}:`, error.message);
            Toast.show({
                type: 'error',
                text1: '同步失败',
                text2: '无法从服务器获取玩家数据',
            });
        }
    );
}

export function stopPlayerSyncListener(logFn?: ReturnType<typeof useLogger>['log']) {
    if (unsubscribeRef) {
        unsubscribeRef();
        unsubscribeRef = null;
    }
    currentGameIdRef = null;
}
