import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Player } from '@/types';
import { playerDoc, userByEmailDoc, userDoc } from '@/constants/namingVar';
import { logInfo } from '@/utils/useLogger';

export async function createOrUpdatePlayerInFirebase(player: Player, hostname?: string): Promise<void> {
    if (!player.id || !player.email) {
        console.warn('⚠️ 缺少 player.id 或 email，无法写入用户信息');
        return;
    }

    const uid = player.id;
    const email = player.email.toLowerCase();

    const userRef = doc(db, userDoc, uid);
    
    // 添加按hostname分组的邮箱映射
    let hostnameEmailRef;
    if (hostname) {
        hostnameEmailRef = doc(db, userByEmailDoc, hostname, playerDoc, email);
    }

    try {
        // 1️⃣ 如果有hostname，先写入按hostname分组的email映射
        if (hostname && hostnameEmailRef) {
            await setDoc(hostnameEmailRef, {
                uid,
                email,
                nickname: player.nickname,
                photoURL: player.photoURL || '',
                registered: true,
                addedByHost: hostname,
                created: new Date().toISOString(),
            });
            
            logInfo(`✅ 玩家信息已写入host分组：${hostname}/${email}`, `uid: ${uid}`);
        }

        // 2️⃣ 写入用户主档（合并昵称/头像等）
        await setDoc(userRef, {
            nickname: player.nickname,
            email,
            photoURL: player.photoURL || '',
            isActive: true,
            created: new Date().toISOString(),
        }, { merge: true });


        logInfo(`✅ 玩家信息已写入：${player.nickname} (${uid})`, `email: ${email}`);
    } catch (error) {
        console.error('❌ 写入玩家信息失败:', error);
    }
}
