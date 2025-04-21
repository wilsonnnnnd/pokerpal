export const getGameComment = (totalPlayers: number, maxProfit: number, minProfit: number) => {
    const comments = [
        `这场${totalPlayers}人的德扑大战简直精彩绝伦！`,
        `人生如赌局，输赢都是经历～`,
        `有人欢喜有人愁，德州扑克见真章！`,
        `金钱如流水，友情才是真！`,
        `牌桌如战场，谁能笑到最后？`,
        `理性思考，冷静决策，这才是德扑精髓！`
    ];
    return comments[Math.floor(Math.random() * comments.length)];
};


interface Player {
    nickname: string;
    chipDifference: number;
}

interface Game {
    createdAt: string;
    smallBlind: number;
    bigBlind: number;
    players: Player[];
    totalBuyIn: number;
    baseCashAmount: number;
    baseChipAmount: number;
}

export const generateGameSummary = (game: Game): string => {
    const sortedPlayers = [...game.players].sort((a, b) => b.chipDifference - a.chipDifference);
    const winner = sortedPlayers[0];
    const loser = sortedPlayers[sortedPlayers.length - 1];

    const playerSummary = game.players.map(p =>
        `${p.nickname}: ${p.chipDifference >= 0 ? '+' : ''}${p.chipDifference} 筹码`
    ).join('\n');

    const gameDate = new Date(game.createdAt).toLocaleDateString('zh-CN');
    const gameTime = new Date(game.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

    return `🃏 德州扑克战绩速报 🃏
  ----------------------------
  🗓️ 日期: ${gameDate} ${gameTime}
  🎲 盲注: ${game.smallBlind}/${game.bigBlind}
  👥 玩家: ${game.players.length}人参战
  💰 总买入: ${game.totalBuyIn} 筹码
  💸 兑换比例: 1筹码=$${(game.baseCashAmount / game.baseChipAmount).toFixed(2)}
  
  🏆 最大赢家: ${winner.nickname} (+${winner.chipDifference} 筹码)
  📉 今日不佳: ${loser.nickname} (${loser.chipDifference} 筹码)
  
  📊 所有玩家战绩:
  ${playerSummary}
  
  📝 战局点评: ${getGameComment(game.players.length, winner.chipDifference, loser.chipDifference)}
  
  ----------------------------
  🤝 感谢各位的参与！下次继续！`;
};
