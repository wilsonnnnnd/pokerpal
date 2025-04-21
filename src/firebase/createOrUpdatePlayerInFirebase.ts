import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Player } from '@/types';
import { userByEmailDoc, userDoc } from '@/constants/namingDb';

export async function createOrUpdatePlayerInFirebase(player: Player): Promise<void> {
    if (!player.id || !player.email) {
        console.warn('⚠️ 缺少 player.id 或 email，无法写入用户信息');
        return;
    }

    const uid = player.id;
    const email = player.email.toLowerCase();

    const userRef = doc(db, userDoc, uid);
    const emailRef = doc(db, userByEmailDoc, email);

    try {
        // 1️⃣ 写入用户主档（合并昵称/头像等）
        await setDoc(userRef, {
            nickname: player.nickname,
            email,
            photoURL: player.photoURL || '',
            isActive: true,
            createdAt: serverTimestamp(),
        }, { merge: true });

        // 2️⃣ 写入 email → uid 映射（用于登录白名单校验）
        await setDoc(emailRef, {
            uid,
            registered: true,
        });

        console.log(`✅ 玩家 ${player.nickname} 信息已写入 Firebase`);
    } catch (error) {
        console.error('❌ 写入玩家信息失败:', error);
    }
}
