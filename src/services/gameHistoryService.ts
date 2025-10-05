import localDb from './localDb';
import { formatPlayerSnapshot, formatGameNumbers } from '@/utils/formatSnapshot';

// 检查本地数据库是否可用
export const hasLocalDb = Boolean((localDb as any) && typeof (localDb as any).execSql === 'function');

// 执行SQL的辅助函数
async function execSql(sql: string, args: any[] = []) {
    if (!hasLocalDb) throw new Error('localDb.execSql not available');
    return (localDb as any).execSql(sql, args);
}

// 游戏历史记录项的接口定义
export interface GameHistoryItem {
    id: string;
    smallBlind: number;
    bigBlind: number;
    created: string;
    updated: string;
    baseCashAmount: number;
    baseChipAmount: number;
    totalBuyInCash: number;
    totalEndingCash: number;
    totalDiffCash: number;
    totalBuyInChips: number;
    totalEndingChips: number;
    players: Array<{
        playerId: string;
        nickname: string;
        totalBuyInCash: number;
        settleCashAmount: number;
        settleCashDiff: number;
        buyInCount: number;
        photoUrl: string | null;
        settleROI: number;
        totalBuyInChips: number;
        settleChipCount: number;
    }>;
    __rawAction: any;
}

// 数据库action转换为历史记录项的辅助函数
function toHistoryItem(action: any): GameHistoryItem | null {
    // prefer payload if it contains a game snapshot shape
    const payload = action.payload || null;
    if (payload && payload.players && Array.isArray(payload.players)) {
        // 从payload中提取基础设定，如果没有则尝试从玩家数据中推算
        let baseCashAmount = Number(payload.baseCashAmount ?? 0);
        let baseChipAmount = Number(payload.baseChipAmount ?? 0);
        
        // 如果payload中没有这些字段，尝试从其他可能的字段名获取
        if (!baseCashAmount) {
            baseCashAmount = Number(payload.initialCashAmount ?? payload.startCashAmount ?? 0);
        }
        if (!baseChipAmount) {
            baseChipAmount = Number(payload.initialChipAmount ?? payload.startChipAmount ?? 0);
        }
        
        // 智能修复：如果baseChipAmount为0但baseCashAmount有值，可能数据存储时有错误
        // 在扑克游戏中，通常baseChipAmount应该是一个正数
        if (!baseChipAmount && baseCashAmount > 0) {
            // 尝试其他可能的字段名或者使用合理的默认值
            baseChipAmount = Number(payload.chipAmount ?? payload.chips ?? payload.startingChips ?? 0);
            
            // 如果还是没有找到，根据常见的现金/筹码比例推算
            if (!baseChipAmount) {
                // 常见比例：1现金 = 10筹码 或 1现金 = 100筹码
                // 根据baseCashAmount推算一个合理的baseChipAmount
                if (baseCashAmount >= 100) {
                    baseChipAmount = baseCashAmount * 10; // 1现金 = 10筹码
                } else {
                    baseChipAmount = baseCashAmount * 100; // 1现金 = 100筹码
                }
            }
        }
        
        // 计算总差额和其他汇总数据
        const totalBuyInCash = payload.players.reduce((sum: number, p: any) => sum + (Number(p.totalBuyInCash) || 0), 0);
        const totalEndingCash = payload.players.reduce((sum: number, p: any) => sum + (Number(p.settleCashAmount) || 0), 0);
        const totalDiffCash = totalEndingCash - totalBuyInCash;
        const totalBuyInChips = payload.players.reduce((sum: number, p: any) => sum + (Number(p.totalBuyInChips) || 0), 0);
        const totalEndingChips = payload.players.reduce((sum: number, p: any) => sum + (Number(p.settleChipCount) || 0), 0);
        
        // 只有当基础设定完全缺失时才从玩家数据推算
        if (!baseCashAmount && !baseChipAmount && payload.players.length > 0) {
            const playerCount = payload.players.length;
            
            if (totalBuyInCash > 0) {
                baseCashAmount = Math.round(totalBuyInCash / playerCount);
            }
            if (totalBuyInChips > 0) {
                baseChipAmount = Math.round(totalBuyInChips / playerCount);
            }
        }
        
        // Use format helpers for per-player normalization
        const formattedPlayers = payload.players.map((p: any) => formatPlayerSnapshot(p, (baseCashAmount && baseChipAmount) ? (baseCashAmount / baseChipAmount) : undefined));
        const gameNums = formatGameNumbers({ baseCashAmount, baseChipAmount });

        return {
            id: String(action.id),
            smallBlind: Number(payload.smallBlind ?? 0),
            bigBlind: Number(payload.bigBlind ?? 0),
            created: payload.created ?? action.createdAt ?? new Date().toISOString(),
            updated: payload.updated ?? payload.created ?? action.createdAt ?? new Date().toISOString(),
            baseCashAmount: gameNums.baseCashAmount,
            baseChipAmount: gameNums.baseChipAmount,
            totalBuyInCash: Number((formattedPlayers.reduce((s: number, p: any) => s + (p.totalBuyInCash || 0), 0)).toFixed(2)),
            totalEndingCash: Number((formattedPlayers.reduce((s: number, p: any) => s + (p.settleCashAmount || 0), 0)).toFixed(2)),
            totalDiffCash: Number((formattedPlayers.reduce((s: number, p: any) => s + (p.settleCashDiff || 0), 0)).toFixed(2)),
            totalBuyInChips: Math.round(formattedPlayers.reduce((s: number, p: any) => s + (p.totalBuyInChips || 0), 0)),
            totalEndingChips: Math.round(formattedPlayers.reduce((s: number, p: any) => s + (p.settleChipCount || 0), 0)),
            players: formattedPlayers.map((p: any) => ({
                playerId: String(p.playerId ?? ''),
                nickname: p.nickname,
                totalBuyInCash: p.totalBuyInCash,
                settleCashAmount: p.settleCashAmount,
                settleCashDiff: p.settleCashDiff,
                buyInCount: p.buyInCount,
                photoUrl: p.photoUrl ?? null,
                settleROI: p.settleROI,
                totalBuyInChips: p.totalBuyInChips,
                settleChipCount: p.settleChipCount,
            })),
            __rawAction: action,
        };
    }
    return null;
}

// 获取游戏历史记录数据
export async function loadGameHistory(): Promise<{
    historyItems: Array<any>;
    rawActions: Array<any>;
    error: string | null;
}> {
    try {
        if (!hasLocalDb) {
            return {
                historyItems: [],
                rawActions: [],
                error: 'local database not available in this environment.'
            };
        }

        // Ensure actions table exists
        await execSql(`CREATE TABLE IF NOT EXISTS actions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_id INTEGER,
            type TEXT,
            payload TEXT,
            createdAt TEXT,
            syncStatus INTEGER DEFAULT 0
        )`);

        // 从SQLite获取数据
        const aRes = await execSql(`SELECT id, game_id, type, payload, createdAt, syncStatus FROM actions ORDER BY createdAt DESC`);
        const aOut: any[] = [];
        
        if (aRes && aRes.rows && Array.isArray((aRes.rows as any)._array)) {
            for (const r of (aRes.rows as any)._array) {
                let parsed = null;
                try {
                    if (r.payload && typeof r.payload === 'string') parsed = JSON.parse(r.payload);
                    else parsed = r.payload ?? null;
                } catch (e) { parsed = null; }
                aOut.push({ 
                    id: r.id, 
                    game_id: r.game_id, 
                    type: r.type, 
                    createdAt: r.createdAt, 
                    syncStatus: r.syncStatus, 
                    payload: parsed, 
                    _source: 'sql' 
                });
            }
        } else {
            for (let i = 0; i < (aRes.rows.length ?? 0); i++) {
                const r = aRes.rows.item(i);
                let parsed = null;
                try {
                    if (r.payload && typeof r.payload === 'string') parsed = JSON.parse(r.payload);
                    else parsed = r.payload ?? null;
                } catch (e) { parsed = null; }
                aOut.push({ 
                    id: r.id, 
                    game_id: r.game_id, 
                    type: r.type, 
                    createdAt: r.createdAt, 
                    syncStatus: r.syncStatus, 
                    payload: parsed, 
                    _source: 'sql' 
                });
            }
        }

        // 从内存store获取数据
        const memStore = (global as any).__pokerpal_store;
        const memActions: any[] = (memStore && Array.isArray(memStore.actions)) ? memStore.actions.map((r: any) => ({
            id: r.id,
            game_id: r.game_id,
            type: r.type,
            createdAt: r.createdAt,
            syncStatus: r.syncStatus ?? 0,
            payload: r.payload,
            _source: 'memory',
        })) : [];

        // 合并并排序数据
        const merged = [...aOut, ...memActions].sort((x, y) => {
            const tx = new Date(x.createdAt || 0).getTime();
            const ty = new Date(y.createdAt || 0).getTime();
            return ty - tx;
        });

        // 转换为历史记录项和原始动作
        const converted = merged.map(m => ({ ...m, __history: toHistoryItem(m) }));
        const historyItems = converted.filter((x: any) => x.__history !== null);
        const rawActions = converted.filter((x: any) => x.__history === null);

        return {
            historyItems,
            rawActions,
            error: null
        };
    } catch (e: any) {
        console.warn('load game history error', e);
        return {
            historyItems: [],
            rawActions: [],
            error: e?.message ?? String(e)
        };
    }
}

// 获取玩家排行榜数据（最大赢家/输家）
export function getPlayerRanking(players: any[]) {
    if (!players.length) return { winner: null, loser: null };
    
    const desc = [...players].sort((a, b) => Number(b.settleCashDiff) - Number(a.settleCashDiff));
    const asc = [...players].sort((a, b) => Number(a.settleCashDiff) - Number(b.settleCashDiff));
    
    return { 
        winner: desc[0], 
        loser: asc[0] 
    };
}

// 格式化日期时间
export function formatDateTime(dateString: string) {
    if (!dateString) return { day: '--', month: '--', year: '--', time: '--:--' };
    
    const d = new Date(dateString);
    return {
        day: String(d.getDate()).padStart(2, '0'),
        month: String(d.getMonth() + 1).padStart(2, '0'),
        year: String(d.getFullYear()),
        time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
    };
}

export default {
    hasLocalDb,
    loadGameHistory,
    getPlayerRanking,
    formatDateTime,
    toHistoryItem,
};
