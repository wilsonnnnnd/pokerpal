import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Player } from '@/types';
import { playerDoc, userByEmailDoc, userDoc } from '@/constants/namingVar';
import { logInfo } from '@/utils/useLogger';
import { addUserToHostnameIndex } from '@/firebase/fetchUser';

export async function createOrUpdatePlayerInFirebase(player: Player, hostname?: string): Promise<void> {
    if (!player.id || !player.email) {
        console.warn('⚠️ 缺少 player.id 或 email，无法写入用户信息');
        return;
    }

    const uid = player.id;
    const email = player.email.toLowerCase();

    const userRef = doc(db, userDoc, uid);

    try {
        // 1️⃣ 如果有hostname，使用统一的方法写入按hostname分组的email映射
        if (hostname) {
            const success = await addUserToHostnameIndex(hostname, email, {
                uid,
                nickname: player.nickname,
                photoURL: player.photoURL || '',
                provider: 'manual', // 手动添加的玩家
            });
            if (!success) {
                console.warn(`⚠️ 写入host分组失败，但继续写入用户主档：${hostname}/${email}`);
            }
        }

        // 2️⃣ 写入用户主档（合并昵称/头像等）
        await setDoc(userRef, {
            nickname: player.nickname,
            email,
            photoURL: player.photoURL || '',
            isActive: true,
            created: new Date().toISOString(),
        }, { merge: true });

    } catch (error) {
        console.error('❌ 写入玩家信息失败:', error);
    }
}
