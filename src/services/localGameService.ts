import { v4 as uuidv4 } from 'uuid';
import storage from './storageService';
import { PlayerLocal, GameLocal, GamePlayerEntry } from '@/types/localModels';

const PLAYERS_KEY = '@pokerpal:players';
const GAMES_KEY = '@pokerpal:games';

async function getPlayers(): Promise<PlayerLocal[]> {
    const p = await storage.getLocal<PlayerLocal[]>(PLAYERS_KEY);
    return p ?? [];
}

async function savePlayers(list: PlayerLocal[]): Promise<void> {
    await storage.setLocal(PLAYERS_KEY, list);
}

export async function createPlayer(payload: Omit<PlayerLocal, 'id' | 'createdAt' | 'updatedAt'>): Promise<PlayerLocal> {
    const list = await getPlayers();
    const id = uuidv4();
    const now = new Date().toISOString();
    const p: PlayerLocal = {
        id,
        nickname: payload.nickname,
        totalProfit: payload.totalProfit ?? 0,
        averageROI: payload.averageROI ?? 0,
        gamesPlayed: payload.gamesPlayed ?? 0,
        photoURL: payload.photoURL,
        createdAt: now,
        updatedAt: now,
    };
    list.unshift(p);
    await savePlayers(list);
    return p;
}

export async function updatePlayer(id: string, patch: Partial<PlayerLocal>): Promise<PlayerLocal | null> {
    const list = await getPlayers();
    const idx = list.findIndex((x) => x.id === id);
    if (idx === -1) return null;
    const now = new Date().toISOString();
    const updated = { ...list[idx], ...patch, updatedAt: now };
    list[idx] = updated;
    await savePlayers(list);
    return updated;
}

export async function deletePlayer(id: string): Promise<boolean> {
    const list = await getPlayers();
    const filtered = list.filter((x) => x.id !== id);
    await savePlayers(filtered);
    return true;
}

// Games
async function getGames(): Promise<GameLocal[]> {
    const g = await storage.getLocal<GameLocal[]>(GAMES_KEY);
    return g ?? [];
}

async function saveGames(list: GameLocal[]): Promise<void> {
    await storage.setLocal(GAMES_KEY, list);
}

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
        initialBuyIn: payload.initialBuyIn,
        sbIndex: payload.players.findIndex((p) => p.isSB) ?? null,
        bbIndex: payload.players.findIndex((p) => p.isBB) ?? null,
        meta: payload.meta ?? {},
    };
    list.unshift(game);
    await saveGames(list);
    return game;
}

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

export async function updateGame(gameId: string, patch: Partial<GameLocal>): Promise<GameLocal | null> {
    const list = await getGames();
    const idx = list.findIndex((g) => g.id === gameId);
    if (idx === -1) return null;
    const updated = { ...list[idx], ...patch };
    list[idx] = updated;
    await saveGames(list);
    return updated;
}

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
