export type RawPlayerLike = Partial<Record<string, any>>;

export function formatPlayerSnapshot(p: RawPlayerLike, rate?: number) {
    // Normalize chip fields
    const totalBuyInChips = Math.round(Number(p.totalBuyInChips) || 0);
    const settleChipCount = Math.round(Number(p.settleChipCount) || 0);

    // Compute cash values: prefer provided cash, otherwise derive from chips and rate
    const derivedTotalBuyInCash = (Number(p.totalBuyInCash) || 0) || (rate ? totalBuyInChips * rate : 0);
    const totalBuyInCash = Number((derivedTotalBuyInCash).toFixed(2));

    const derivedSettleCashAmount = (Number(p.settleCashAmount) || 0) || (rate ? settleChipCount * rate : 0);
    const settleCashAmount = Number((derivedSettleCashAmount).toFixed(2));

    const settleCashDiff = Number((Number(p.settleCashDiff) || 0).toFixed(2));

    const settleROI = Number((Number(p.settleROI) || 0).toFixed(6));

    return {
        // original-ish fields
        playerId: p.playerId ?? p.id ?? null,
        nickname: p.nickname ?? p.displayName ?? p.prefername ?? p.name ?? '',
        photoUrl: p.photoUrl ?? p.photoURL ?? p.photo ?? null,

        // chips
        totalBuyInChips,
        settleChipCount,

        // cash (normalized)
        totalBuyInCash,
        settleCashAmount,
        settleCashDiff,

        // ROI
        settleROI,

        // copy through some extras
        buyInCount: Number(p.buyInCount) || 0,
    };
}

export function formatGameNumbers(game: Partial<Record<string, any>>) {
    return {
        baseCashAmount: typeof game?.baseCashAmount === 'number' ? Number(game.baseCashAmount.toFixed(2)) : game?.baseCashAmount ?? 0,
        baseChipAmount: typeof game?.baseChipAmount === 'number' ? Number(game.baseChipAmount) : game?.baseChipAmount ?? 0,
    };
}
