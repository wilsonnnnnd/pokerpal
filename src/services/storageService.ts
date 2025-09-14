import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { fetchUserProfile } from '@/firebase/getUserProfile';

export type RemotePath = { collection: string; docId: string };

// Local storage helpers
export async function setLocal(key: string, value: any): Promise<void> {
    try {
        const raw = JSON.stringify(value);
        await AsyncStorage.setItem(key, raw);
    } catch (err) {
        console.error('setLocal error', err);
        throw err;
    }
}

export async function getLocal<T = any>(key: string): Promise<T | null> {
    try {
        const raw = await AsyncStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : null;
    } catch (err) {
        console.error('getLocal error', err);
        return null;
    }
}

export async function removeLocal(key: string): Promise<void> {
    try {
        await AsyncStorage.removeItem(key);
    } catch (err) {
        console.error('removeLocal error', err);
        throw err;
    }
}

// Remote storage helpers (Firestore)
export async function setRemote(path: RemotePath, data: any, merge = true): Promise<void> {
    try {
        const ref = doc(db, path.collection, path.docId);
        await setDoc(ref, data, { merge });
    } catch (err) {
        console.error('setRemote error', err);
        throw err;
    }
}

export async function getRemote<T = any>(path: RemotePath): Promise<T | null> {
    try {
        const ref = doc(db, path.collection, path.docId);
        const snap = await getDoc(ref);
        if (!snap.exists()) return null;
        return snap.data() as T;
    } catch (err) {
        console.error('getRemote error', err);
        return null;
    }
}

export async function deleteRemote(path: RemotePath): Promise<void> {
    try {
        const ref = doc(db, path.collection, path.docId);
        await deleteDoc(ref);
    } catch (err) {
        console.error('deleteRemote error', err);
        throw err;
    }
}

// Permission-checked write: only allow write when user's role is in allowedRoles
export async function saveRemoteWithRoleCheck(
    actingUid: string,
    path: RemotePath,
    data: any,
    allowedRoles: string[] = ['player', 'admin']
): Promise<boolean> {
    // returns true if write succeeded
    try {
        const profile = await fetchUserProfile(actingUid);
        if (!profile) {
            throw new Error('user profile not found');
        }

        const role = profile.role ?? 'player';
        if (!allowedRoles.includes(role)) {
            throw new Error(`insufficient role: ${role}`);
        }

        await setRemote(path, data, true);
        return true;
    } catch (err) {
        console.error('saveRemoteWithRoleCheck error', err);
        return false;
    }
}

// Sync local key to remote path
export async function syncLocalToRemote(key: string, path: RemotePath, actingUid?: string): Promise<boolean> {
    try {
        const local = await getLocal(key);
        if (local == null) return false;

        if (actingUid) {
            return await saveRemoteWithRoleCheck(actingUid, path, local);
        }

        await setRemote(path, local);
        return true;
    } catch (err) {
        console.error('syncLocalToRemote error', err);
        return false;
    }
}

export default {
    setLocal,
    getLocal,
    removeLocal,
    setRemote,
    getRemote,
    deleteRemote,
    saveRemoteWithRoleCheck,
    syncLocalToRemote,
};
