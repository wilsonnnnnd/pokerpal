import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { userDoc } from '@/constants/namingVar';

export type UserProfile = {
    nickname?: string;
    email?: string;
    photoURL?: string;
    role?: string;
    isActive?: boolean;
};

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
    if (!uid) return null;
    const ref = doc(db, userDoc, uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as UserProfile;
}

export async function userHasRole(uid: string, role: string): Promise<boolean> {
    const p = await fetchUserProfile(uid);
    if (!p) return false;
    return p.role === role;
}
