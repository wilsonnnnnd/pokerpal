import { db } from '@/firebase/config'
import { useGameStore } from '@/stores/useGameStore'
import { usePlayerStore } from '@/stores/usePlayerStore'
import { Player } from '@/types'
import Toast from 'react-native-toast-message'
import { cacheGameForRetry } from '@/utils/gameCache'
import {
	calcRate,
	makeCreateGamePayload,
	makeUpdateGamePayload,
	queuePlayerGameWrite,
	hasValidEmail,
	upsertUserAndCounters,
	upsertEmailIndex,
	ensureUserGameHistory,
	collectGraphWrites,
} from './gameWriters'
import normalizePlayer from '@/utils/normalizePlayer'
import { BatchBuilder } from './batchBuilder'
import { collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { gameDoc, hostGameDoc } from '@/constants/namingVar'
import { appendAction } from '@/services/localDb';
import { getHosterId } from '@/utils/hostInfo'



/**
 * 将与同步到 Firebase 相同的数据以快照形式写入本地 SQL（actions 表），
 * 用于离线或服务器写入失败时的本地持久化备份。
 */
export async function saveGameToLocalSql(gameId: string, players: Player[]) {
	const game = useGameStore.getState();
	// compute conversion rate (cash per chip). fallback to 1 to avoid division by zero
	const rate = game.baseChipAmount && Number(game.baseChipAmount) !== 0
		? (Number(game.baseCashAmount ?? 0) / Number(game.baseChipAmount))
		: 1;

	// Normalize players same as saveGameToFirebase to ensure consistency
	const normalizedPlayers = players.map((p) => {
		const chipsList = Array.isArray(p.buyInChipsList) ? p.buyInChipsList : [];
		const totalBuyInChips = typeof p.totalBuyInChips === 'number' && p.totalBuyInChips > 0
			? p.totalBuyInChips
			: chipsList.reduce((s, v) => s + Number(v || 0), 0);
		const buyInCount = chipsList.length;
		const totalBuyInCash = typeof p.totalBuyInCash === 'number'
			? Number((p.totalBuyInCash as any).toFixed ? (p.totalBuyInCash as any).toFixed(2) : p.totalBuyInCash)
			: Number((totalBuyInChips * rate).toFixed(2));

		return {
			...p,
			buyInChipsList: chipsList,
			buyInCount,
			totalBuyInChips,
			totalBuyInCash,
		} as Player;
	});

	// compute game-level aggregates from normalized players
	const totalBuyInChips = normalizedPlayers.reduce((acc, p) => acc + (Number(p.totalBuyInChips) || 0), 0);
	const totalEndingChips = normalizedPlayers.reduce((acc, p) => acc + (Number((p as any).settleChipCount) || 0), 0);

	const totalBuyInCash = Number((totalBuyInChips * rate).toFixed(2));
	const totalEndingCash = Number((totalEndingChips * rate).toFixed(2));

	const snapshotPayload = {
		id: gameId,
		created: game.created ?? Date.now(),
		updated: game.updated ?? Date.now(),
		smallBlind: game.smallBlind,
		bigBlind: game.bigBlind,
		// store totals in both chips and cash (cash = chips * rate)
		baseCashAmount: game.baseCashAmount ?? 0,
		baseChipAmount: game.baseChipAmount ?? 0,
		totalBuyInChips,
		totalBuyInCash,
		totalEndingChips,
		totalEndingCash,
		players: normalizedPlayers.map((p: Player) => ({
			id: p.id,
			nickname: p.nickname,
			buyInCount: p.buyInCount ?? (p.buyInChipsList?.length ?? 0),
			// convert chips to cash using rate (cash fields use 2 decimal places)
			totalBuyInCash: Number(((Number(p.totalBuyInChips) || 0) * rate).toFixed(2)),
			// settleCashAmount should be derived from settleChipCount * rate
			settleCashAmount: Number(((Number((p as any).settleChipCount) || 0) * rate).toFixed(2)),
			// keep settleCashDiff as-is but normalize to 2 decimals
			settleCashDiff: Number((Number((p as any).settleCashDiff) || 0).toFixed(2)),
			// ROI: store as fixed-precision ratio
			settleROI: (typeof (p as any).settleROI === 'number') ? Number(((p as any).settleROI).toFixed(6)) : 0,
		})),
	};

	try {
		const id = await appendAction(null, 'finalize_game', snapshotPayload);
		return id;
	} catch (e) {
		// bubble up so callers can handle; appendAction already has fallback behavior
		throw e;
	}
}



/** 创建游戏（仅首次调用） */
export async function createGameOnServer(game: {
	gameId: string;
	smallBlind: number;
	bigBlind: number;
	baseCashAmount: number;
	baseChipAmount: number;
	finalized?: boolean;
	token?: string | null;
	createdBy?: string;
}) {

	const ref = doc(db, gameDoc, game.gameId);
	const exists = await getDoc(ref);
	if (exists.exists()) {
		// 已存在就不要再创建了（也避免 created 被覆盖的所有风险）
		return;
	}
	const payload = makeCreateGamePayload(game);
	// ✅ 创建用 setDoc（不要 merge created）
	await setDoc(ref, payload);
}

export async function registerHostGameRecord(gameId: string) {
	if (!gameId) return;

	// 从本地存储获取当前用户
	const hoster = await getHosterId();

	if (!hoster) {
		console.warn("registerHostGameRecord: no current user email found");
		return;
	}

	try {
		// 路径: /hostGameRecord/{hoster}/games/{gameId}
		const hostDocRef = doc(db, hostGameDoc, hoster);
		const gameDocRef = doc(collection(hostDocRef, gameDoc), gameId);

		await setDoc(
			gameDocRef,
			{
				gameId,
				created: new Date().toISOString(),
				updated: new Date().toISOString(),
			},
			{ merge: true }
		);
		
	} catch (err) {
		console.error("registerHostGameRecord error", err);
		throw err;
	}
}

/** 更新游戏（任何后续变更，包括 finalize） */
export async function updateGameOnServer(gameId: string, patch: Parameters<typeof makeUpdateGamePayload>[0]) {
	const ref = doc(db, gameDoc, gameId);
	const payload = makeUpdateGamePayload(patch);
	// ✅ 更新用 updateDoc（不会触碰 created）
	await updateDoc(ref, payload);
}

/** 结算/结束游戏 */
export async function finalizeGameOnServer(gameId: string) {
	// 只写 finalized/status/updated，不触碰 created
	await updateGameOnServer(gameId, { finalized: true, status: 'finalized', token: null });
	await registerHostGameRecord(gameId);
	
}


export async function saveGameToFirebase(gameId: string, players: Player[] = []) {
	const game = useGameStore.getState()
	const originalGameState = { ...game }
	const rate = calcRate(game.baseCashAmount, game.baseChipAmount)

	if (rate === 0 && players.some(p => p.totalBuyInChips > 0)) {
		throw new Error('基础筹码为 0 导致汇率为 0，请检查游戏设置')
	}


	const bb = new BatchBuilder(db, 450)
	const gameRef = doc(db, gameDoc, gameId)
	const snap = await getDoc(gameRef)
	const isCreate = !snap.exists()

	// Normalize players before any writes: ensure buyInCount and totals are present and consistent
	const normalizedPlayers = players.map((p) => normalizePlayer(p, rate, game.baseChipAmount));

	// Sync normalized fields back into local store so UI/state remains consistent with writes
	try {
		const updatePlayer = usePlayerStore.getState().updatePlayer;
		normalizedPlayers.forEach((p) => {
			updatePlayer(p.id, {
				buyInChipsList: p.buyInChipsList,
				buyInCount: p.buyInCount,
				totalBuyInChips: p.totalBuyInChips,
				totalBuyInCash: p.totalBuyInCash,
			});
		});
	} catch (e) {
		console.warn('Failed to sync normalized players back to store:', e);
	}



	const gamePayload = isCreate
		? makeCreateGamePayload({
			gameId,
			smallBlind: game.smallBlind,
			bigBlind: game.bigBlind,
			baseCashAmount: game.baseCashAmount,
			baseChipAmount: game.baseChipAmount,
			finalized: !!game.finalized,
			token: game.token ?? null,
			playerCount: normalizedPlayers.length,
		})
		: makeUpdateGamePayload({
			smallBlind: game.smallBlind,
			bigBlind: game.bigBlind,
			baseCashAmount: game.baseCashAmount,
			baseChipAmount: game.baseChipAmount,
			finalized: !!game.finalized,
			status: game.finalized ? 'finalized' : 'open',
			token: game.token ?? null,
			playerCount: normalizedPlayers.length,
		})

	if (isCreate) {
		bb.set(gameRef, gamePayload, { merge: false }) // 首次创建
	} else {
		bb.update(gameRef, gamePayload) // 仅更新 updated 等；不触碰 created
	}

	const graphWrites: { ref: any, history: any[] }[] = []

	try {
		for (const player of normalizedPlayers) {
			const { totalBuyInCash } = queuePlayerGameWrite(bb, db, gameId, player, rate)

			if (!hasValidEmail(player.email)) {
				console.warn(`⚠️ 跳过未绑定邮箱的玩家：${player.nickname}`)
				continue
			}

			await upsertUserAndCounters(bb, db, player, totalBuyInCash)
			upsertEmailIndex(bb, db, player)
			
			await ensureUserGameHistory(bb, db, player, gameId, totalBuyInCash)

			const graphResult = await collectGraphWrites(bb, player, gameId)
			if (graphResult) graphWrites.push(graphResult)
		}

		await bb.commitAll()


		Toast.show({
			type: 'success',
			text1: '✅ 上传成功',
			text2: `已保存游戏 ${gameId}，共 ${players.length} 位玩家记录`,
			visibilityTime: 2500,
			position: 'bottom',
		})
	} catch (err: any) {
		console.error('Error saving game to Firebase:', err)
		useGameStore.setState(originalGameState)
		await cacheGameForRetry(gameId, players)
		Toast.show({
			type: 'error',
			text1: '❌ 上传失败',
			text2: err?.message || '未知错误',
			visibilityTime: 3000,
			position: 'bottom',
		})
		throw err
	}
}
