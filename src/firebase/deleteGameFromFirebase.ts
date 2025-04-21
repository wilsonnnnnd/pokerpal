import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { gameDoc } from '@/constants/namingDb';

export const deleteGameFromFirebase = async (gameId: string) => {
    if (!gameId) return;

    const gameRef = doc(db, gameDoc, gameId);
    await deleteDoc(gameRef);
};
