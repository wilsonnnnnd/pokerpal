import { useLogStore } from '@/stores/useLogStore';

const emojiMap: Record<string, string> = {
    Game: '🎮',
    Player: '🧑‍🤝‍🧑',
    Storage: '💾',
    Debug: '🐞',
    Error: '❌',
    Network: '🌐',
    UI: '🎨',
    State: '🧠',
    Time: '⏱️',
    Success: '✅',
    Warning: '⚠️',
    Default: '📌',
};

const formatMessage = (message: string | object): string =>
    typeof message === 'string' ? message : JSON.stringify(message, null, 2);



const writeLog = (tag: string, message: string | object) => {
    const emoji = emojiMap[tag] || emojiMap.Default;
    const formatted = formatMessage(message);

    useLogStore.getState().log(tag, `${emoji} ${formatted}`);
};

export const logInfo = (tag: string, message: string | object) => writeLog(tag, message);
export const logSuccess = (tag: string, message: string | object) => writeLog('Success', message);
export const logError = (tag: string, message: string | object) => writeLog('Error', message);

export function useLogger() {
    const logs = useLogStore((state) => state.logs);
    const clearLogs = useLogStore((state) => state.clearLogs);

    const log = (tag: string, message: string | object) => writeLog(tag, message);
    return {
        logs,
        log,
        clearLogs,
    };
}
