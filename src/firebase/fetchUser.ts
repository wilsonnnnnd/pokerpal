import { playerDoc, userByEmailDoc } from "@/constants/namingVar";
import { collection, getDocs, query, collectionGroup, doc, setDoc } from "firebase/firestore";
import { db } from "./config";

export const fetchUsersByHostname = async (hostname: string) => {
    try {
        const emailsCollectionRef = collection(db, userByEmailDoc, hostname, playerDoc);
        const querySnapshot = await getDocs(emailsCollectionRef);
        
        const users = querySnapshot.docs.map((doc) => ({
            email: doc.id,
            uid: doc.data().uid || '',
            nickname: doc.data().nickname,
            photoURL: doc.data().photoURL,
            hostname: hostname,
            ...doc.data(),
        }));
        
        return users;
    } catch (error) {
        console.error(`获取hostname ${hostname} 的用户列表失败:`, error);
        return [];
    }
};

/**
 * 将邮箱索引写入到 userByEmailDoc/{hostname}/{playerDoc}/{emailKey}
 * 用于在特定 hostname 下快速通过邮箱查找用户
 */
export const addUserToHostnameIndex = async (
    hostname: string,
    email: string,
    userData: { uid: string; nickname: string; photoURL?: string | null; provider?: string }
) => {
    try {
        const emailKey = email.toLowerCase().trim();
        const now = new Date().toISOString();

        const targetRef = doc(db, userByEmailDoc, hostname, playerDoc, emailKey);

        await setDoc(targetRef, {
            uid: userData.uid,
            nickname: userData.nickname,
            photoURL: userData.photoURL ?? '',
            provider: userData.provider ?? '',
            registered: true,
            lastLinkedAt: now,
        }, { merge: true });

        return true;
    } catch (error) {
        console.error(`写入 hostname=${hostname} 下的邮箱索引 ${email} 失败:`, error);
        return false;
    }
};