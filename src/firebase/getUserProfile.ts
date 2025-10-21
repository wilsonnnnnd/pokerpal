import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { userDoc } from '@/constants/namingVar';
import { FirestoreUserProfile } from '@/types';

// Simple in-memory cache for user profiles to reduce remote calls
const profileCache = new Map<string, { ts: number; data: FirestoreUserProfile | null }>();
const PROFILE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function fetchUserProfile(uid: string): Promise<FirestoreUserProfile | null> {
    if (!uid) return null;

    const now = Date.now();
    const cached = profileCache.get(uid);
    if (cached && now - cached.ts < PROFILE_TTL_MS) {
        return cached.data;
    }

    const ref = doc(db, userDoc, uid);
    const snap = await getDoc(ref);
    const data = snap.exists() ? (snap.data() as FirestoreUserProfile) : null;
    profileCache.set(uid, { ts: now, data });
    return data;
}

export async function userHasRole(uid: string, role: string): Promise<boolean> {
    const p = await fetchUserProfile(uid);
    if (!p) return false;
    return p.role === role;
}

// Utility: clear cache (useful for testing or when role changes)
export function clearUserProfileCache(uid?: string) {
    if (uid) profileCache.delete(uid);
    else profileCache.clear();
}
