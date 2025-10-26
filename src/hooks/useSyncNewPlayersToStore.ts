import { collection, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Player } from '@/types';
import normalizePlayer from '@/utils/normalizePlayer';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useLogger } from '@/utils/useLogger';
import Toast from 'react-native-toast-message';
import { gameDoc, playerDoc } from '@/constants/namingVar';

function sanitizeRemotePlayer(remote: Partial<Player>, baseChipAmount: number): Player {
    // Use central normalizer; pass rate=0 (no cash derivation here) and baseChipAmount
    const normalized = normalizePlayer(remote, 0, baseChipAmount);
    // Ensure email casing and keep settle fields from remote if present
    return {
        ...normalized,
        email: (remote.email || '').toLowerCase(),
        settleChipCount: remote.settleChipCount ?? normalized.settleChipCount,
        settleChipDiff: remote.settleChipDiff ?? normalized.settleChipDiff,
        settleCashDiff: remote.settleCashDiff ?? normalized.settleCashDiff,
        settleCashAmount: remote.settleCashAmount ?? normalized.settleCashAmount,
        settleROI: remote.settleROI ?? normalized.settleROI,
        finalized: remote.finalized ?? normalized.finalized,
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
