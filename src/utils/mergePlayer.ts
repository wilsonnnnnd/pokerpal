import { Player } from '@/types'

/**
 * 合并本地和远程玩家数据，优先保留本地已有的有效信息
 */
export function mergePlayerData(local: Player, remote: Player): Player {
    return {
        ...remote,

        // ID & 基础信息（远程优先，但 fallback 到本地）
        id: remote.id || local.id,
        nickname: remote.nickname || local.nickname,
        email: remote.email || local.email,
        photoURL: remote.photoURL ?? local.photoURL ?? undefined,

        // 活跃状态优先远程，默认 true
        isActive: remote.isActive ?? local.isActive ?? true,

        // buy-in 数据
        buyInChipsList: remote.buyInChipsList?.length
            ? remote.buyInChipsList
            : local.buyInChipsList ?? [],
        totalBuyInChips: remote.totalBuyInChips ?? local.totalBuyInChips ?? 0,

        // 结算数据优先保留本地结果（避免线上被清空）
        settleCashAmount: local.settleCashAmount ?? remote.settleCashAmount ?? undefined,
        settleCashDiff: local.settleCashDiff ?? remote.settleCashDiff ?? undefined,
        settleROI: local.settleROI ?? remote.settleROI ?? undefined,
        settleChipDiff: local.settleChipDiff ?? remote.settleChipDiff ?? undefined,
        finalized: local.finalized ?? remote.finalized ?? false,

        // 时间戳类字段
        joinAt: local.joinAt || remote.joinAt || new Date().toISOString(),

        // 本地状态控制
        isSyncing: local.isSyncing ?? false,
    }
}
