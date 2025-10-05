export interface CallTimerHandle {
    show: (initialSeconds?: number) => void;
    hide: () => void;
    reset: (newDuration?: number) => void;
    pause: () => void;
    resume: () => void;
}
export interface CallTimerProps {
    /** 默认计时时间(秒) */
    defaultDuration?: number;
    /** 警告阈值(秒) */
    warningThreshold?: number;
    /** 紧急阈值(秒) */
    criticalThreshold?: number;
    /** 时间结束回调函数 */
    onTimeUp?: () => void;
    /** 计时器关闭回调函数 */
    onClose?: () => void;
    /** 预设时间列表(秒) */
    presetTimes?: number[];
    /** 是否启用声音 */
    soundEnabled?: boolean;
    /** 是否启用振动 */
    vibrationEnabled?: boolean;
}