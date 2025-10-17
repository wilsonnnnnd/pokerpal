import { CURRENT_USER_KEY } from "@/constants/namingVar";
import storage from '@/services/storageService';

// 获取当前 hoster（沿用 displayName）
export async function getHosterId(): Promise<string | null> {
    const pu = await storage.getLocal(CURRENT_USER_KEY);
    // support multiple possible casing from different writes
    const raw = pu?.email ?? null;
    if (!raw) return null;
    return String(raw).trim() || 'default';
}
