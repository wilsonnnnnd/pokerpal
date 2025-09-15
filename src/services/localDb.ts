// Load expo-sqlite at runtime in a robust way (support default export or cjs)
let SQLiteLib: any;
try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    SQLiteLib = require('expo-sqlite');
    // some bundlers expose default
    if (SQLiteLib && !SQLiteLib.openDatabase && SQLiteLib.default) {
        SQLiteLib = SQLiteLib.default;
    }
} catch (e) {
    SQLiteLib = undefined;
}

export const isSQLiteAvailable = Boolean(SQLiteLib && typeof SQLiteLib.openDatabase === 'function');

let db: any = null;
if (isSQLiteAvailable) {
    const DB_NAME = 'pokerpal.db';
    db = SQLiteLib.openDatabase(DB_NAME);
}

function execSql(sql: string, args: any[] = []): Promise<any> {
    if (!isSQLiteAvailable) return Promise.reject(new Error('expo-sqlite not available'));
    return new Promise((resolve, reject) => {
        db.transaction((tx: any) => {
            tx.executeSql(
                sql,
                args,
                (_tx: any, res: any) => resolve(res),
                (_tx: any, err: any) => { reject(err); return false; }
            );
        });
    });
}

export async function initLocalDb() {
    if (!isSQLiteAvailable) return;
    // games table: store full game JSON as text
    await execSql(`CREATE TABLE IF NOT EXISTS games (
        id TEXT PRIMARY KEY,
        createdMs INTEGER,
        updatedMs INTEGER,
        data TEXT
    )`);

    await execSql(`CREATE TABLE IF NOT EXISTS history (
        id TEXT PRIMARY KEY,
        createdMs INTEGER,
        data TEXT
    )`);
}

export async function saveGameLocal(id: string, payload: any) {
    if (!isSQLiteAvailable) return;
    const now = Date.now();
    const data = JSON.stringify(payload);
    await execSql(`INSERT OR REPLACE INTO games (id, createdMs, updatedMs, data) VALUES (?, coalesce((SELECT createdMs FROM games WHERE id = ?), ?), ?, ?)` , [id, id, now, now, data]);
}

export async function getGameLocal(id: string) {
    if (!isSQLiteAvailable) return null;
    const res = await execSql(`SELECT * FROM games WHERE id = ?`, [id]);
    if (res.rows.length === 0) return null;
    const row = res.rows.item(0);
    return { id: row.id, createdMs: row.createdMs, updatedMs: row.updatedMs, data: JSON.parse(row.data) };
}

export async function deleteGameLocal(id: string) {
    if (!isSQLiteAvailable) return;
    await execSql(`DELETE FROM games WHERE id = ?`, [id]);
}

export async function listGamesLocal(): Promise<any[]> {
    if (!isSQLiteAvailable) return [];
    const res = await execSql(`SELECT id, createdMs, updatedMs, data FROM games ORDER BY updatedMs DESC`);
    const out: any[] = [];
    for (let i = 0; i < res.rows.length; i++) {
        const r = res.rows.item(i);
        out.push({ id: r.id, createdMs: r.createdMs, updatedMs: r.updatedMs, data: JSON.parse(r.data) });
    }
    return out;
}

export async function saveHistoryLocal(id: string, payload: any) {
    if (!isSQLiteAvailable) return;
    const data = JSON.stringify(payload);
    await execSql(`INSERT OR REPLACE INTO history (id, createdMs, data) VALUES (?, ?, ?)` , [id, Date.now(), data]);
}

export async function listHistoryLocal(): Promise<any[]> {
    if (!isSQLiteAvailable) return [];
    const res = await execSql(`SELECT id, createdMs, data FROM history ORDER BY createdMs DESC`);
    const out: any[] = [];
    for (let i = 0; i < res.rows.length; i++) {
        const r = res.rows.item(i);
        out.push({ id: r.id, createdMs: r.createdMs, data: JSON.parse(r.data) });
    }
    return out;
}

export default {
    initLocalDb,
    saveGameLocal,
    getGameLocal,
    deleteGameLocal,
    listGamesLocal,
    saveHistoryLocal,
    listHistoryLocal,
};
