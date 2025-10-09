import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { 
  getAuth, 
  signInWithCredential as firebaseSignInWithCredential, 
  GoogleAuthProvider, 
  OAuthProvider, 
  signOut as firebaseSignOut,
  fetchSignInMethodsForEmail,
  signInAnonymously as firebaseSignInAnonymously
} from 'firebase/auth';
import { db } from '@/firebase/config';
import { userDoc, userByEmailDoc, CURRENT_USER_KEY } from '@/constants/namingVar';
import storage from '@/services/storageService';
import { v4 as uuidv4 } from 'uuid';

// 认证提供商类型
export enum AuthProvider {
  GOOGLE = 'google.com',
  APPLE = 'apple.com',
  ANONYMOUS = 'anonymous',
  EMAIL = 'password',
}

// 邮箱冲突错误类型
export interface EmailConflictError {
  type: 'EMAIL_CONFLICT';
  email: string;
  existingProvider: string;
  currentProvider: string;
}

// 用户类型定义
type User = {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  isAnonymous?: boolean;
  provider?: string;
};

// 认证结果类型
export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
  conflictError?: EmailConflictError;
}

// 用户配置文件类型
export interface UserProfile extends User {}

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
  // 提供商名称映射
  private static getProviderDisplayName(providerId: string): string {
    switch (providerId) {
      case AuthProvider.GOOGLE:
        return 'Google';
      case AuthProvider.APPLE:
        return 'Apple';
      case AuthProvider.EMAIL:
        return '邮箱密码';
      default:
        return providerId;
    }
  }

  // 邮箱预检查 - 检查是否有冲突
  private static async checkEmailConflict(email: string, currentProvider: string): Promise<EmailConflictError | null> {
    try {
      const auth = getAuth();
      const signInMethods = await fetchSignInMethodsForEmail(auth, email);
      
      // 邮箱从未注册，允许注册
      if (signInMethods.length === 0) {
        return null;
      }
      
      // 检查是否包含当前提供商
      if (signInMethods.includes(currentProvider)) {
        // 老用户使用相同提供商，允许登录
        return null;
      }
      
      // 有冲突 - 邮箱被其他提供商使用
      const existingProvider = signInMethods[0]; // 取第一个已存在的提供商
      
      return {
        type: 'EMAIL_CONFLICT',
        email,
        existingProvider,
        currentProvider,
      };
    } catch (error) {
      console.warn('邮箱预检查失败:', error);
      // 如果预检查失败，允许继续（可能是网络问题）
      return null;
    }
  }

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
                console.log('处理 Apple Firebase 凭据...');
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
                
                console.log('Apple 用户创建成功:', currentUser.uid, currentUser.displayName);
                
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
        if (Platform.OS !== 'ios') {
            console.log('Apple 登录检查: 非 iOS 平台');
            return false;
        }

        try {
            const isAvailable = await AppleAuthentication.isAvailableAsync();
            console.log('Apple 登录可用性检查:', isAvailable);
            return isAvailable;
        } catch (error) {
            console.warn('Apple Auth availability check failed:', error);
            return false;
        }
    }

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
          createdAt: now,
          updatedAt: now,
          isProvisioned: true,
        };

        await setDoc(userRef, userData);
        console.log('用户档案已创建:', uid);

        // 如果有邮箱，创建邮箱索引
        if (user.email) {
          const emailKey = user.email.toLowerCase().trim();
          await setDoc(doc(db, userByEmailDoc, emailKey), {
            uid,
            nickname: userData.nickname,
            photoURL: userData.photoURL,
            provider: user.provider,
            registered: true,
            lastLinkedAt: now,
          }, { merge: true });
        }
      } else {
        // 用户已存在，仅更新时间戳
        await setDoc(userRef, { 
          updatedAt: new Date().toISOString() 
        }, { merge: true });
        console.log('用户档案已更新:', uid);
      }
    } catch (error) {
      console.error('初始化用户档案失败:', error);
      throw error;
    }
  }

  // Google 登录
  static async signInWithGoogle(): Promise<AuthResult> {
    try {
      // 检查配置
      const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';
      if (!iosClientId) {
        return {
          success: false,
          error: '登录未配置：未检测到 iOS Google Client ID，构建时请设置 EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID',
        };
      }

      // 执行 Google 登录获取用户信息
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
      const profileEmail = gi?.user?.email ?? gi?.email ?? null;
      
      if (!profileEmail) {
        throw new Error('Google 登录未返回邮箱信息');
      }

      // 邮箱预检查
      const conflict = await this.checkEmailConflict(profileEmail, AuthProvider.GOOGLE);
      if (conflict) {
        return {
          success: false,
          error: `该邮箱 ${conflict.email} 已使用 ${this.getProviderDisplayName(conflict.existingProvider)} 登录注册。请使用 ${this.getProviderDisplayName(conflict.existingProvider)} 登录继续。`,
          conflictError: conflict,
        };
      }

      // 通过验证，执行登录
      const profileId = gi?.user?.id ?? gi?.id ?? null;
      const profileName = gi?.user?.name ?? gi?.user?.givenName ?? gi?.name ?? null;
      const profilePhoto = gi?.user?.photo ?? gi?.user?.photoUrl ?? gi?.photo ?? null;

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

      // 创建用户配置文件
      const userProfile: UserProfile = {
        uid: user.uid,
        email: profileEmail,
        displayName: profileName || '用户',
        photoURL: profilePhoto,
        isAnonymous: false,
        provider: AuthProvider.GOOGLE,
      };

      // 初始化用户档案
      await this.initializeUserProfile(userProfile);

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

      // Apple 特殊处理：有 email 则预检，无 email 则直接登录
      if (credential.email) {
        // 有邮箱，进行预检查
        const conflict = await this.checkEmailConflict(credential.email, AuthProvider.APPLE);
        if (conflict) {
          return {
            success: false,
            error: `该邮箱 ${conflict.email} 已使用 ${this.getProviderDisplayName(conflict.existingProvider)} 登录注册。请使用 ${this.getProviderDisplayName(conflict.existingProvider)} 登录继续。`,
            conflictError: conflict,
          };
        }
      }

      // 构建 Apple 凭据
      const appleCredential = {
        identityToken: credential.identityToken,
        authorizationCode: credential.authorizationCode,
        displayName,
        email: credential.email, // 可能为 null（隐藏邮箱）
        photoURL: null, // Apple 不提供头像
        appleId: credential.user,
      };

      // 使用凭据登录
      const userCred = await this.signInWithCredential(appleCredential);
      const user = userCred.user;

      // 创建用户配置文件
      const userProfile: UserProfile = {
        uid: user.uid,
        email: appleCredential.email ?? user.email,
        displayName: appleCredential.displayName ?? user.displayName,
        photoURL: null,
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

    // Apple 登录 - 简化版本（备用）
    static async signInWithAppleSimple(): Promise<AuthResult> {
        try {
            console.log('开始简化版 Apple 登录...');
            
            // 检查 Apple 登录可用性
            if (!(await this.isAppleAuthAvailable())) {
                return {
                    success: false,
                    error: 'Apple 登录在此设备上不可用',
                };
            }

            // 不使用nonce的简化版本
            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
            });

            console.log('简化版 Apple 认证成功');

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

            // 构建简化的 Apple 凭据（不使用nonce）
            const appleCredential = {
                identityToken: credential.identityToken,
                authorizationCode: credential.authorizationCode,
                displayName,
                email: credential.email,
                photoURL: null,
                appleId: credential.user,
                // 不传递nonce
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

            await this.initializeUserProfile(userProfile);

            console.log('简化版 Apple 登录完成');

            return {
                success: true,
                user: userProfile,
            };
        } catch (error: any) {
            console.error('简化版 Apple 登录错误:', error);
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
      const auth = getAuth();
      const userCred = await firebaseSignInAnonymously(auth);
      const user = userCred.user;
      
      // 创建匿名用户配置
      const userProfile: UserProfile = {
        uid: user.uid,
        email: null,
        displayName: '访客',
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

      // 初始化用户档案
      await this.initializeUserProfile(userProfile);

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