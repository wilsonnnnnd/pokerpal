import { Player } from '@/types'

export function normalizePlayer(raw: Partial<Player>, rate: number = 0, baseChipAmount?: number): Player {
    const chipsList = Array.isArray(raw.buyInChipsList) && raw.buyInChipsList.length > 0
        ? raw.buyInChipsList
        : (typeof baseChipAmount === 'number' ? [baseChipAmount] : (raw.buyInChipsList || []));

    const totalBuyInChips = (typeof raw.totalBuyInChips === 'number' && raw.totalBuyInChips > 0)
        ? raw.totalBuyInChips
        : chipsList.reduce((s, v) => s + Number(v || 0), 0);

    const totalBuyInCash = (typeof raw.totalBuyInCash === 'number')
        ? Number((raw.totalBuyInCash as any).toFixed ? (raw.totalBuyInCash as any).toFixed(2) : raw.totalBuyInCash)
        : Number((totalBuyInChips * rate).toFixed(2));

    const buyInCount = (typeof raw.buyInCount === 'number' && raw.buyInCount >= 0)
        ? raw.buyInCount
        : chipsList.length;

    return {
        id: raw.id ?? (raw as any).playerId ?? '',
        nickname: raw.nickname ?? (raw as any).playerId ?? '',
        email: raw.email,
        photoURL: raw.photoURL ?? (raw as any).photoUrl ?? undefined,
        isActive: raw.isActive ?? true,
        joinAt: raw.joinAt ?? new Date().toISOString(),
        buyInChipsList: chipsList,
        buyInCount,
        totalBuyInChips,
        totalBuyInCash,
        endCashAmount: raw.endCashAmount,
        settleChipCount: raw.settleChipCount,
        settleChipDiff: raw.settleChipDiff,
        settleCashDiff: raw.settleCashDiff,
        settleCashAmount: raw.settleCashAmount,
        settleROI: raw.settleROI,
        finalized: raw.finalized ?? false,
        isSyncing: raw.isSyncing ?? false,
    } as Player
}

export default normalizePlayer;
