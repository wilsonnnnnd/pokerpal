import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { AuthProvider, AuthResult, UserProfile } from '@/types';

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

    // Apple 登录 - 获取凭据
    static async getAppleCredential(): Promise<{
        identityToken: string;
        authorizationCode?: string | null;
        displayName: string;
        email: string | null;
        photoURL: null;
        appleId: string;
        nonce: string;
    }> {
        // 检查 Apple 登录可用性
        if (!(await this.isAppleAuthAvailable())) {
            throw new Error('Apple 登录在此设备上不可用');
        }

        // 生成 nonce（raw + hashed）并将 hashedNonce 传给 Apple
        const rawNonce = this.generateNonce();
        const hashedNonce = await this.sha256(rawNonce);

        // 执行 Apple 登录，传入 hashed nonce（字段名为 nonce）
        const credential = await AppleAuthentication.signInAsync({
            requestedScopes: [
                AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                AppleAuthentication.AppleAuthenticationScope.EMAIL,
            ],
            // expo-apple-authentication 要求名为 'nonce' 的字段传入已 hash 的 nonce
            nonce: hashedNonce,
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

        return {
            identityToken: credential.identityToken,
            authorizationCode: credential.authorizationCode,
            displayName,
            email: credential.email,
            photoURL: null,
            appleId: credential.user,
            // 将 rawNonce 传递到后续的 Firebase 登录流程，便于 Firebase 验证
            nonce: rawNonce,
        };
    }

    // Apple 登录 - 简化版本（备用）
    static async getAppleCredentialSimple(): Promise<{
        identityToken: string;
        authorizationCode?: string | null;
        displayName: string;
        email: string | null;
        photoURL: null;
        appleId: string;
    }> {
        // 检查 Apple 登录可用性
        if (!(await this.isAppleAuthAvailable())) {
            throw new Error('Apple 登录在此设备上不可用');
        }

        // 不使用nonce的简化版本
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

        return {
            identityToken: credential.identityToken,
            authorizationCode: credential.authorizationCode,
            displayName,
            email: credential.email,
            photoURL: null,
            appleId: credential.user,
        };
    }
}

export default AppleAuthService;
