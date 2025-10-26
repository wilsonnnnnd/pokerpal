import localDb from './localDb';
import { formatPlayerSnapshot, formatGameNumbers } from '@/utils/formatSnapshot';
import { toHistoryItem, formatDateTime, getPlayerRanking } from '../utils/gameHistoryTools';
// Re-export helpers so callers can import them from the service file for backward compatibility
export { toHistoryItem, formatDateTime, getPlayerRanking };

// 检查本地数据库是否可用
export const hasLocalDb = Boolean((localDb as any) && typeof (localDb as any).execSql === 'function');

// 执行SQL的辅助函数
async function execSql(sql: string, args: any[] = []) {
    if (!hasLocalDb) throw new Error('localDb.execSql not available');
    return (localDb as any).execSql(sql, args);
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

export default {
    hasLocalDb,
    loadGameHistory,
    getPlayerRanking,
    formatDateTime,
    toHistoryItem,
};
