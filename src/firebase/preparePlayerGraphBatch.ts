import { db } from '@/firebase/config'
import { doc, getDoc, serverTimestamp, Timestamp, writeBatch } from 'firebase/firestore'
import { Player } from '@/types'
import { userDoc } from '@/constants/namingDb'
import { logInfo } from '@/utils/useLogger'

type GraphPoint = {
    gameId: string;
    diff: number;
    roi: number;
    ts: Timestamp;
};

export async function preparePlayerGraphBatch(
    player: Player,
    gameId: string,
    batch: ReturnType<typeof writeBatch>
): Promise<{ ref: ReturnType<typeof doc>, history: GraphPoint[] } | null> {
    if (!player.finalized || player.settleCashDiff == null || player.settleROI == null) {
        return null;
    }

    const graphRef = doc(db, userDoc, player.id, 'graphData', 'summary');
    const snapshot = await getDoc(graphRef);

    const newEntry: GraphPoint = {
        gameId,
        diff: player.settleCashDiff,
        roi: player.settleROI,
        ts: Timestamp.now(),
    };

    const graphMap = new Map<string, GraphPoint>();
    if (snapshot.exists()) {
        const data = snapshot.data();
        const history = Array.isArray(data.history) ? data.history : [];
        for (const item of history) {
            try {
                const isValidTimestamp = item.ts instanceof Timestamp;
                if (item.gameId && isValidTimestamp) {
                    graphMap.set(item.gameId, item);
                } else {
                    logInfo('Error', `❌ 无效 graph 数据: ${JSON.stringify(item)}`);
                }
            } catch (e) {
                console.error('🔥 遍历 graph history 出错:', e);
            }
        }
    }

    graphMap.set(gameId, newEntry);

    const sortedHistory = Array.from(graphMap.values())
        .sort((a, b) => b.ts.toMillis() - a.ts.toMillis())
        .slice(0, 10);

    batch.set(
        graphRef,
        {
            history: sortedHistory,
            updated: Timestamp.now(),
        },
        { merge: true }
    );

    return { ref: graphRef, history: sortedHistory };
}
