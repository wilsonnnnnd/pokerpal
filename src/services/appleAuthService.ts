import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';


export interface AppleCredential {
    identityToken: string;
    displayName?: string | null;
    email?: string | null;
    photoURL?: string | null;
    appleId?: string | null;
    nonce?: string;
    authorizationCode?: string | null;
    // 原始 fullName 对象（optional），保留以便需要更丰富的姓名信息时使用
    fullName?: {
        givenName?: string | null;
        familyName?: string | null;
    } | null;
}

export class AppleAuthService {
    // 检查 Apple 登录是否可用
    static async isAppleAuthAvailable(): Promise<boolean> {
        if (Platform.OS !== 'ios') {
            // Apple Sign-In not available on non-iOS platforms
            return false;
        }

        try {
            const isAvailable = await AppleAuthentication.isAvailableAsync();
            return isAvailable;
        } catch (error) {
            console.warn('Apple Auth availability check failed:', error);
            return false;
        }
    }

    // 生成随机 nonce（安全随机）
    private static generateNonce(length = 32): string {
        const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-._';
        const randomBytes = new Uint8Array(length);
        // react-native-get-random-values polyfills globalThis.crypto.getRandomValues
        try {
            (globalThis as any).crypto.getRandomValues(randomBytes);
        } catch (e) {
            // Fallback to Math.random (less secure) if crypto not available
            for (let i = 0; i < length; i++) {
                randomBytes[i] = Math.floor(Math.random() * 256);
            }
        }
        return Array.from(randomBytes).map((b) => chars[b % chars.length]).join('');
    }

    // 计算 SHA-256 哈希（hex）
    private static async sha256(value: string): Promise<string> {
        try {
            const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value);
            return digest;
        } catch (e) {
            console.warn('sha256 digest failed', e);
            // 如果哈希失败，返回原始值（会降低安全性，但允许流程继续）
            return value;
        }
    }

    // Apple 登录 - 获取凭据（与 Google 登录统一接口）
    static async getAppleCredential(): Promise<AppleCredential> {
        // 检查 Apple 登录可用性
        if (!(await this.isAppleAuthAvailable())) {
            throw new Error('Apple 登录在此设备上不可用');
        }

        // 生成 nonce（raw + hashed）并将 hashedNonce 传给 Apple
        const rawNonce = this.generateNonce();
        const hashedNonce = await this.sha256(rawNonce);

        // 执行 Apple 登录，传入 hashed nonce
        let credential: any;
        try {
            credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
                nonce: hashedNonce,
            });
        } catch (err: any) {
            const code = err?.code ?? '';
            const msg = (err?.message ?? String(err || '')).toString().toLowerCase();
            if (code === 'ERR_CANCELED' || msg.includes('cancel') || msg.includes('canceled') || msg.includes('用户取消')) {
                const e = new Error('用户取消了登录');
                (e as any).code = 'ERR_CANCELED';
                throw e;
            }
            throw err;
        }


        if (!credential.identityToken) {
            throw new Error('未获得 Apple 身份令牌');
        }

        // 如果 Apple 返回 fullName 或 email，则优先使用
        let displayName: string | null = null;
        let emailFromCredential: string | null = null;
        let fullNameObj: { givenName?: string | null; familyName?: string | null } | null = null;

        if (credential.fullName) {
            const { givenName, familyName } = credential.fullName;
            fullNameObj = {
                givenName: givenName || null,
                familyName: familyName || null,
            };
            if (givenName || familyName) {
                displayName = [givenName, familyName].filter(Boolean).join(' ').trim() || null;
            }
        }

        if (credential.email) {
            emailFromCredential = credential.email;
        }

        // 如果没有从 fullName 构建到 displayName，则使用默认值
        const finalDisplayName = displayName || '用户';


        return {
            identityToken: credential.identityToken,
            displayName: finalDisplayName,
            email: emailFromCredential || null,
            photoURL: null, // Apple 不提供头像
            appleId: credential.user || null,
            nonce: rawNonce, // 传递原始 nonce 给 Firebase
            authorizationCode: credential.authorizationCode || null,
            fullName: fullNameObj,
        };
    }

}

export default AppleAuthService;
