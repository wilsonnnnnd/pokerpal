import { Player } from '@/types';

/**
 * 合并本地和远程玩家数据，优先保留本地已有的有效信息
 */
export function mergePlayerData(local: Player, remote: Player): Player {
    return {
        ...remote,

        // ID & 基础信息保持远程为主
        id: remote.id,
        nickname: remote.nickname || local.nickname,
        email: remote.email || local.email,
        photoURL: remote.photoURL || local.photoURL,

        // 活跃状态优先取远程（防止误激活）
        isActive: remote.isActive ?? local.isActive ?? true,

        // 保留 buy-in 数据（如远程为空则保留本地）
        buyInChipsList: remote.buyInChipsList?.length
            ? remote.buyInChipsList
            : local.buyInChipsList ?? [],
        totalBuyInChips: remote.totalBuyInChips ?? local.totalBuyInChips ?? 0,

        // 结算信息优先保留本地
        endingChipCount: remote.endingChipCount ?? local.endingChipCount,
        chipDifference: remote.chipDifference ?? local.chipDifference,
        cashDifference: remote.cashDifference ?? local.cashDifference,
        roi: remote.roi ?? local.roi,
        finalized: remote.finalized ?? local.finalized ?? false,

        // 保留本地 joinAt 时间（本地有更早数据）
        joinAt: local.joinAt || remote.joinAt || new Date().toISOString(),

        // 保留本地同步状态
        isSyncing: local.isSyncing,
    };
}
