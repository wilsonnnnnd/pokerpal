import { playerDoc, userByEmailDoc } from "@/constants/namingVar";
import { collection, getDocs, query, collectionGroup, doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "./config";

export const fetchUsersByHostname = async (hostEmail: string) => {
    try {
        const emailsCollectionRef = collection(db, userByEmailDoc, hostEmail, playerDoc);
        const querySnapshot = await getDocs(emailsCollectionRef);
        
        const users = querySnapshot.docs.map((doc) => ({
            email: doc.id,
            uid: doc.data().uid || '',
            nickname: doc.data().nickname,
            photoURL: doc.data().photoURL,
            hostname: hostEmail,
            ...doc.data(),
        }));
        
        return users;
    } catch (error) {
        console.error(`获取hostname ${hostEmail} 的用户列表失败:`, error);
        return [];
    }
};

/**
 * 将邮箱索引写入到 userByEmailDoc/{hostname}/{playerDoc}/{emailKey}
 * 用于在特定 hostname 下快速通过邮箱查找用户
 */
export const addUserToHostnameIndex = async (
    email: string,
    userData: { uid: string; nickname: string; photoURL?: string | null; provider?: string }
) => {
    try {
        const emailKey = email.toLowerCase().trim();
        const now = new Date().toISOString();

        const targetRef = doc(db, userByEmailDoc, emailKey, playerDoc, emailKey);

        // 如果索引已存在则使用 update 更新（避免创建新字段覆盖），否则使用 set 创建
        const existing = await getDoc(targetRef);
        const payload = {
            uid: userData.uid,
            nickname: userData.nickname,
            photoURL: userData.photoURL ?? '',
            provider: userData.provider ?? '',
            registered: true,
            lastLinkedAt: now,
        };

        if (existing.exists()) {
            await updateDoc(targetRef, payload);
        } else {
            await setDoc(targetRef, payload, { merge: true });
        }

        return true;
    } catch (error) {
        console.error(`写入 hostname=${email} 下的邮箱索引 ${email} 失败:`, error);
        return false;
    }
};