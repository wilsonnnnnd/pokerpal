import { userByEmailDoc } from "@/constants/namingVar";
import { collection, getDocs, query, collectionGroup } from "firebase/firestore";
import { db } from "./config";

export const fetchUsersByEmail = async () => {
    const querySnapshot = await getDocs(collection(db, userByEmailDoc));
    const users = querySnapshot.docs.map((doc) => ({
        email: doc.id,
        uid: doc.data().uid || '',
        nickname: doc.data().nickname,
        photoURL: doc.data().photoURL,
        ...doc.data(),
    }));
    return users;
};

// 新增：按hostname获取用户列表
export const fetchUsersByHostname = async (hostname: string) => {
    try {
        const emailsCollectionRef = collection(db, userByEmailDoc, hostname, 'emails');
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

// 新增：获取所有hostname分组的用户
export const fetchAllHostnameUsers = async () => {
    try {
        // 使用collectionGroup查询所有emails子集合
        const emailsQuery = query(collectionGroup(db, 'emails'));
        const querySnapshot = await getDocs(emailsQuery);
        
        const users = querySnapshot.docs.map((doc) => {
            const docPath = doc.ref.path; // 例如: "userByEmailDoc/hostname/emails/email"
            const pathParts = docPath.split('/');
            const hostname = pathParts[1]; // 提取hostname
            
            return {
                email: doc.id,
                uid: doc.data().uid || '',
                nickname: doc.data().nickname,
                photoURL: doc.data().photoURL,
                hostname: hostname,
                addedByHost: doc.data().addedByHost,
                migratedFrom: doc.data().migratedFrom,
                ...doc.data(),
            };
        });
        
        return users;
    } catch (error) {
        console.error('获取所有hostname用户失败:', error);
        return [];
    }
};

// 更新：获取所有用户（包括全局和hostname分组）
export const fetchAllUsers = async () => {
    try {
        // 获取全局用户
        const globalUsers = await fetchUsersByEmail();
        
        // 获取hostname分组用户
        const hostnameUsers = await fetchAllHostnameUsers();
        
        // 合并并去重（以email为key）
        const userMap = new Map();
        
        // 先添加全局用户
        globalUsers.forEach(user => {
            if (user.email.includes('@')) { // 确保是邮箱地址
                userMap.set(user.email, { ...user, source: 'global' });
            }
        });
        
        // 再添加hostname用户（如果已存在则更新）
        hostnameUsers.forEach(user => {
            const existing = userMap.get(user.email);
            if (existing) {
                // 如果全局用户已存在，添加hostname信息
                userMap.set(user.email, {
                    ...existing,
                    hostname: user.hostname,
                    addedByHost: user.addedByHost,
                    source: 'both'
                });
            } else {
                // 新的hostname用户
                userMap.set(user.email, { ...user, source: 'hostname' });
            }
        });
        
        return Array.from(userMap.values());
    } catch (error) {
        console.error('获取所有用户失败:', error);
        return [];
    }
};
