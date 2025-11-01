export function computePlayerCashProfit(p: any, rate = 1): number {
    // Prefer explicit cash fields
    const scAmount = Number(p.settleCashAmount ?? NaN);
    if (Number.isFinite(scAmount)) return scAmount;

    const scDiff = Number(p.settleCashDiff ?? NaN);
    if (Number.isFinite(scDiff)) return scDiff;

    // Fallback: compute from chips if available (settleChipCount - totalBuyInChips) * rate
    const settleChipCount = Number(p.settleChipCount ?? NaN);
    const totalBuyInChips = Number(p.totalBuyInChips ?? NaN);
    if (Number.isFinite(settleChipCount) && Number.isFinite(totalBuyInChips)) {
        return (settleChipCount - totalBuyInChips) * rate;
    }

    return 0;
}

export default computePlayerCashProfit;
