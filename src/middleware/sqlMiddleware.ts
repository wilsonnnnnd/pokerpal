import { appendAction } from '@/services/localDb';

/**
 * 将一条 action 记录持久化到 actions 表。
 * 成功返回插入的 id，失败返回 undefined。
 */
export async function saveActionToSql(gameId: number | null, type: string, payload: any): Promise<number | undefined> {
    try {
        const id = await appendAction(gameId, type, payload);
        return id;
    } catch (e) {
        console.warn('saveActionToSql 失败', e);
        return undefined;
    }
}

/**
 * 轻量级的 zustand middleware 助手。
 * 当 store 通过 set({ ...updates, _sqlAction: { gameId, type, payload } }) 提交更新时，
 * 本中间件会把该 action 持久化到 SQL（调用 saveActionToSql），并在应用更新前移除内部元数据 _sqlAction。
 *
 * 使用示例：
 * const useStore = create(sqlMiddleware((set, get, api) => ({ ... })))
 * set({ foo: 1, _sqlAction: { gameId: 123, type: 'updateFoo', payload: { foo: 1 } } })
 */
export function sqlMiddleware<T extends object>(config: any) {
    return (set: any, get: any, api: any) =>
        config((partial: any, replace?: any) => {
            try {
                // 检测到对象更新中携带 _sqlAction
                if (partial && typeof partial === 'object' && partial._sqlAction) {
                    const action = partial._sqlAction;
                    // 先移除元信息，然后异步持久化
                    delete partial._sqlAction;
                    // 异步持久化但不阻塞状态更新
                    Promise.resolve()
                        .then(() => saveActionToSql(action.gameId ?? null, action.type, action.payload))
                        .catch((e) => console.warn('sqlMiddleware 持久化错误', e));
                }
            } catch (e) {
                // 吞掉错误以避免影响应用状态
                console.warn('sqlMiddleware 错误', e);
            }

            return set(partial, replace);
        }, get, api);
}

export default {
    saveActionToSql,
    sqlMiddleware,
};
