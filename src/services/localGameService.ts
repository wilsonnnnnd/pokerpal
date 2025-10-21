import { v4 as uuidv4 } from 'uuid';
import storage from './storageService';
import { PlayerLocal, GameLocal, GamePlayerEntry } from '@/types/localModels';

/**
 * 本模块负责本地（AsyncStorage）层面的玩家与游戏数据管理。
 * - 玩家与游戏均以 JSON 列表形式持久化到 `storageService` 提供的本地存储中。
 * - 所有导出函数均为异步函数，返回 Promise。
 * - 本模块不会与远端服务通信，仅用于本地缓存/临时保存。
 */

const PLAYERS_KEY = '@pokerpal:players';
const GAMES_KEY = '@pokerpal:games';

/**
 * 读取本地所有玩家列表
 * @returns Promise<PlayerLocal[]> - 存储的玩家数组，若无则返回空数组
 */
async function getPlayers(): Promise<PlayerLocal[]> {
    const p = await storage.getLocal<PlayerLocal[]>(PLAYERS_KEY);
    return p ?? [];
}

/**
 * 将玩家列表写回本地存储
 * @param list PlayerLocal[] - 完整的玩家数组，将覆盖原有值
 */
async function savePlayers(list: PlayerLocal[]): Promise<void> {
    await storage.setLocal(PLAYERS_KEY, list);
}

/**
 * 创建本地玩家记录
 * @param payload Omit<PlayerLocal, 'id' | 'created' | 'updated'> - 玩家初始属性（不包含 id/时间）
 * @returns Promise<PlayerLocal> - 新创建的玩家对象（包含 id 与时间字段）
 */
export async function createPlayer(payload: Omit<PlayerLocal, 'id' | 'created' | 'updated'>): Promise<PlayerLocal> {
    const list = await getPlayers();
    const id = uuidv4();
    const now = new Date().toISOString();
    const p: PlayerLocal = {
        id,
        nickname: payload.nickname,
        totalProfit: Number(((payload.totalProfit ?? 0)).toFixed(2)),
        averageROI: typeof payload.averageROI === 'number' ? Number((payload.averageROI).toFixed(6)) : (payload.averageROI ?? 0),
        gamesPlayed: payload.gamesPlayed ?? 0,
        photoURL: payload.photoURL,
        created: now,
        updated: now,
    };
    list.unshift(p);
    await savePlayers(list);
    return p;
}

/**
 * 更新本地玩家记录
 * @param id string - 玩家 id
 * @param patch Partial<PlayerLocal> - 要更新的字段（支持部分字段）
 * @returns Promise<PlayerLocal | null> - 更新后的玩家或当 id 不存在时返回 null
 */
export async function updatePlayer(id: string, patch: Partial<PlayerLocal>): Promise<PlayerLocal | null> {
    const list = await getPlayers();
    const idx = list.findIndex((x) => x.id === id);
    if (idx === -1) return null;
    const now = new Date().toISOString();
    const normalizedPatch: any = { ...patch };
    if (typeof normalizedPatch.totalProfit === 'number') {
        normalizedPatch.totalProfit = Number((normalizedPatch.totalProfit).toFixed(2));
    }
    if (typeof normalizedPatch.averageROI === 'number') {
        normalizedPatch.averageROI = Number((normalizedPatch.averageROI).toFixed(6));
    }
    const updated = { ...list[idx], ...normalizedPatch, updated: now };
    list[idx] = updated;
    await savePlayers(list);
    return updated;
}

/**
 * 删除本地玩家记录
 * @param id string - 玩家 id
 * @returns Promise<boolean> - 操作是否成功（始终返回 true，除非抛出异常）
 */
export async function deletePlayer(id: string): Promise<boolean> {
    const list = await getPlayers();
    const filtered = list.filter((x) => x.id !== id);
    await savePlayers(filtered);
    return true;
}

// Games
/**
 * 读取本地所有游戏列表
 * @returns Promise<GameLocal[]> - 存储的游戏数组，若无则返回空数组
 */
async function getGames(): Promise<GameLocal[]> {
    const g = await storage.getLocal<GameLocal[]>(GAMES_KEY);
    return g ?? [];
}

/**
 * 将游戏列表写回本地存储
 * @param list GameLocal[] - 完整的游戏数组，将覆盖原有值
 */
async function saveGames(list: GameLocal[]): Promise<void> {
    await storage.setLocal(GAMES_KEY, list);
}

/**
 * 创建本地游戏记录
 * @param payload { players, initialBuyIn, meta? }
 * @returns Promise<GameLocal> - 新创建的游戏对象（包含 id 与创建时间）
 */
export async function createGame(payload: {
    players: GamePlayerEntry[];
    initialBuyIn: number;
    meta?: Record<string, any>;
}): Promise<GameLocal> {
    const list = await getGames();
    const now = new Date().toISOString();
    const id = uuidv4();
    const game: GameLocal = {
        id,
        createdAt: now,
        players: payload.players,
        initialBuyIn: Number((payload.initialBuyIn || 0).toFixed(2)),
        sbIndex: payload.players.findIndex((p) => p.isSB) ?? null,
        bbIndex: payload.players.findIndex((p) => p.isBB) ?? null,
        meta: payload.meta ?? {},
    };
    list.unshift(game);
    await saveGames(list);
    return game;
}

/**
 * 标记游戏为已开始（设置 startedAt）
 * @param gameId string - 游戏 id
 * @returns Promise<GameLocal | null> - 更新后的游戏或当 id 不存在时返回 null
 */
export async function startGame(gameId: string): Promise<GameLocal | null> {
    const list = await getGames();
    const idx = list.findIndex((g) => g.id === gameId);
    if (idx === -1) return null;
    const now = new Date().toISOString();
    const updated: GameLocal = { ...list[idx], startedAt: now };
    list[idx] = updated;
    await saveGames(list);
    return updated;
}

/**
 * 更新本地游戏记录
 * @param gameId string - 游戏 id
 * @param patch Partial<GameLocal> - 要更新的字段（支持部分字段）
 * @returns Promise<GameLocal | null> - 更新后的游戏或当 id 不存在时返回 null
 */
export async function updateGame(gameId: string, patch: Partial<GameLocal>): Promise<GameLocal | null> {
    const list = await getGames();
    const idx = list.findIndex((g) => g.id === gameId);
    if (idx === -1) return null;
    const updatedPatch = { ...patch } as any;
    if (typeof updatedPatch.initialBuyIn === 'number') {
        updatedPatch.initialBuyIn = Number((updatedPatch.initialBuyIn || 0).toFixed(2));
    }
    const updated = { ...list[idx], ...updatedPatch };
    list[idx] = updated;
    await saveGames(list);
    return updated;
}

/**
 * 根据 id 获取单个游戏
 * @param gameId string - 游戏 id
 * @returns Promise<GameLocal | null> - 游戏对象或 null
 */
export async function getGameById(gameId: string): Promise<GameLocal | null> {
    const list = await getGames();
    return list.find((g) => g.id === gameId) ?? null;
}

export default {
    getPlayers,
    createPlayer,
    updatePlayer,
    deletePlayer,

    getGames,
    createGame,
    startGame,
    updateGame,
    getGameById,
};
