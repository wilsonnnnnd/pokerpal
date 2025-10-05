import { v4 as uuidv4 } from 'uuid';
import storage from './storageService';
import { getAuth, signInWithCredential as firebaseSignInWithCredential, GoogleAuthProvider, signOut as firebaseSignOut } from 'firebase/auth';
import { CURRENT_USER_KEY } from '@/constants/namingVar';

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
    currentUser = { uid, displayName: 'Guest', isAnonymous: true  };
    notify();
    try {
        await storage.setLocal(CURRENT_USER_KEY, currentUser);
    } catch (e) {
        console.warn('localAuth: failed to persist anonymous user', e);
    }
    return { user: currentUser };
}

export async function signInWithCredential(credential: any) {
    // credential may include idToken, email, displayName
    try {
        const auth = getAuth();

        // If an idToken is provided, build a Google credential and sign in via Firebase
        if (credential?.idToken) {
            const firebaseCred = GoogleAuthProvider.credential(credential.idToken);
            const userCred = await firebaseSignInWithCredential(auth, firebaseCred as any);
            const u = userCred.user;
            currentUser = {
                uid: String(u.uid),
                email: u.email ?? null,
                displayName: u.displayName ?? null,
                photoURL: u.photoURL ?? null,
                isAnonymous: u.isAnonymous ?? false,
            };
            notify();
            try {
                await storage.setLocal(CURRENT_USER_KEY, currentUser);
            } catch (e) {
                console.warn('localAuth: failed to persist signed-in user', e);
            }
            return { user: currentUser };
        }

        // Fallback: if no idToken, fall back to creating a local user record
        const uid = credential?.uid ?? uuidv4();
        currentUser = {
            uid: String(uid),
            email: credential?.email ?? null,
            displayName: credential?.displayName ?? credential?.name ?? 'Player',
            photoURL: credential?.photoURL ?? null,
            isAnonymous: false,
        };
        notify();
        try {
            await storage.setLocal(CURRENT_USER_KEY, currentUser);
        } catch (e) {
            console.warn('localAuth: failed to persist signed-in user', e);
        }
        return { user: currentUser };
    } catch (err) {
        console.error('localAuth.signInWithCredential error', err);
        throw err;
    }
}

export async function signOut() {
    try {
        const auth = getAuth();
        try {
            await firebaseSignOut(auth);
        } catch (e) {
            // ignore native signOut errors, still clear local state
        }
    } catch (e) {
        // ignore
    }
    currentUser = null;
    notify();
    try {
        await storage.removeLocal(CURRENT_USER_KEY);
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
