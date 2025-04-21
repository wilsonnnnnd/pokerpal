import * as Crypto from 'expo-crypto';

export async function hashEmail(email: string): Promise<string> {
    return await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        email.trim().toLowerCase()
    );
}
