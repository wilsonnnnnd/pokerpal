import * as SQLite from 'expo-sqlite';
import { getLocal, setLocal } from '@/services/storageService';

const DB_NAME = 'pokerpal.db';

// 打开数据库（expo-sqlite）— 检测运行时 API 差异（有些环境会暴露 openDatabaseSync）
const sqliteAny = SQLite as any;
const openFn = sqliteAny.openDatabase || sqliteAny.openDatabaseSync;
let db: any;
if (openFn) {
    db = openFn(DB_NAME);
} else {
    // 无本地原生 DB 可用；execSql 将使用内存回退实现
    db = {};
}

// hydrate in-memory fallback store if persisted previously
(async () => {
    try {
        if (!(global as any).__pokerpal_store) {
            const saved = await getLocal<any>('__pokerpal_store');
            if (saved) {
                (global as any).__pokerpal_store = saved;
                console.log('[localDb] hydrated in-memory store from storage');
            }
        }
    } catch (err) {
        console.warn('[localDb] failed to hydrate store', err);
    }
})();

export function execSql(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
        // 首选路径：使用 transaction/executeSql
        if (typeof db.transaction === 'function') {
                try {
                    db.transaction(
                        (tx: any) => {
                            try {
                                tx.executeSql(
                                    sql,
                                    params,
                                    (_tx: any, result: any) => resolve(result),
                                    (_tx: any, error: any) => {
                                        reject(error);
                                        return false;
                                    }
                                );
                            } catch (innerErr) {
                                reject(innerErr);
                            }
                        },
                        (txError: any) => reject(txError)
                    );
                } catch (err) {
                    // Synchronous error when starting a transaction - reject promise instead of crashing
                    reject(err);
                }
            return;
        }

        // 回退路径：有些环境提供 db.exec(sql, args, success, error)
        if (typeof db.exec === 'function') {
            try {
                try {
                    (db as any).exec(sql, params, (res: any) => {
                        if (Array.isArray(res) && res.length > 0) return resolve(res[0]);
                        return resolve(res);
                    }, (err: any) => reject(err));
                } catch (innerExecErr) {
                    reject(innerExecErr);
                }
            } catch (err) {
                reject(err);
            }
            return;
        }

        // 最后一招：内存中的 JS 回退实现，仅支持这里需要的简单操作集
        try {
            const normalized = sql.trim().toUpperCase();
            // 简单处理 CREATE TABLE / INSERT / SELECT / DELETE，满足应用需要
            if (normalized.startsWith('CREATE TABLE')) {
                // no-op in memory
                return resolve({ rows: { _array: [] } });
            }

            // INSERT handling: for players, games, game_players create new ids and return ok
            if (normalized.startsWith('INSERT INTO')) {
                // 非常简单的解析以识别表名
                const m = /INSERT INTO\s+(\w+)/i.exec(sql);
                const table = m ? m[1].toLowerCase() : null;
                if (!table) return resolve({ rows: { _array: [] } });
                if (!(global as any).__pokerpal_store) (global as any).__pokerpal_store = { players: [], games: [], game_players: [], _id: 1 };
                    const store = (global as any).__pokerpal_store;
                    // ensure actions array exists in memory store
                    if (!store.actions) store.actions = [];
                // allow explicit id in insert params (if caller provided id), otherwise use auto-increment
                let id = store._id++;
                if (table === 'players') {
                    // detect if SQL includes id column by checking params length (id provided) or SQL text
                    // expected either (fullname, prefername, ...) or (id, fullname, prefername, ...)
                    let recId = id;
                    if (params && params.length >= 6) {
                        // caller provided explicit id as first param
                        recId = params[0];
                    }
                    const offset = (params && params.length >= 6) ? 1 : 0;
                    const rec = { id: recId, fullname: params[0 + offset] || '', prefername: params[1 + offset] || '', photoUrl: params[2 + offset] || '', email: params[3 + offset] || '', createdAt: params[4 + offset] || new Date().toISOString() };
                    store.players.unshift(rec);
                } else if (table === 'games') {
                    // params[7] expected to be integer 0/1 for isSynced; store as boolean in memory
                    const isSyncedBool = Boolean(Number(params[7]) === 1);
                    const rec = { id, name: params[0] || '', smallBlind: params[1] || 0, bigBlind: params[2] || 0, buyInStart: params[3] || 0, cash: params[4] || 0, result: params[5] || '', createdAt: params[6] || new Date().toISOString(), isSynced: isSyncedBool };
                    store.games.unshift(rec);
                } else if (table === 'game_players') {
                    const rec = { id, game_id: params[0], player_id: params[1], seat: params[2] || 0, contribution: params[3] || 0 };
                    store.game_players.unshift(rec);
                    } else if (table === 'actions') {
                        const rec = { id, game_id: params[0], type: params[1], payload: params[2], createdAt: params[3] || new Date().toISOString(), syncStatus: params[4] || 0 };
                        store.actions.unshift(rec);
                }
                // persist the in-memory store so fallback data survives reloads
                (async () => {
                    try {
                        await setLocal('__pokerpal_store', store);
                    } catch (err) {
                        console.warn('[localDb] failed to persist store after INSERT', err);
                    }
                    resolve({ rows: { _array: [{ id }] } });
                })();
            }

            // SELECT handling
            if (normalized.startsWith('SELECT')) {
                if (!(global as any).__pokerpal_store) (global as any).__pokerpal_store = { players: [], games: [], game_players: [], _id: 1 };
                const store = (global as any).__pokerpal_store;
                // 处理 SELECT last_insert_rowid()
                if (normalized.includes('LAST_INSERT_ROWID')) {
                    const lastId = store._id - 1;
                    return resolve({ rows: { _array: [{ id: lastId }] } });
                }
                if (normalized.includes('FROM PLAYERS')) return resolve({ rows: { _array: store.players.slice() } });
                if (normalized.includes('FROM GAMES')) return resolve({ rows: { _array: store.games.slice() } });
                if (normalized.includes('FROM GAME_PLAYERS')) return resolve({ rows: { _array: store.game_players.slice() } });
                if (normalized.includes('FROM ACTIONS')) return resolve({ rows: { _array: store.actions ? store.actions.slice() : [] } });
                const m = /FROM\s+GAME_PLAYERS\s+WHERE\s+GAME_ID\s*=\s*\?/i.exec(normalized);
                if (m) {
                    const gid = params[0];
                    const rows = store.game_players.filter((r: any) => r.game_id === gid).map((r: any) => ({ player_id: r.player_id }));
                    return resolve({ rows: { _array: rows } });
                }
                return resolve({ rows: { _array: [] } });
            }

            // DELETE handling
            if (normalized.startsWith('DELETE')) {
                if (!(global as any).__pokerpal_store) (global as any).__pokerpal_store = { players: [], games: [], game_players: [], _id: 1 };
                const store = (global as any).__pokerpal_store;
                if (normalized.includes('FROM GAME_PLAYERS WHERE GAME_ID')) {
                    const gid = params[0];
                    store.game_players = store.game_players.filter((r: any) => r.game_id !== gid);
                    (async () => {
                        try {
                            await setLocal('__pokerpal_store', store);
                        } catch (err) {
                            console.warn('[localDb] failed to persist store after DELETE (game_players by game)', err);
                        }
                        resolve({ rows: { _array: [] } });
                    })();
                }
                if (normalized.includes('FROM GAME_PLAYERS WHERE PLAYER_ID')) {
                    const pid = params[0];
                    store.game_players = store.game_players.filter((r: any) => r.player_id !== pid);
                    (async () => {
                        try {
                            await setLocal('__pokerpal_store', store);
                        } catch (err) {
                            console.warn('[localDb] failed to persist store after DELETE (game_players by player)', err);
                        }
                        resolve({ rows: { _array: [] } });
                    })();
                }
                if (normalized.includes('FROM GAMES WHERE ID')) {
                    const id = params[0];
                    store.games = store.games.filter((r: any) => r.id !== id);
                    (async () => {
                        try {
                            await setLocal('__pokerpal_store', store);
                        } catch (err) {
                            console.warn('[localDb] failed to persist store after DELETE (games)', err);
                        }
                        resolve({ rows: { _array: [] } });
                    })();
                }
                if (normalized.includes('FROM PLAYERS WHERE ID')) {
                    const id = params[0];
                    store.players = store.players.filter((r: any) => r.id !== id);
                    (async () => {
                        try {
                            await setLocal('__pokerpal_store', store);
                        } catch (err) {
                            console.warn('[localDb] failed to persist store after DELETE (players)', err);
                        }
                        resolve({ rows: { _array: [] } });
                    })();
                }
                if (normalized.includes('DELETE FROM GAME_PLAYERS WHERE GAME_ID = ? AND PLAYER_ID = ?')) {
                    const gid = params[0];
                    const pid = params[1];
                    store.game_players = store.game_players.filter((r: any) => !(r.game_id === gid && r.player_id === pid));
                    (async () => {
                        try {
                            await setLocal('__pokerpal_store', store);
                        } catch (err) {
                            console.warn('[localDb] failed to persist store after DELETE (game_player pair)', err);
                        }
                        resolve({ rows: { _array: [] } });
                    })();
                }
                return resolve({ rows: { _array: [] } });
            }

            return resolve({ rows: { _array: [] } });
        } catch (err) {
            return reject(err);
        }
    });
}

export async function initSchema() {
    const sql = `CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        smallBlind INTEGER,
        bigBlind INTEGER,
        buyInStart REAL,
        cash REAL,
        result TEXT,
        finishedAt TEXT,
        createdAt TEXT,
        isSynced INTEGER DEFAULT 0
    );`;

    const playerSql = `CREATE TABLE IF NOT EXISTS players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fullname TEXT,
        prefername TEXT,
        photoUrl TEXT,
        email TEXT,
        createdAt TEXT
    );`;

    const joinSql = `CREATE TABLE IF NOT EXISTS game_players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER,
        player_id INTEGER,
        seat INTEGER,
        contribution REAL,
        FOREIGN KEY(game_id) REFERENCES games(id),
        FOREIGN KEY(player_id) REFERENCES players(id)
    );`;

    const actionsSql = `CREATE TABLE IF NOT EXISTS actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER,
        type TEXT,
        payload TEXT,
        createdAt TEXT,
        syncStatus INTEGER DEFAULT 0
    );`;

    const actionsIndex = `CREATE INDEX IF NOT EXISTS idx_actions_game_id ON actions(game_id);`;

    await execSql(sql);
    await execSql(playerSql);
    await execSql(joinSql);
    await execSql(actionsSql);
    await execSql(actionsIndex);
}

export async function appendAction(gameId: number | null, type: string, payload: any = {}): Promise<number | undefined> {
    const now = new Date().toISOString();
    const sql = `INSERT INTO actions (game_id, type, payload, createdAt, syncStatus) VALUES (?, ?, ?, ?, ?);`;
    const params = [gameId, type, JSON.stringify(payload ?? {}), now, 0];
    try {
        await execSql(sql, params);
        try {
            const last = await execSql('SELECT last_insert_rowid() as id;');
            const id = last && last.rows && last.rows._array && last.rows._array[0] ? last.rows._array[0].id : undefined;
            return id;
        } catch (e) {
            // If selecting last id fails, fall back to in-memory store id
            if (!(global as any).__pokerpal_store) (global as any).__pokerpal_store = { players: [], games: [], game_players: [], _id: 1 };
            const fallbackId = (global as any).__pokerpal_store._id++;
            if (!(global as any).__pokerpal_store.actions) (global as any).__pokerpal_store.actions = [];
            (global as any).__pokerpal_store.actions.unshift({ id: fallbackId, game_id: gameId, type, payload, createdAt: now, syncStatus: 0 });
            // persist fallback
            (async () => {
                try {
                    await setLocal('__pokerpal_store', (global as any).__pokerpal_store);
                } catch (err) {
                    console.warn('[localDb] failed to persist store after appendAction fallback (select last id)', err);
                }
            })();
            return fallbackId;
        }
    } catch (e) {
        // If insert fails (native DB issues), persist to in-memory store to avoid data loss and app crash
        console.error('appendAction failed, writing to in-memory store', e);
        if (!(global as any).__pokerpal_store) (global as any).__pokerpal_store = { players: [], games: [], game_players: [], _id: 1 };
        const fallbackId = (global as any).__pokerpal_store._id++;
        if (!(global as any).__pokerpal_store.actions) (global as any).__pokerpal_store.actions = [];
        (global as any).__pokerpal_store.actions.unshift({ id: fallbackId, game_id: gameId, type, payload, createdAt: now, syncStatus: 0 });
        // persist fallback
        (async () => {
            try {
                await setLocal('__pokerpal_store', (global as any).__pokerpal_store);
            } catch (err) {
                console.warn('[localDb] failed to persist store after appendAction fallback (insert error)', err);
            }
        })();
        return fallbackId;
    }
}

/**
 * Try to run multiple SQL statements in a single transaction. If native db supports transactions, use it.
 * For the in-memory fallback it will sequentially run execSql calls.
 */
export async function runSqlTransaction(actions: Array<{ sql: string; params?: any[] }>): Promise<void> {
    // If native transaction available, run enclosed statements
    if (db && typeof db.transaction === 'function') {
        return new Promise((resolve, reject) => {
            db.transaction((tx: any) => {
                for (const a of actions) {
                    tx.executeSql(a.sql, a.params ?? []);
                }
            }, (err: any) => reject(err), () => resolve());
        });
    }

    // fallback: execute sequentially
    for (const a of actions) {
        // eslint-disable-next-line no-await-in-loop
        await execSql(a.sql, a.params ?? []);
    }
}

export async function getActionsForGame(gameId: number): Promise<any[]> {
    try {
        const res = await execSql('SELECT * FROM actions WHERE game_id = ? ORDER BY createdAt ASC;', [gameId]);
        const rows = res && res.rows && res.rows._array ? res.rows._array : [];
        return rows;
    } catch (e) {
        // fallback: attempt a general select and filter in-memory
        try {
            const all = await execSql('SELECT * FROM actions;');
            const rows = all && all.rows && all.rows._array ? all.rows._array : [];
            return rows.filter((r: any) => Number(r.game_id) === Number(gameId));
        } catch (err) {
            return [];
        }
    }
}

export default { execSql, initSchema } as const;
