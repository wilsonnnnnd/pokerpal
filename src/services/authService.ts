import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth, signInWithCredential as firebaseSignInWithCredential, GoogleAuthProvider, OAuthProvider, signOut as firebaseSignOut } from 'firebase/auth';
import { db } from '@/firebase/config';
import { userDoc, userByEmailDoc, CURRENT_USER_KEY } from '@/constants/namingVar';
import storage from '@/services/storageService';
import { v4 as uuidv4 } from 'uuid';

// 认证提供商类型
export enum AuthProvider {
    GOOGLE = 'google',
    APPLE = 'apple',
    ANONYMOUS = 'anonymous',
}

// 用户类型定义
type User = {
    uid: string;
    email?: string | null;
    displayName?: string | null;
    photoURL?: string | null;
    isAnonymous?: boolean;
};

// 认证结果类型
export interface AuthResult {
    success: boolean;
    user?: User;
    error?: string;
}

// 用户配置文件类型
export interface UserProfile extends User { }

// 全局状态管理
let currentUser: User | null = null;
const listeners = new Set<(u: User | null) => void>();

function notify() {
    for (const l of Array.from(listeners)) {
        try {
            l(currentUser);
        } catch (e) {
            // swallow
        }
    }
}

class AuthService {
    // 初始化认证服务
    static initialize() {
        // 配置 Google 登录
        GoogleSignin.configure({
            iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
            webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
        });
    }

    // 认证状态监听器 (兼容 Firebase Auth API)
    static onAuthStateChanged(arg1: any, cb?: (u: User | null) => void) {
        let callback: (u: User | null) => void;
        if (typeof arg1 === 'function') {
            callback = arg1;
        } else if (typeof cb === 'function') {
            callback = cb;
        } else {
            throw new Error('onAuthStateChanged requires a callback');
        }

        listeners.add(callback);
        // 立即通知当前状态
        try {
            callback(currentUser);
        } catch (e) {
            // ignore
        }

        return () => {
            listeners.delete(callback);
        };
    }

    // 恢复用户状态（从持久化存储）
    static restoreUser(user: User | null) {
        currentUser = user;
        notify();
    }

    // 退出登录
    static async signOut(): Promise<void> {
        try {
            const auth = getAuth();
            try {
                await firebaseSignOut(auth);
            } catch (e) {
                // ignore native signOut errors, still clear local state
            }
        } catch (e) {
            // ignore
        }
        currentUser = null;
        notify();
        try {
            await storage.removeLocal(CURRENT_USER_KEY);
        } catch (e) {
            // non-fatal
        }
    }

    // 底层凭据登录方法
    private static async signInWithCredential(credential: any): Promise<{ user: User }> {
        try {
            const auth = getAuth();

            // Google 登录：使用 idToken
            if (credential?.idToken) {
                const firebaseCred = GoogleAuthProvider.credential(credential.idToken);
                const userCred = await firebaseSignInWithCredential(auth, firebaseCred as any);
                const u = userCred.user;
                currentUser = {
                    uid: String(u.uid),
                    email: u.email ?? null,
                    displayName: u.displayName ?? null,
                    photoURL: u.photoURL ?? null,
                    isAnonymous: u.isAnonymous ?? false,
                };
                notify();
                try {
                    await storage.setLocal(CURRENT_USER_KEY, currentUser);
                } catch (e) {
                    console.warn('AuthService: failed to persist signed-in user', e);
                }
                return { user: currentUser };
            }

            // Apple 登录：使用 identityToken
            if (credential?.identityToken) {
                const provider = new OAuthProvider('apple.com');
                const firebaseCred = provider.credential({
                    idToken: credential.identityToken,
                    rawNonce: credential.nonce, // 如果使用 nonce
                });

                const userCred = await firebaseSignInWithCredential(auth, firebaseCred);
                const u = userCred.user;

                // Apple 登录时，如果是首次登录且提供了姓名，使用传入的 displayName
                let displayName = u.displayName;
                if (!displayName && credential.displayName) {
                    displayName = credential.displayName;
                }

                currentUser = {
                    uid: String(u.uid),
                    email: u.email ?? credential.email ?? null,
                    displayName: displayName ?? '用户',
                    photoURL: u.photoURL ?? null,
                    isAnonymous: u.isAnonymous ?? false,
                };
                notify();
                try {
                    await storage.setLocal(CURRENT_USER_KEY, currentUser);
                } catch (e) {
                    console.warn('AuthService: failed to persist signed-in user', e);
                }
                return { user: currentUser };
            }

            // Fallback: if no idToken or identityToken, fall back to creating a local user record
            const uid = credential?.uid ?? uuidv4();
            currentUser = {
                uid: String(uid),
                email: credential?.email ?? null,
                displayName: credential?.displayName ?? credential?.name ?? 'Player',
                photoURL: credential?.photoURL ?? null,
                isAnonymous: false,
            };
            notify();
            try {
                await storage.setLocal(CURRENT_USER_KEY, currentUser);
            } catch (e) {
                console.warn('AuthService: failed to persist signed-in user', e);
            }
            return { user: currentUser };
        } catch (err) {
            console.error('AuthService.signInWithCredential error', err);
            throw err;
        }
    }

    // 本地匿名登录方法
    private static async signInAnonymouslyLocal(): Promise<{ user: User }> {
        const uid = uuidv4();
        currentUser = { uid, displayName: 'Guest', isAnonymous: true };
        notify();
        try {
            await storage.setLocal(CURRENT_USER_KEY, currentUser);
        } catch (e) {
            console.warn('AuthService: failed to persist anonymous user', e);
        }
        return { user: currentUser };
    }

    // 检查 Apple 登录是否可用
    static async isAppleAuthAvailable(): Promise<boolean> {
        if (Platform.OS !== 'ios') return false;

        try {
            return await AppleAuthentication.isAvailableAsync();
        } catch (error) {
            console.warn('Apple Auth availability check failed:', error);
            return false;
        }
    }

    // 保存用户配置文件到 Firestore
    private static async saveUserProfile(user: UserProfile): Promise<void> {
        try {
            const uid = user.uid;
            const userRef = doc(db, userDoc, uid);

            try {
                const existing = await getDoc(userRef);
                const now = new Date().toISOString();

                if (existing.exists()) {
                    // 只更新时间戳
                    await setDoc(userRef, { updated: now }, { merge: true });
                } else {
                    // 创建新用户档案
                    const data = {
                        nickname: user.displayName || '用户',
                        email: user.email || '',
                        photoURL: user.photoURL || '',
                        isActive: true,
                        role: 'player',
                        updated: now,
                        created: now,
                    };

                    await setDoc(userRef, data, { merge: true });

                    // 如果有邮箱，创建邮箱索引
                    if (user.email) {
                        const key = user.email.toLowerCase().trim();
                        await setDoc(doc(db, userByEmailDoc, key), {
                            uid,
                            nickname: data.nickname,
                            photoURL: data.photoURL,
                            registered: true,
                            lastLinkedAt: now,
                        }, { merge: true });
                    }
                }
            } catch (error) {
                // 兜底处理：如果 getDoc 失败，尝试写入完整档案
                const now = new Date().toISOString();
                const data = {
                    nickname: user.displayName || '用户',
                    email: user.email || '',
                    photoURL: user.photoURL || '',
                    isActive: true,
                    role: 'player',
                    updated: now,
                    created: now,
                };

                await setDoc(userRef, data, { merge: true });
            }
        } catch (error) {
            console.error('保存用户配置文件失败:', error);
            throw error;
        }
    }

    // Google 登录
    static async signInWithGoogle(): Promise<AuthResult> {
        try {
            // 检查 iOS 客户端 ID 配置
            const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';
            if (!iosClientId) {
                return {
                    success: false,
                    error: '登录未配置：未检测到 iOS Google Client ID，构建时请设置 EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID',
                };
            }

            // 执行 Google 登录
            const userInfo = await GoogleSignin.signIn();
            let idToken: string | null = (userInfo as any)?.idToken ?? null;

            if (!idToken) {
                const tokens = await GoogleSignin.getTokens();
                idToken = (tokens as any)?.idToken ?? null;
            }

            if (!idToken) {
                throw new Error('未获得 idToken');
            }

            // 提取用户信息
            const gi: any = userInfo as any;
            const profileId = gi?.user?.id ?? gi?.id ?? null;
            const profileName = gi?.user?.name ?? gi?.user?.givenName ?? gi?.name ?? null;
            const profilePhoto = gi?.user?.photo ?? gi?.user?.photoUrl ?? gi?.photo ?? null;
            const profileEmail = gi?.user?.email ?? gi?.email ?? null;

            const googleCredential = {
                idToken,
                displayName: profileName,
                email: profileEmail,
                photoURL: profilePhoto,
                googleId: profileId,
            };

            // 使用凭据登录
            const userCred = await this.signInWithCredential(googleCredential);
            const user = userCred.user;

            // 保存用户配置文件
            const userProfile: UserProfile = {
                uid: user.uid,
                email: googleCredential.email ?? user.email,
                displayName: googleCredential.displayName ?? user.displayName,
                photoURL: googleCredential.photoURL ?? user.photoURL,
                isAnonymous: user.isAnonymous,
            };

            await this.saveUserProfile(userProfile);

            // 验证持久化
            try {
                await storage.getLocal(CURRENT_USER_KEY);
            } catch (error) {
                console.warn('登录：读取持久化用户失败', error);
            }

            return {
                success: true,
                user: userProfile,
            };
        } catch (error: any) {
            console.error('Google 登录错误:', error);

            const message = error?.message || error?.toString?.() || '未知错误';
            let hint = '';

            if (message.includes('invalid_client') || message.includes('misconfigured')) {
                hint = ' 请检查 Firebase/Google 客户端 ID 配置与 bundle id/package name 是否一致。';
            } else if (message.includes('DEVELOPER_ERROR') || message.includes('10')) {
                hint = ' Android 需要在 Firebase 控制台配置正确的 SHA-1。';
            }

            return {
                success: false,
                error: message + hint,
            };
        }
    }

    // Apple 登录
    static async signInWithApple(): Promise<AuthResult> {
        try {
            // 检查 Apple 登录可用性
            if (!(await this.isAppleAuthAvailable())) {
                return {
                    success: false,
                    error: 'Apple 登录在此设备上不可用',
                };
            }

            // 执行 Apple 登录
            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
            });

            if (!credential.identityToken) {
                throw new Error('未获得 Apple 身份令牌');
            }

            // 构建显示名称
            let displayName = '用户';
            if (credential.fullName) {
                const { givenName, familyName } = credential.fullName;
                if (givenName || familyName) {
                    displayName = [givenName, familyName].filter(Boolean).join(' ').trim() || '用户';
                }
            }

            // 构建 Apple 凭据
            const appleCredential = {
                identityToken: credential.identityToken,
                authorizationCode: credential.authorizationCode,
                displayName,
                email: credential.email,
                photoURL: null, // Apple 不提供头像
                appleId: credential.user,
            };

            // 使用凭据登录
            const userCred = await this.signInWithCredential(appleCredential);
            const user = userCred.user;

            // 保存用户配置文件
            const userProfile: UserProfile = {
                uid: user.uid,
                email: appleCredential.email ?? user.email,
                displayName: appleCredential.displayName ?? user.displayName,
                photoURL: appleCredential.photoURL ?? user.photoURL,
                isAnonymous: user.isAnonymous,
            };

            await this.saveUserProfile(userProfile);

            return {
                success: true,
                user: userProfile,
            };
        } catch (error: any) {
            console.error('Apple 登录错误:', error);

            // Apple 登录特定错误处理
            if (error.code === 'ERR_CANCELED') {
                return {
                    success: false,
                    error: '用户取消了登录',
                };
            }

            const message = error?.message || error?.toString?.() || '未知错误';
            return {
                success: false,
                error: `Apple 登录失败: ${message}`,
            };
        }
    }

    // 匿名登录
    static async signInAnonymously(): Promise<AuthResult> {
        try {
            const cred = await this.signInAnonymouslyLocal();

            // 验证持久化
            try {
                await storage.getLocal(CURRENT_USER_KEY);
            } catch (error) {
                console.warn('登录：读取持久化访客用户失败', error);
            }

            const userProfile: UserProfile = {
                uid: cred.user.uid,
                email: null,
                displayName: '访客',
                photoURL: null,
                isAnonymous: true,
            };

            return {
                success: true,
                user: userProfile,
            };
        } catch (error: any) {
            console.error('匿名登录错误:', error);

            return {
                success: false,
                error: error?.message ?? String(error),
            };
        }
    }

    // 获取可用的登录方式
    static async getAvailableAuthMethods(): Promise<{
        google: boolean;
        apple: boolean;
        anonymous: boolean;
    }> {
        const google = !!(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);
        const apple = await this.isAppleAuthAvailable();
        const anonymous = true; // 总是可用

        return { google, apple, anonymous };
    }
}

// 导出兼容的函数以便于迁移
export const onAuthStateChanged = AuthService.onAuthStateChanged;
export const restoreUser = AuthService.restoreUser;
export const signOut = AuthService.signOut;

export default AuthService;