import { collection, getDocs, orderBy, query, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { userDoc, gameDoc } from '@/constants/namingVar';

// 用户游戏历史记录类型
export interface UserGameHistoryItem {
    gameId: string;
    created: string;
    settleCashAmount: number | null;
    settleCashDiff: number | null;
    settleROI: number | null;
    totalBuyInCash: number;
    totalBuyInChips: number;
    result: 'win' | 'lose' | 'even';
    finalizedAt: string;
    // 可选的游戏详情（从主游戏文档获取）
    gameDetails?: {
        smallBlind?: number;
        bigBlind?: number;
        playerCount?: number;
        finalized?: boolean;
        status?: string;
    };
}


export async function fetchUserGameHistory(
    uid: string,
    limitCount = 20,
    includeGameDetails = false
): Promise<UserGameHistoryItem[]> {
    if (!uid) {
        console.warn('fetchUserGameHistory: uid is required');
        return [];
    }

    try {
        // 从用户游戏历史子集合获取数据
        // 路径: /userDoc/{uid}/gameDoc/{gameId}
        const userGamesRef = collection(db, userDoc, uid, gameDoc);
        const q = query(
            userGamesRef,
            orderBy('finalizedAt', 'desc'),
            limit(limitCount)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return [];
        }

        const historyItems: UserGameHistoryItem[] = [];

        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            const gameId = docSnap.id;

            // 构建基础历史记录项
            const historyItem: UserGameHistoryItem = {
                gameId,
                created: data.created || '',
                settleCashAmount: data.settleCashAmount ?? null,
                settleCashDiff: data.settleCashDiff ?? null,
                settleROI: data.settleROI ?? null,
                totalBuyInCash: Number(data.totalBuyInCash) || 0,
                totalBuyInChips: Number(data.totalBuyInChips) || 0,
                result: data.result || (
                    (data.settleCashDiff ?? 0) > 0 ? 'win' :
                        (data.settleCashDiff ?? 0) < 0 ? 'lose' : 'even'
                ),
                finalizedAt: data.finalizedAt || data.created || '',
            };

            // 如果需要游戏详情，从主游戏文档获取
            if (includeGameDetails) {
                try {
                    const gameDocRef = doc(db, gameDoc, gameId);
                    const gameDocSnap = await getDoc(gameDocRef);

                    if (gameDocSnap.exists()) {
                        const gameData = gameDocSnap.data();
                        historyItem.gameDetails = {
                            smallBlind: gameData.smallBlind,
                            bigBlind: gameData.bigBlind,
                            playerCount: gameData.playerCount,
                            finalized: gameData.finalized,
                            status: gameData.status,
                        };
                    }
                } catch (gameError) {
                    console.warn(`获取游戏 ${gameId} 详情失败:`, gameError);
                    // 不影响主流程，继续处理
                }
            }

            historyItems.push(historyItem);
        }

        return historyItems;

    } catch (error) {
        console.error('fetchUserGameHistory 失败:', error);
        throw new Error('获取用户游戏历史失败');
    }
}