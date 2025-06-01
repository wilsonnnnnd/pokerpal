import { db } from '@/firebase/config'
import { doc, getDoc, serverTimestamp, Timestamp, FieldValue, writeBatch } from 'firebase/firestore'
import { Player } from '@/types'
import { userDoc } from '@/constants/namingDb'
import { logInfo } from '@/utils/useLogger'

type GraphPoint = {
    gameId: string
    diff: number
    roi: number
    ts: Timestamp | FieldValue
}

export async function preparePlayerGraphBatch(
    player: Player,
    gameId: string,
    batch: ReturnType<typeof writeBatch>
): Promise<{ ref: ReturnType<typeof doc>, history: GraphPoint[] } | null> {
    if (!player.finalized || player.settleCashDiff == null || player.settleROI == null) {
        return null
    }

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
            try {
                const isValidTimestamp = typeof item.ts === 'number' || item.ts instanceof Timestamp
                if (item.gameId && isValidTimestamp) {
                    graphMap.set(item.gameId, item)
                } else {
                    logInfo('Error', `❌ 无效 graph 数据: ${JSON.stringify(item)}`)
                }
            } catch (e) {
                console.error('🔥 遍历 graph history 出错:', e)
            }
        }

    }

    graphMap.set(gameId, newEntry)

    const sortedHistory = Array.from(graphMap.values())
        .sort((a, b) => {
            const getTime = (item: GraphPoint) => {
                if (item.ts instanceof Timestamp) return item.ts.toMillis()
                return item.gameId === gameId ? Date.now() : 0
            }
            const ta = getTime(a)
            const tb = getTime(b)
            return tb - ta
        })
        .slice(0, 10)
    const now = Timestamp.now()
    const safeHistory = sortedHistory.map(item => ({
        gameId: item.gameId,
        diff: item.diff,
        roi: item.roi,
        ts: item.ts instanceof Timestamp ? item.ts : now,
    }))

    batch.set(graphRef, {
        history: safeHistory,
        updatedAt: serverTimestamp(),
    }, { merge: true })
    return { ref: graphRef, history: safeHistory }
}
