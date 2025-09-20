/**
 * saveGameToFirebase（唯一入口）
 * ------------------------------
 * 集中写：games、players、users、users-by-email、users/{uid}/games、graph
 */
import { db } from '@/firebase/config'
import { useGameStore } from '@/stores/useGameStore'
import { Player } from '@/types'
import Toast from 'react-native-toast-message'
import { cacheGameForRetry } from '@/utils/gameCache'
import { logInfo } from '@/utils/useLogger'
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
import { BatchBuilder } from './batchBuilder'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { gameDoc } from '@/constants/namingDb'
import { getDeviceId } from '@/utils/deviceInfo'


function validateSettlement(players: Player[]) {
	if (!players?.length) return
	const sum = players.reduce((acc, p) => acc + (p.settleCashDiff ?? 0), 0)
	if (Math.abs(sum) > 0.01) {
		throw new Error(`结算不平衡：所有玩家盈亏合计 = ${sum}`)
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
	playerCount?: number;
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
	await updateGameOnServer(gameId, { finalized: true, status: 'finalized' });
}


export async function saveGameToFirebase(gameId: string, players: Player[] = []) {
	const game = useGameStore.getState()
	const originalGameState = { ...game }
	const rate = calcRate(game.baseCashAmount, game.baseChipAmount)

	if (rate === 0 && players.some(p => p.totalBuyInChips > 0)) {
		throw new Error('基础筹码为 0 导致汇率为 0，请检查游戏设置')
	}



	logInfo('Saving game to Firebase', { gameId, playerCount: players.length })

	try {
		validateSettlement(players)
	} catch (e: any) {
		Toast.show({ type: 'error', text1: '结算校验失败', text2: e?.message || '', position: 'bottom' })
		throw e
	}

	const bb = new BatchBuilder(db, 450)
	const gameRef = doc(db, gameDoc, gameId)
	const snap = await getDoc(gameRef)
	const isCreate = !snap.exists()
	const createdBy = await (async () => await getDeviceId())() // 设备 ID 作为创建者标识（可改为用户 ID）
	
	const gamePayload = isCreate
		? makeCreateGamePayload({
			gameId,
			smallBlind: game.smallBlind,
			bigBlind: game.bigBlind,
			baseCashAmount: game.baseCashAmount,
			baseChipAmount: game.baseChipAmount,
			finalized: !!game.finalized,
			token: game.token ?? null,
			createdBy,
			playerCount: players.length,
		})
		: makeUpdateGamePayload({
			smallBlind: game.smallBlind,
			bigBlind: game.bigBlind,
			baseCashAmount: game.baseCashAmount,
			baseChipAmount: game.baseChipAmount,
			finalized: !!game.finalized,
			status: game.finalized ? 'finalized' : 'open',
			token: game.token ?? null,
			playerCount: players.length,
		})

	if (isCreate) {
		bb.set(gameRef, gamePayload, { merge: false }) // 首次创建
	} else {
		bb.update(gameRef, gamePayload) // 仅更新 updated 等；不触碰 created
	}

	const graphWrites: { ref: any, history: any[] }[] = []

	try {
		for (const player of players) {
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

		for (const { ref } of graphWrites) {
			try {
				const snap = await getDoc(ref)
				const saved = ((snap.data() as { history?: any[] })?.history) ?? []
				logInfo('Graph history saved', { len: saved.length })
			} catch { /* ignore */ }
		}

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
