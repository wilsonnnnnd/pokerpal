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

        await GoogleSignin.configure({
            iosClientId,
            webClientId,
            scopes: ['profile', 'email'],
            offlineAccess: true,
        });
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
            let idToken: string | null = (userInfo as any)?.data?.idToken ?? null;
            if (!idToken) {
                try {
                    const tokens = await GoogleSignin.getTokens();
                    idToken = tokens?.idToken ?? null;
                } catch (tkErr: any) {
                    const tmsg = (tkErr?.message ?? String(tkErr || '')).toString().toLowerCase();
                    // On some platforms getTokens throws when sign-in was cancelled/not completed
                    if (tmsg.includes('gettokens requires') || tmsg.includes('requires a user to be signed in')) {
                        const e = new Error('用户取消了登录');
                        (e as any).code = 'ERR_CANCELED';
                        throw e;
                    }
                    throw tkErr;
                }
            }

            if (!idToken) {
                throw new Error('未获得 Google idToken');
            }

            // 从 Google Sign-In 响应中提取用户信息
            const userData = (userInfo as any)?.data?.user;
            
            const profileId = userData?.id || null;
            const profileName = userData?.name || null;
            const profileEmail = userData?.email || null;
            const profilePhoto = userData?.photo || null;


            return {
                idToken,
                displayName: profileName || '用户',
                email: profileEmail, // 允许为 null
                photoURL: profilePhoto,
                googleId: profileId,
            };
        } catch (error: any) {
            const code = error?.code ?? '';
            const msg = (error?.message ?? String(error || '')).toString();
            const m = msg.toLowerCase();
            // detect user-cancelled flows from various platforms
            const isCancel = (
                code === 'SIGN_IN_CANCELLED' ||
                code === 'CANCELLED' ||
                m.includes('cancel') ||
                m.includes('cancelled') ||
                m.includes('user cancelled') ||
                m.includes('user canceled')
            );

            if (isCancel) {
                const e = new Error('用户取消了登录');
                (e as any).code = 'ERR_CANCELED';
                throw e;
            }

            // log only non-cancel errors
            console.error('Google 登录凭据获取失败:', error);
            throw error;
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

            // 如果 Firebase 用户缺少 profile 信息，使用 Google 凭据更新
            if ((!user.displayName || !user.photoURL) && (credential.displayName || credential.photoURL)) {
                try {
                    const { updateProfile } = await import('firebase/auth');
                    await updateProfile(user, {
                        displayName: credential.displayName || user.displayName || null,
                        photoURL: credential.photoURL || user.photoURL || null,
                    });
                } catch (updateError) {
                    console.warn('Firebase profile 更新失败:', updateError);
                }
            }

            return {
                user: {
                    uid: String(user.uid),
                    email: user.email ?? null,
                    displayName: user.displayName ?? credential.displayName ?? null,
                    photoURL: user.photoURL ?? credential.photoURL ?? null,
                    isAnonymous: user.isAnonymous ?? false,
                }
            };
        } catch (error: any) {
            const code = error?.code ?? '';
            const msg = (error?.message ?? String(error || '')).toString().toLowerCase();
            const isCancel = code === 'ERR_CANCELED' || msg.includes('用户取消') || msg.includes('cancel');
            if (!isCancel) {
                console.error('Firebase Google 登录失败:', error);
            }
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
