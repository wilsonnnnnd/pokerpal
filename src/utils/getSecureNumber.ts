import { getRandomValues } from 'expo-crypto';

export const generateSecureId = (type: string) => {
    const array = new Uint8Array(6); // 6字节足够
    getRandomValues(array);

    // Base64URL 编码（安全且短）
    let base64 = btoa(String.fromCharCode(...array))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    // 确保包含字母
    if (!/[A-Za-z]/.test(base64)) {
        base64 = 'A' + base64.slice(1);
    }

    const shortTimestamp = Date.now().toString(36).toUpperCase();
    return `${type}-${shortTimestamp}-${base64}`;
};


export function generateToken(length = 16): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'; // Base64 字符集
    let result = '';

    // 随机填充字符
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        result += charset[randomIndex];
    }

    return result;
}

