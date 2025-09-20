import { v4 as uuidv4 } from 'uuid';
import storage from './storageService';

type User = {
    uid: string;
    email?: string | null;
    displayName?: string | null;
    photoURL?: string | null;
    isAnonymous?: boolean;
};

let currentUser: User | null = null;
const listeners = new Set<(u: User | null) => void>();

function notify() {
    for (const l of Array.from(listeners)) {
        try {
            l(currentUser);
        } catch (e) {
            // swallow
        }
    }
}

/**
 * onAuthStateChanged compatible shim.
 * Accepts either (auth, callback) or (callback).
 */
export function onAuthStateChanged(arg1: any, cb?: (u: User | null) => void) {
    let callback: (u: User | null) => void;
    if (typeof arg1 === 'function') {
        callback = arg1;
    } else if (typeof cb === 'function') {
        callback = cb;
    } else {
        throw new Error('onAuthStateChanged requires a callback');
    }

    listeners.add(callback);
    // immediately notify current state
    try {
        callback(currentUser);
    } catch (e) {
        // ignore
    }

    return () => {
        listeners.delete(callback);
    };
}

export async function signInAnonymously() {
    const uid = uuidv4();
    currentUser = { uid, displayName: 'Guest', isAnonymous: true };
    notify();
    return { user: currentUser };
}

export async function signInWithCredential(credential: any) {
    // credential may include idToken, email, displayName
    const uid = credential?.uid ?? credential?.idToken ?? uuidv4();
    currentUser = {
        uid: String(uid),
        email: credential?.email ?? null,
        displayName: credential?.displayName ?? credential?.name ?? 'Player',
        photoURL: credential?.photoURL ?? null,
        isAnonymous: false,
    };
    notify();
    return { user: currentUser };
}

export async function signOut() {
    currentUser = null;
    notify();
    try {
        await storage.removeLocal('@pokerpal:currentUser');
    } catch (e) {
        // non-fatal
    }
    return;
}

/**
 * Restore an existing user object (from persistent storage) into the shim.
 * This allows persisted sessions to be injected at app startup.
 */
export function restoreUser(user: User | null) {
    currentUser = user;
    notify();
}

export default {
    onAuthStateChanged,
    signInAnonymously,
    signInWithCredential,
    signOut,
};
