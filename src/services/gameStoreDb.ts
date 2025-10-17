import { deleteGameFromFirebase } from '@/firebase/deleteGameFromFirebase';
import localDb from './localDb';

export async function deleteGame(gameId: string) {
    if (!gameId) return;
    try {
        await localDb.deleteGameLocal(gameId);
        await deleteGameFromFirebase(gameId);
    } catch (error) {
        console.error('Error deleting game:', error);
    }

}

export async function getGame(gameId: string) {
    return await localDb.getGameLocal(gameId);
}

export default {
    deleteGame,
    getGame,
};
