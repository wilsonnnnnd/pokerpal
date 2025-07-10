import { useEffect, useState, useRef } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { usePlayerStore } from '@/stores/usePlayerStore';

export function useStoreReady() {
    const [readyFlags, setReadyFlags] = useState({
        game: false,
        player: false,
    });

    const gameStatus = useGameStore((state) => state.finalized ? 'finished' : 'ongoing');
    const players = usePlayerStore((state) => state.players);

    const playerReadySet = useRef(false); // 用于避免无限更新

    useEffect(() => {
        if ( gameStatus === 'ongoing' || gameStatus === 'finished') {
            setReadyFlags((prev) => ({ ...prev, game: true }));
        }
    }, [gameStatus]);

    useEffect(() => {
        if (!playerReadySet.current) {
            playerReadySet.current = true;
            setReadyFlags((prev) => ({ ...prev, player: true }));
        }
    }, [players]);

    const isReady = readyFlags.game && readyFlags.player;

    return isReady;
}
