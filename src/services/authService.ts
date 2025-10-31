import 'react-native-get-random-values';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
    getAuth,
    signInWithCredential as firebaseSignInWithCredential,
    GoogleAuthProvider,
    OAuthProvider,
    signOut as firebaseSignOut,
} from 'firebase/auth';
import { db } from '@/firebase/config';
import { addUserToHostnameIndex } from '@/firebase/fetchUser';
import { clearUserProfileCache } from '@/firebase/getUserProfile';
import { fetchUserProfile } from '@/firebase/getUserProfile';
import { userDoc, CURRENT_USER_KEY } from '@/constants/namingVar';
import storage from '@/services/storageService';
import { AppleAuthService } from '@/services/appleAuthService';
import { GoogleAuthService } from '@/services/googleAuthService';
import { v4 as uuidv4 } from 'uuid';
import { AuthProvider, EmailConflictError, User, AuthResult, UserProfile } from '@/types';


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
    static async initialize() {
        // 配置 Google 登录
        try {
            await GoogleAuthService.configureGoogleSignIn();
        } catch (error) {
            console.warn('Google 登录配置失败:', error);
        }
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
        try {
            // clear cached profile for this uid so subsequent permission checks are fresh
            if (user && user.uid) clearUserProfileCache(user.uid);
        } catch (e) {
            // ignore cache clear errors
        }
        notify();
    }

    // 退出登录
    static async signOut(): Promise<void> {
        try {
            // 退出 Google 账户
            await GoogleAuthService.signOut();
            
            // 退出 Firebase
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
                // Fetch Firestore profile and prefer its fields when available
                let firestoreProfile = null;
                try {
                    firestoreProfile = await fetchUserProfile(String(u.uid));
                } catch (e) {
                    // ignore fetch errors, fall back to firebase user fields
                }
                currentUser = {
                    uid: String(u.uid),
                    email: (firestoreProfile && firestoreProfile.email) ?? u.email ?? null,
                    displayName: (firestoreProfile && firestoreProfile.nickname) ?? u.displayName ?? null,
                    photoURL: (firestoreProfile && firestoreProfile.photoURL) ?? u.photoURL ?? null,
                    isAnonymous: u.isAnonymous ?? false,
                };
                notify();
                try {
                    await storage.setLocal(CURRENT_USER_KEY, currentUser);
                    // skipped metadata logging
                } catch (e) {
                    console.warn('AuthService: failed to persist signed-in user', e);
                }
                return { user: currentUser };
            }

            // Apple 登录：使用 identityToken
            if (credential?.identityToken) {
                // processing Apple Firebase credential
                const provider = new OAuthProvider('apple.com');
                const credentialOptions: any = {
                    idToken: credential.identityToken,
                };

                // 只有当nonce存在时才添加
                if (credential.nonce) {
                    credentialOptions.rawNonce = credential.nonce;
                }

                const firebaseCred = provider.credential(credentialOptions);

                const userCred = await firebaseSignInWithCredential(auth, firebaseCred);
                const u = userCred.user;
                // Fetch Firestore profile and prefer its fields when available
                let firestoreProfile = null;
                try {
                    firestoreProfile = await fetchUserProfile(String(u.uid));
                } catch (e) {
                    // ignore fetch errors
                }

                // Apple 登录时，如果是首次登录且提供了姓名，使用传入的 displayName
                let displayName = u.displayName;
                if (!displayName && credential.displayName) {
                    // skipped metadata logging
                    displayName = credential.displayName;
                }

                currentUser = {
                    uid: String(u.uid),
                    email: (firestoreProfile && firestoreProfile.email) ?? u.email ?? credential.email ?? null,
                    displayName: (firestoreProfile && firestoreProfile.nickname) ?? displayName ?? u.displayName ?? '用户',
                    photoURL: (firestoreProfile && firestoreProfile.photoURL) ?? u.photoURL ?? null,
                    isAnonymous: u.isAnonymous ?? false,
                };

                // Apple user created

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
            // Attempt to fetch Firestore profile for the uid if available
            let firestoreProfile = null;
            try {
                firestoreProfile = await fetchUserProfile(String(uid));
            } catch (e) {
                // ignore
            }
            currentUser = {
                uid: String(uid),
                email: (firestoreProfile && firestoreProfile.email) ?? credential?.email ?? null,
                displayName: (firestoreProfile && firestoreProfile.nickname) ?? credential?.displayName ?? credential?.name ?? 'Player',
                photoURL: (firestoreProfile && firestoreProfile.photoURL) ?? credential?.photoURL ?? null,
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
    // 初始化用户配置文件到 Firestore
    private static async initializeUserProfile(user: UserProfile): Promise<void> {
        try {
            const uid = user.uid;
            const userRef = doc(db, userDoc, uid);

            // 检查用户文档是否已存在
            const existing = await getDoc(userRef);

            if (!existing.exists()) {
                // 用户不存在，创建新档案
                const now = new Date().toISOString();
                const userData = {
                    nickname: user.displayName || '用户',
                    email: user.email || '',
                    photoURL: user.photoURL || '',
                    provider: user.provider || '',
                    isActive: true,
                    role: 'player',
                    created: now,
                    updated: now,
                    isProvisioned: true,
                };

                await setDoc(userRef, userData);

                // 如果有邮箱，创建邮箱索引（同时写入 hostname 分组索引）
                if (user.email) {
                    try {
                        // 优先写入 hostname 分组索引
                        await addUserToHostnameIndex(user.email, {
                            uid,
                            nickname: userData.nickname,
                            photoURL: userData.photoURL,
                            provider: user.provider,
                        });
                    } catch (e) {
                        // 记录但不阻塞主流程
                        console.warn('写入 hostname 索引失败，回退到全局邮箱索引:', e);
                    }
                }
            } else {
                // 用户已存在，仅更新时间戳
                await setDoc(userRef, {
                    updated: new Date().toISOString()
                }, { merge: true });
            }
        } catch (error) {
            console.error('初始化用户档案失败:', error);
            // 如果是权限不足（Missing or insufficient permissions），不要阻塞登录流。
            // 这在开发环境或 Firebase 安全规则未开通写入时很常见。
            try {
                const errAny: any = error;
                const msg = errAny?.message ?? String(errAny);
                const code = errAny?.code ?? '';
                if (
                    code === 'permission-denied' ||
                    msg.includes('Missing or insufficient permissions') ||
                    msg.toLowerCase().includes('permission')
                ) {
                    console.warn('AuthService: Firestore 权限拒绝，跳过远程用户档案写入。');
                    return;
                }
            } catch (e) {
                // ignore
            }

            // 非权限类错误仍然向上抛出以便被调用方处理
            throw error;
        }
    }

    // Google 登录
    static async signInWithGoogle(): Promise<AuthResult> {
        try {
            // 检查 Google 登录是否可用
            if (!GoogleAuthService.isGoogleAuthConfigured()) {
                return {
                    success: false,
                    error: '登录未配置：未检测到 Google Client ID，构建时请设置 EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID 或 EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
                };
            }

            // 获取 Google 凭据
            const googleCredential = await GoogleAuthService.getGoogleCredential();

            // 使用凭据登录并获取用户信息
            const userCred = await GoogleAuthService.signInWithCredentialToFirebase(googleCredential);
            const user = userCred.user;
            console.log('Auth', user)
            // 记录 Google 登录返回的非敏感用户信息，便于调试（不记录 tokens）
            try {
                console.log('Auth', {
                    event: 'GoogleSignInResult',
                    uid: user?.uid ?? null,
                    email: user?.email ?? null,
                    displayName: user?.displayName ?? null,
                    photoURL: user?.photoURL ?? null,
                });
            } catch (e) {
                // 不影响主流程
                console.warn('logInfo failed for GoogleSignInResult', e);
            }

            // 创建用户配置文件，优先使用Firebase返回的用户信息
            const userProfile: UserProfile = {
                uid: user.uid,
                email: user.email || googleCredential.email || null,
                displayName: user.displayName || googleCredential.displayName || '用户',
                photoURL: user.photoURL || googleCredential.photoURL || null,
                isAnonymous: false,
                provider: AuthProvider.GOOGLE,
            };

            // 更新本地认证状态
            currentUser = userProfile;
            notify();
            try { if (currentUser?.uid) clearUserProfileCache(currentUser.uid); } catch (e) { /* ignore */ }

            try {
                await storage.setLocal(CURRENT_USER_KEY, currentUser);
            } catch (error) {
                console.warn('登录：持久化用户失败', error);
            }

            // 初始化用户档案
            await this.initializeUserProfile(userProfile);

            return {
                success: true,
                user: userProfile,
            };
        } catch (error: any) {
            const code = error?.code ?? '';
            const message = error?.message || error?.toString?.() || '未知错误';
            const m = (message || '').toString().toLowerCase();
            const isCancel = code === 'ERR_CANCELED' || m.includes('用户取消') || m.includes('cancel');
            if (!isCancel) {
                console.error('Google 登录错误:', error);
            }

            return {
                success: false,
                error: isCancel ? '用户取消了登录' : message,
            };
        }
    }

    // Apple 登录
    static async signInWithApple(): Promise<AuthResult> {
        try {
            // 使用 AppleAuthService 获取凭据
            const appleCredential = await AppleAuthService.getAppleCredential();

            // 使用凭据登录
            const userCred = await this.signInWithCredential(appleCredential);
            const user = userCred.user;

            // 创建用户配置文件，优先使用Firebase返回的用户信息
            const userProfile: UserProfile = {
                uid: user.uid,
                email: user.email || appleCredential.email || null,
                displayName: user.displayName || appleCredential.displayName || '用户',
                photoURL: user.photoURL || null,
                isAnonymous: false,
                provider: AuthProvider.APPLE,
            };

            // 初始化用户档案
            await this.initializeUserProfile(userProfile);

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
            // 使用本地匿名认证，不依赖 Firebase
            const uid = uuidv4();
            
            // 创建匿名用户配置
            const userProfile: UserProfile = {
                uid,
                email: null,
                displayName: 'Guest',
                photoURL: null,
                isAnonymous: true,
                provider: AuthProvider.ANONYMOUS,
            };

            // 更新本地状态
            currentUser = userProfile;
            notify();

            try {
                await storage.setLocal(CURRENT_USER_KEY, currentUser);
            } catch (error) {
                console.warn('登录：持久化访客用户失败', error);
            }

            // 仅对匿名用户进行本地初始化，不创建 Firestore 档案
            // 匿名用户通常不需要持久化到远程数据库

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
        const google = GoogleAuthService.isGoogleAuthConfigured();
        const apple = await AppleAuthService.isAppleAuthAvailable();
        const anonymous = true; // 总是可用

        return { google, apple, anonymous };
    }
}

// 导出兼容的函数以便于迁移
export const onAuthStateChanged = AuthService.onAuthStateChanged;
export const restoreUser = AuthService.restoreUser;
export const signOut = AuthService.signOut;

export default AuthService;