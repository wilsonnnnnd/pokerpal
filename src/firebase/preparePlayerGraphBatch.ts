/**
 * preparePlayerGraphBatch
 * -----------------------
 * 生成/合并玩家盈利曲线，加入外部批处理；按 gameId 幂等，仅保留最近 10 条。
 */
import { db } from '@/firebase/config'
import { doc, getDoc, Timestamp, WriteBatch } from 'firebase/firestore'
import { Player } from '@/types'
import { userDoc, userGraphDoc, userRecordDoc } from '@/constants/namingDb'

export type GraphPoint = {
    gameId: string
    diff: number
    roi: number
    ts: Timestamp
}

export async function preparePlayerGraphBatch(
    player: Player,
    gameId: string,
    batch: WriteBatch,
    limitN = 10
) {
    // 路径：users/{uid}/graph/record
    const graphRef = doc(db, userDoc, player.id, userGraphDoc, userRecordDoc)
    const snap = await getDoc(graphRef)
    const existed: GraphPoint[] = (snap.exists() ? (snap.data()?.history ?? []) : []) as GraphPoint[]

    // 基于 gameId 幂等合并
    const map = new Map<string, GraphPoint>()
    for (const p of existed) {
        if (p && p.gameId) map.set(p.gameId, p)
    }

    // 追加/覆盖当前局数据点
    const point: GraphPoint = {
        gameId,
        diff: player.settleCashDiff ?? 0,
        roi: player.settleROI ?? 0,
        ts: Timestamp.now(),
    }
    map.set(gameId, point)

    // 只保留最近 N 条
    const history = Array.from(map.values())
        .sort((a, b) => b.ts.toMillis() - a.ts.toMillis())
        .slice(0, limitN)

    // 加入外部批处理（注意：不在这里 commit）
    batch.set(graphRef, { history, updated: Timestamp.now() }, { merge: true })
    return { ref: graphRef, history }
}
