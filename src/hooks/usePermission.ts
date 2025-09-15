import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase/config';
import { fetchUserProfile, UserProfile } from '@/firebase/getUserProfile';

export function usePermission() {
    const [uid, setUid] = useState<string | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth as any, async (u) => {
            if (!u) {
                setUid(null);
                setProfile(null);
                setLoading(false);
                return;
            }

            setUid(u.uid);
            setLoading(true);
            try {
                const p = await fetchUserProfile(u.uid);
                setProfile(p ?? null);
            } catch (e) {
                setProfile(null);
            } finally {
                setLoading(false);
            }
        });

        return () => unsub();
    }, []);

    function isMember(): boolean {
        return profile?.role === 'member';
    }

    return { uid, profile, loading, isMember };
}

export default usePermission;
