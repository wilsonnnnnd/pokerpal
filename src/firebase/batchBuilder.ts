/**
 * BatchBuilder 工具类
 * -------------------
 * 自动管理 Firestore 批处理；接近 500 操作上限时自动换批。
 */
import { writeBatch, WriteBatch, Firestore } from 'firebase/firestore'

export class BatchBuilder {
    private db: Firestore // Firestore 实例
    private batches: WriteBatch[] = [] // 批处理列表
    private opCounts: number[] = [] // 操作计数列表
    private threshold: number // 每批操作上限（默认 450，留出空间给其他操作）
    private _current: WriteBatch // 当前批处理

    // 构造函数
    // db: Firestore 实例，threshold: 每批操作上限（默认 450）
    // 注意：如果超过上限会自动创建新批处理
    constructor(db: Firestore, threshold = 450) {
        this.db = db
        this.threshold = threshold
        this._current = writeBatch(db)
        this.batches.push(this._current)
        this.opCounts.push(0)
    }

    // 确保当前批处理有足够容量；如果没有则创建新批处理
    private ensureCapacity(extraOps = 1) {
        const idx = this.batches.length - 1
        if (this.opCounts[idx] + extraOps > this.threshold) {
            this._current = writeBatch(this.db)
            this.batches.push(this._current)
            this.opCounts.push(0)
        }
    }

    // 获取当前批处理
    // 注意：不要直接修改 _current，使用 set/update/delete 方法
    get batch(): WriteBatch {
        return this._current
    }

    // 批量写入方法
    // 注意：每次调用都会检查容量并可能创建新批处理
    set(ref: any, data: any, options?: any) {
        this.ensureCapacity(1)
        this._current.set(ref, data, options)
        this.opCounts[this.opCounts.length - 1]++
    }

    // 更新方法
    // 注意：每次调用都会检查容量并可能创建新批处理
    update(ref: any, data: any) {
        this.ensureCapacity(1)
        this._current.update(ref, data)
        this.opCounts[this.opCounts.length - 1]++
    }
    // 删除方法
    delete(ref: any) {
        this.ensureCapacity(1)
        this._current.delete(ref)
        this.opCounts[this.opCounts.length - 1]++
    }

    // 获取当前批处理的操作计数
    async commitAll() {
        await Promise.all(this.batches.map(b => b.commit()))
    }
}
