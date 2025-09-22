import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./config";
import { userDoc } from "@/constants/namingVar";

// 批量按 id 查询用户档案（为减少读次数，使用 where in，按 10 个一组拆分）
export const fetchUserProfilesMap = async (ids: string[]) => {
    if (!ids.length) return new Map<string, any>();
    const chunkSize = 10; // Firestore "in" 限制一次最多 10 个
    const map = new Map<string, any>();

    for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const snap = await getDocs(
            query(collection(db, userDoc), where('__name__', 'in', chunk))
        );
        snap.forEach(d => map.set(d.id, d.data()));
    }
    return map;
};

// 依据优先级生成展示名与头像
export const resolveNameAndPhoto = (args: {
    id?: string;
    playerData?: any;
    profileData?: any;
}) => {
    const { id, playerData = {}, profileData = {} } = args;

    const emailPrefix = (() => {
        const e = playerData.email || profileData.email;
        if (typeof e === 'string' && e.includes('@')) return e.split('@')[0];
        return undefined;
    })();

    const location =
        playerData.location ||
        profileData.location ||
        playerData.city ||
        profileData.city;

    // ✅ 显示名优先级：id->nickname->email 前缀->location->“未知玩家”
    const displayName =
        (id && profileData && (profileData.nickname || profileData.fullName)) ||
        playerData.nickname ||
        emailPrefix ||
        location ||
        '未知玩家';
    // ✅ 头像优先：profile.photoUrl -> playerData.photoUrl（都没有则 undefined）
    const photoUrl =
        profileData.photoUrl || profileData.photoURL ||   // ✅ 加上 photoURL
        playerData.photoUrl || playerData.photoURL ||
        undefined;


    return { displayName, photoUrl };
};
