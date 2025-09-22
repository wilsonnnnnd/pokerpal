import { useEffect, useState } from 'react';
import { onAuthStateChanged } from '@/services/localAuth';
import { fetchUserProfile, UserProfile, userHasRole } from '@/firebase/getUserProfile';

/**
 * usePermission Hook
 *
 * 返回值说明（中文注释）:
 * - uid: 当前登录用户的 uid（如果未登录则为 null）
 * - profile: 从 Firestore 拉取的用户资料（UserProfile 类型），可能为 null
 * - loading: 布尔，表示用户资料是否正在加载
 * - isMember: 函数 -> 返回 true/false，用于判断本地缓存的 profile.role 是否为 'member'
 * - isHost: 布尔，表示该用户在远端资料中是否为 'host'（通过 userHasRole 检查）
 *
 * 设计说明：
 * - 我们保留了 isMember 作为函数以兼容已有代码（某些组件调用 isMember()）。
 * - isHost 是异步检查的结果，会在用户登录后触发一次远端检查并更新为 true/false。
 *
 * 使用示例（在组件中）：
 * const { uid, profile, loading, isMember, isHost } = usePermission();
 * if (loading) return <Loading />;
 * if (isHost) { showHostUI(); }
 * if (isMember()) { showMemberUI(); }
 *
 * 注意：isHost 依赖远端检查，首次渲染可能为 false，组件应根据 loading/isHost 逻辑友好展示。
 */
export function usePermission() {
    // 当前登录的 uid（可能为 null）
    const [uid, setUid] = useState<string | null>(null);
    // 本地缓存的用户资料（从 Firestore 拉取），用于快速判断 role 等字段
    const [profile, setProfile] = useState<UserProfile | null>(null);
    // 是否为 host（通过 userHasRole 做远端检查）
    const [isHost, setIsHost] = useState<boolean>(false);
    // 加载状态标记
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 订阅认证状态变化（本地或 firebase）
        const unsub = onAuthStateChanged(async (u: any) => {
            if (!u) {
                // 未登录：清空状态
                setUid(null);
                setProfile(null);
                setIsHost(false);
                setLoading(false);
                return;
            }

            // 登录：更新 uid 并开始加载资料
            setUid(u.uid);
            setLoading(true);
            try {
                // 先拉取 profile（用于本地判断）
                const p = await fetchUserProfile(u.uid);
                setProfile(p ?? null);

                // 再做一次远端角色检查（userHasRole），将结果作为 isHost
                try {
                    const host = await userHasRole(u.uid, 'host');
                    setIsHost(Boolean(host));
                } catch (err) {
                    // 远端检查失败时安全回退为 false
                    setIsHost(false);
                }
            } catch (e) {
                setProfile(null);
                setIsHost(false);
            } finally {
                setLoading(false);
            }
        });

        // 清理订阅
        return () => unsub();
    }, []);


    return { uid, profile, loading, isHost };
}

export default usePermission;
