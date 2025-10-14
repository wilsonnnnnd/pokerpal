import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, getAuth, signInWithCredential as firebaseSignInWithCredential } from 'firebase/auth';

export interface GoogleCredential {
    idToken: string;
    displayName?: string | null;
    email?: string | null;
    photoURL?: string | null;
    googleId?: string | null;
}

export class GoogleAuthService {
    /**
     * 检查 Google 登录配置是否可用
     */
    static isGoogleAuthConfigured(): boolean {
        const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';
        const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
        return !!(iosClientId || webClientId);
    }

    /**
     * 配置 Google 登录
     */
    static async configureGoogleSignIn(): Promise<void> {
        const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';
        const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';

        if (!iosClientId && !webClientId) {
            throw new Error('Google 登录未配置：缺少客户端 ID');
        }

        try {
            await GoogleSignin.configure({
                iosClientId,
                webClientId,
                offlineAccess: true,
                // 明确请求用户信息权限
                scopes: ['profile', 'email'],
                // 确保请求基本权限
                hostedDomain: '', // 空字符串表示任何域名
                forceCodeForRefreshToken: true,
            });
        } catch (error) {
            console.error('Google 登录配置失败:', error);
            throw error;
        }
    }

    /**
     * 执行 Google 登录并获取凭据
     */
    static async getGoogleCredential(): Promise<GoogleCredential> {
        try {
            // 确保已配置
            await this.configureGoogleSignIn();

            // 执行 Google 登录获取用户信息
            const userInfo = await GoogleSignin.signIn();
            
            // 调试：打印完整的用户信息结构
            console.log('Google 登录返回的完整用户信息:', JSON.stringify(userInfo, null, 2));
            
            let idToken: string | null = (userInfo as any)?.idToken ?? null;

            if (!idToken) {
                const tokens = await GoogleSignin.getTokens();
                idToken = (tokens as any)?.idToken ?? null;
                console.log('从 tokens 获取的 idToken:', !!idToken);
            }

            if (!idToken) {
                throw new Error('未获得 Google idToken');
            }

            // 提取用户信息 - 尝试多种路径
            const gi: any = userInfo as any;
            
            // 尝试多种可能的邮箱路径
            const profileEmail = gi?.user?.email || 
                                gi?.email || 
                                gi?.additionalUserInfo?.profile?.email ||
                                gi?.user?.emailAddresses?.[0]?.value ||
                                null;
                                
            // 尝试多种可能的ID路径
            const profileId = gi?.user?.id || 
                             gi?.id || 
                             gi?.additionalUserInfo?.profile?.id ||
                             gi?.user?.userId ||
                             null;
                             
            // 尝试多种可能的姓名路径
            const profileName = gi?.user?.name || 
                               gi?.user?.givenName || 
                               gi?.name || 
                               gi?.additionalUserInfo?.profile?.name ||
                               gi?.user?.displayName ||
                               null;
                               
            // 尝试多种可能的头像路径
            const profilePhoto = gi?.user?.photo || 
                                gi?.user?.photoUrl || 
                                gi?.photo || 
                                gi?.additionalUserInfo?.profile?.picture ||
                                gi?.user?.profileImageUrl ||
                                null;

            // 调试信息：检查返回的用户信息结构
            console.log('Google 用户信息结构:', {
                hasUser: !!gi?.user,
                hasEmail: !!profileEmail,
                hasId: !!profileId,
                hasName: !!profileName,
                userKeys: gi?.user ? Object.keys(gi.user) : [],
                topLevelKeys: Object.keys(gi || {}),
            });

            // 邮箱不是必需的，某些情况下用户可能不提供邮箱权限
            if (!profileEmail) {
                console.warn('Google 登录未返回邮箱信息，将使用默认设置继续');
                // 不抛出错误，允许没有邮箱的情况
            }

            return {
                idToken,
                displayName: profileName || '用户',
                email: profileEmail, // 允许为 null
                photoURL: profilePhoto,
                googleId: profileId,
            };
        } catch (error: any) {
            console.error('Google 登录凭据获取失败:', error);
            
            // 提供更详细的错误信息
            const message = error?.message || error?.toString?.() || '未知错误';
            let hint = '';

            if (message.includes('invalid_client') || message.includes('misconfigured')) {
                hint = ' 请检查 Firebase/Google 客户端 ID 配置与 bundle id/package name 是否一致。';
            } else if (message.includes('DEVELOPER_ERROR') || message.includes('10')) {
                hint = ' Android 需要在 Firebase 控制台配置正确的 SHA-1。';
            } else if (message.includes('network')) {
                hint = ' 请检查网络连接。';
            } else if (message.includes('SIGN_IN_CANCELLED')) {
                hint = ' 用户取消了登录。';
            } else if (message.includes('SIGN_IN_REQUIRED')) {
                hint = ' 需要重新登录Google账户。';
            } else if (message.includes('API_NOT_CONNECTED')) {
                hint = ' Google Play Services API未连接。';
            }

            throw new Error(message + hint);
        }
    }

    /**
     * 使用 Google 凭据通过 Firebase 登录
     * 这是 localAuth.ts 中的实现方式
     */
    static async signInWithCredentialToFirebase(credential: GoogleCredential) {
        try {
            const auth = getAuth();

            if (!credential.idToken) {
                throw new Error('Google 凭据缺少 idToken');
            }

            // 构建 Firebase 凭据并登录
            const firebaseCred = GoogleAuthProvider.credential(credential.idToken);
            const userCred = await firebaseSignInWithCredential(auth, firebaseCred as any);
            const user = userCred.user;

            return {
                user: {
                    uid: String(user.uid),
                    email: user.email ?? null,
                    displayName: user.displayName ?? null,
                    photoURL: user.photoURL ?? null,
                    isAnonymous: user.isAnonymous ?? false,
                }
            };
        } catch (error: any) {
            console.error('Firebase Google 登录失败:', error);
            throw error;
        }
    }

    /**
     * 登出 Google 账户
     */
    static async signOut(): Promise<void> {
        try {
            await GoogleSignin.signOut();
        } catch (error) {
            console.warn('Google 登出失败:', error);
            // 非致命错误，继续执行
        }
    }

    /**
     * 检查 Google 登录是否可用
     */
    static async isGoogleSignInAvailable(): Promise<boolean> {
        try {
            return this.isGoogleAuthConfigured() && await GoogleSignin.hasPlayServices();
        } catch (error) {
            console.warn('Google 登录检查失败:', error);
            return false;
        }
    }
}
