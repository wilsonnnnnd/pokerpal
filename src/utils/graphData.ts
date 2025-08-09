import {
    doc,
    getDoc,
    serverTimestamp,
    writeBatch,
    Timestamp,
    FieldValue,
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import { userDoc } from '@/constants/namingDb'

// 玩家图表数据结构
export type GraphPoint = {
    gameId: string
    diff: number
    roi: number
    ts: Timestamp | String | FieldValue
}

/**
 * ✅ 添加一条记录到玩家图表数据中
 */
export async function addPlayerGraphEntry(
    playerId: string,
    gameId: string,
    diff: number,
    roi: number,
    batch: ReturnType<typeof writeBatch>,
) {
    const graphRef = doc(db, userDoc, playerId, 'graphData', 'summary')
    const snapshot = await getDoc(graphRef)

    const newEntry: GraphPoint = {
        gameId,
        diff,
        roi,
        ts: serverTimestamp(), // Firestore 会自动替换为服务器时间
    }

    let history: GraphPoint[] = []

    if (snapshot.exists()) {
        const data = snapshot.data()
        history = Array.isArray(data.history) ? data.history : []
    }

    const merged = mergeGraphHistory(history, newEntry)

    batch.set(graphRef, {
        history: merged,
        updated: serverTimestamp(),
    }, { merge: true })
}

/**
 * ✅ 合并旧历史 + 新记录，只保留最近 10 条
 */
export function mergeGraphHistory(history: GraphPoint[], newEntry: GraphPoint): GraphPoint[] {
    const map = new Map<string, GraphPoint>()

    // 过滤合法历史（ts 是 Timestamp 类型）
    for (const item of history) {
        if (item.gameId && item.ts instanceof Timestamp) {
            map.set(item.gameId, item)
        }
    }

    map.set(newEntry.gameId, newEntry)

    // 排序 + 截断
    const sorted = Array.from(map.values())
        .sort((a, b) => getTimestampValue(b.ts) - getTimestampValue(a.ts))
        .slice(0, 10)

    return sorted
}

/**
 * ✅ 提取时间戳（毫秒数）
 */
function getTimestampValue(ts: Timestamp | String | FieldValue): number {
    if (ts instanceof Timestamp) {
        return ts.toMillis();
    }
    if (typeof ts === 'string') {
        return 0; // Handle string case if needed
    }
    // Handle FieldValue case (e.g., serverTimestamp)
    return 0;
}
