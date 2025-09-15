import localDb from './localDb';

export async function deleteGame(gameId: string) {
    if (!gameId) return;
    await localDb.deleteGameLocal(gameId);
}

export async function getGame(gameId: string) {
    return await localDb.getGameLocal(gameId);
}

export default {
    deleteGame,
    getGame,
};
