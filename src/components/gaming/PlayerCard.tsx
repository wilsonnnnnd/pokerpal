import React, { useMemo, useCallback, useState } from 'react';
import { View, Text, Image, StyleSheet, Pressable, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Player, PlayerActionsProps, PlayerCardProps, PlayerDetailsProps } from '@/types';
import { Palette as color } from '@/constants';
import { Gradients } from '@/constants/gradients';
import { PrimaryButton } from '../common/PrimaryButton';
import { useLogger } from '@/utils/useLogger';
import { PlayerCardStyles } from '@/assets/styles';
import Avatar from '@/components/common/Avatar';


// Use shared Avatar component instead of inline PlayerAvatar

// 详情组件
const PlayerDetails = React.memo<PlayerDetailsProps>(({ player, profit, isSettled }) => (
    <View style={PlayerCardStyles.detailsContainer}>
        {/* 买入信息卡片 */}
        <View style={PlayerCardStyles.detailsRow}>
            <View style={PlayerCardStyles.detailItem}>
                <View style={PlayerCardStyles.iconContainer}>
                    <MaterialCommunityIcons name="cash" size={24} color={color.highLighter} />
                </View>
                <View style={PlayerCardStyles.detailTexts}>
                    <Text style={PlayerCardStyles.detailValue}>{player.totalBuyInChips}</Text>
                    <Text style={PlayerCardStyles.detailLabel}>总买入</Text>
                </View>
            </View>

            <View style={PlayerCardStyles.detailItem}>
                <View style={PlayerCardStyles.iconContainer}>
                    <MaterialCommunityIcons name="format-list-numbered" size={24} color={color.highLighter} />
                </View>
                <View style={PlayerCardStyles.detailTexts}>
                    <Text style={PlayerCardStyles.detailValue}>{player.buyInCount}</Text>
                    <Text style={PlayerCardStyles.detailLabel}>买入次数</Text>
                </View>
            </View>
        </View>

        {/* 结算信息 - 只在玩家结算后显示 */}
        {isSettled && (
            <View style={PlayerCardStyles.detailsRow}>
                <View style={PlayerCardStyles.detailItem}>
                    <View style={PlayerCardStyles.iconContainer}>
                        <MaterialCommunityIcons
                            name="calculator-variant"
                            size={24}
                            color={color.highLighter}
                        />
                    </View>
                    <View style={PlayerCardStyles.detailTexts}>
                        <Text style={PlayerCardStyles.detailValue}>
                            {player.settleChipCount}
                        </Text>
                        <Text style={PlayerCardStyles.detailLabel}>结算筹码</Text>
                    </View>
                </View>

                <View style={[
                    PlayerCardStyles.detailItem,
                    { backgroundColor: profit >= 0 ? 'rgba(172, 189, 134, 0.1)' : 'rgba(244, 67, 54, 0.1)' }
                ]}>
                    <View style={PlayerCardStyles.iconContainer}>
                        <MaterialCommunityIcons
                            name={profit >= 0 ? "trending-up" : "trending-down"}
                            size={24}
                            color={profit >= 0 ? color.success : color.error}
                        />
                    </View>
                    <View style={PlayerCardStyles.detailTexts}>
                        <Text style={[
                            PlayerCardStyles.detailValue,
                            { color: profit >= 0 ? color.success : color.error }
                        ]}>
                            {(profit >= 0 ? '+' : '') + profit}
                        </Text>
                        <Text style={PlayerCardStyles.detailLabel}>盈亏</Text>
                    </View>
                </View>
            </View>
        )}
    </View>
));

PlayerDetails.displayName = 'PlayerDetails';

// 操作按钮组件
const PlayerActions = React.memo<PlayerActionsProps>(({ player, finalized, onBuyIn, onToggle }) => (
    <View style={PlayerCardStyles.actions}>
        <PrimaryButton
            title="追加买入"
            icon="plus"
            iconColor={color.lightText}
            onPress={onBuyIn}
            style={[
                PlayerCardStyles.buyinButton,
                !player.isActive && PlayerCardStyles.disabledButton
            ]}
            textStyle={PlayerCardStyles.buyinText}
            disabled={finalized || !player.isActive}
            variant="filled"
            rounded={false}
        />

        <PrimaryButton
            title={player.isActive ? '离开游戏' : '返回游戏'}
            icon={player.isActive ? 'logout' : 'arrow-right'}
            iconColor={color.lightText}
            onPress={onToggle}
            style={[
                player.isActive ? PlayerCardStyles.leaveButton : PlayerCardStyles.returnButton,
                finalized && PlayerCardStyles.disabledButton
            ]}
            textStyle={PlayerCardStyles.leaveText}
            disabled={finalized}
            variant="filled"
            rounded={false}
        />
    </View>
));

PlayerActions.displayName = 'PlayerActions';

// 玩家详情弹窗组件
const PlayerDetailModal = React.memo<{
    player: Player;
    visible: boolean;
    onClose: () => void;
}>(({ player, visible, onClose }) => {
    const { logs } = useLogger();

    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            return date.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        } catch {
            return dateStr;
        }
    };

    // 从日志中获取玩家的实际买入时间
    const getBuyInHistory = useMemo(() => {
        // 过滤出该玩家的买入日志
        const playerBuyInLogs = logs.filter(log =>
            log.tag === 'Player' &&
            log.message.includes(player.nickname) &&
            log.message.includes('追加买入') &&
            log.message.includes('筹码')
        );

        // 提取买入金额和时间
        const additionalBuyIns: Array<{ amount: number; timestamp: Date }> = [];

        playerBuyInLogs.forEach(log => {
            // 解析日志消息中的买入金额，格式："🪙 {nickname} 追加买入 {amount} 筹码"
            const amountMatch = log.message.match(/追加买入\s+(\d+)\s+筹码/);
            if (amountMatch) {
                const amount = parseInt(amountMatch[1], 10);
                additionalBuyIns.push({
                    amount,
                    timestamp: log.timestamp
                });
            }
        });

        // 按时间排序（最早的在前）
        additionalBuyIns.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        // 构建完整的买入历史
        const fullBuyInHistory: Array<{ amount: number; timestamp: Date; isInitial: boolean }> = [];

        // 添加初始买入（基于总买入和追加买入计算）
        const totalAdditional = additionalBuyIns.reduce((sum, buyIn) => sum + buyIn.amount, 0);
        const initialAmount = player.totalBuyInChips - totalAdditional;

        if (initialAmount > 0) {
            fullBuyInHistory.push({
                amount: initialAmount,
                timestamp: new Date(player.joinAt),
                isInitial: true
            });
        }

        // 添加追加买入
        additionalBuyIns.forEach(buyIn => {
            fullBuyInHistory.push({
                ...buyIn,
                isInitial: false
            });
        });

        return fullBuyInHistory;
    }, [logs, player.nickname, player.totalBuyInChips, player.joinAt]);

    // 获取头像颜色
    const avatarColor = useMemo(() => {
        const colors = [color.primary, color.success, color.info, color.confirm, color.cancel, color.warning, color.strongGray];
        const colorIndex = player.nickname.charCodeAt(0) % colors.length;
        return colors[colorIndex];
    }, [player.nickname]);

    const initialLetter = player.nickname.charAt(0).toUpperCase();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={PlayerCardStyles.modalOverlay}>
                <View style={PlayerCardStyles.modalContainer}>
                    <View style={PlayerCardStyles.modalHeader}>
                        {/* 头像和标题区域 */}
                        <View style={PlayerCardStyles.modalHeaderContent}>
                            <View style={PlayerCardStyles.modalAvatar}>
                                <Avatar
                                    uri={player.photoURL}
                                    name={player.nickname}
                                    size={80}
                                    rounded
                                    backgroundColor={avatarColor}
                                    accessibilityLabel={player.photoURL ? `${player.nickname}的头像照片` : `${player.nickname}的头像，首字母${initialLetter}`}
                                />
                                {/* 状态指示器 */}
                                <View style={[
                                    PlayerCardStyles.modalStatusIndicator,
                                    { backgroundColor: player.isActive ? color.success : color.error }
                                ]} />
                            </View>
                            <View style={PlayerCardStyles.modalTitleSection}>
                                <Text style={PlayerCardStyles.modalTitle}>{player.nickname}</Text>
                                <Text style={PlayerCardStyles.modalSubtitle}>
                                    {player.isActive ? '在场玩家' : '已离场'}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={onClose} style={PlayerCardStyles.modalCloseButton}>
                            <MaterialCommunityIcons name="close" size={24} color={color.mutedText} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={PlayerCardStyles.modalContent} showsVerticalScrollIndicator={false}>
                        {/* 基本信息 */}
                        <View style={PlayerCardStyles.modalSection}>
                            <View style={PlayerCardStyles.modalSectionHeader}>
                                <MaterialCommunityIcons name="account-circle" size={20} color={color.primary} />
                                <Text style={PlayerCardStyles.modalSectionTitle}>基本信息</Text>
                            </View>
                            <View style={PlayerCardStyles.modalInfoItem}>
                                <MaterialCommunityIcons name="account-plus" size={18} color={color.success} />
                                <Text style={PlayerCardStyles.modalInfoLabel}>加入时间：</Text>
                                <Text style={PlayerCardStyles.modalInfoValue}>{formatDate(player.joinAt)}</Text>
                            </View>
                            <View style={PlayerCardStyles.modalInfoItem}>
                                <MaterialCommunityIcons name="email" size={18} color={color.primary} />
                                <Text style={PlayerCardStyles.modalInfoLabel}>邮箱：</Text>
                                <Text style={PlayerCardStyles.modalInfoValue}>{player.email || '未设置'}</Text>
                            </View>
                        </View>

                        {/* 买入历史 */}
                        <View style={PlayerCardStyles.modalSection}>
                            <View style={PlayerCardStyles.modalSectionHeader}>
                                <MaterialCommunityIcons name="cash-multiple" size={20} color={color.info} />
                                <Text style={PlayerCardStyles.modalSectionTitle}>买入历史</Text>
                            </View>
                            <View style={PlayerCardStyles.modalStatsRow}>
                                <View style={PlayerCardStyles.modalStatCard}>
                                    <MaterialCommunityIcons name="sigma" size={24} color={color.info} />
                                    <Text style={PlayerCardStyles.modalStatValue}>{player.totalBuyInChips}</Text>
                                    <Text style={PlayerCardStyles.modalStatLabel}>总买入筹码</Text>
                                </View>
                                <View style={PlayerCardStyles.modalStatCard}>
                                    <MaterialCommunityIcons name="format-list-numbered" size={24} color={color.info} />
                                    <Text style={PlayerCardStyles.modalStatValue}>{getBuyInHistory.length}</Text>
                                    <Text style={PlayerCardStyles.modalStatLabel}>买入次数</Text>
                                </View>
                            </View>

                            {/* 买入明细 */}
                            {getBuyInHistory.length > 0 && (
                                <View style={PlayerCardStyles.buyInHistory}>
                                    <View style={PlayerCardStyles.buyInHistoryHeader}>
                                        <MaterialCommunityIcons name="history" size={16} color={color.mutedText} />
                                        <Text style={PlayerCardStyles.buyInHistoryTitle}>买入明细</Text>
                                    </View>
                                    {getBuyInHistory.map((buyIn, index) => (
                                        <View key={index} style={PlayerCardStyles.buyInHistoryItem}>
                                            <View style={PlayerCardStyles.buyInHistoryLeft}>
                                                <View style={PlayerCardStyles.buyInHistoryTag}>
                                                    <MaterialCommunityIcons
                                                        name={buyIn.isInitial ? "star" : "plus"}
                                                        size={12}
                                                        color={buyIn.isInitial ? color.warning : color.info}
                                                    />
                                                    <Text style={PlayerCardStyles.buyInHistoryIndex}>
                                                        {buyIn.isInitial ? '初始买入' : `第${index}次追加`}
                                                    </Text>
                                                </View>
                                                <Text style={PlayerCardStyles.buyInHistoryTime}>
                                                    {buyIn.timestamp.toLocaleString('zh-CN', {
                                                        month: '2-digit',
                                                        day: '2-digit',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </Text>
                                            </View>
                                            <View style={PlayerCardStyles.buyInHistoryRight}>
                                                <Text style={PlayerCardStyles.buyInHistoryAmount}>{buyIn.amount}</Text>
                                                <Text style={PlayerCardStyles.buyInHistoryUnit}>筹码</Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>

                        {/* 结算信息 */}
                        {player.settleChipCount !== undefined && (
                            <View style={PlayerCardStyles.modalSection}>
                                <View style={PlayerCardStyles.modalSectionHeader}>
                                    <MaterialCommunityIcons name="calculator-variant" size={20} color={color.highLighter} />
                                    <Text style={PlayerCardStyles.modalSectionTitle}>结算信息</Text>
                                </View>
                                <View style={PlayerCardStyles.modalStatsRow}>
                                    <View style={PlayerCardStyles.modalStatCard}>
                                        <MaterialCommunityIcons name="calculator-variant" size={24} color={color.highLighter} />
                                        <Text style={PlayerCardStyles.modalStatValue}>{player.settleChipCount}</Text>
                                        <Text style={PlayerCardStyles.modalStatLabel}>结算筹码</Text>
                                    </View>
                                    {player.settleChipDiff !== undefined && (
                                        <View style={[
                                            PlayerCardStyles.modalStatCard,
                                            {
                                                backgroundColor: player.settleChipDiff >= 0
                                                    ? 'rgba(172, 189, 134, 0.1)'
                                                    : 'rgba(244, 67, 54, 0.1)',
                                                borderColor: player.settleChipDiff >= 0 ? color.success : color.error
                                            }
                                        ]}>
                                            <MaterialCommunityIcons
                                                name={player.settleChipDiff >= 0 ? "trending-up" : "trending-down"}
                                                size={24}
                                                color={player.settleChipDiff >= 0 ? color.success : color.error}
                                            />
                                            <Text style={[
                                                PlayerCardStyles.modalStatValue,
                                                { color: player.settleChipDiff >= 0 ? color.success : color.error }
                                            ]}>
                                                {player.settleChipDiff >= 0 ? '+' : ''}{player.settleChipDiff}
                                            </Text>
                                            <Text style={PlayerCardStyles.modalStatLabel}>筹码盈亏</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
});

PlayerDetailModal.displayName = 'PlayerDetailModal';

export const PlayerCard = React.memo<PlayerCardProps>(({
    player,
    index,
    onBuyIn,
    onToggle,
    onLongPress,
    finalized,
}) => {
    const [showDetailModal, setShowDetailModal] = useState(false);

    // 计算衍生状态
    const playerData = useMemo(() => ({
        avatarColor: generatePlayerAvatar(player.nickname),
        initialLetter: player.nickname.charAt(0).toUpperCase(),
        profit: (player.settleChipCount || 0) - player.totalBuyInChips,
        isSettled: player.settleChipCount !== undefined,
        gradientColors: Gradients[index % Gradients.length],
    }), [player.nickname, player.settleChipCount, player.totalBuyInChips, index]);

    // 优化事件处理函数
    const handleBuyIn = useCallback(() => onBuyIn(player), [onBuyIn, player]);
    const handleToggle = useCallback(() => onToggle(player), [onToggle, player]);
    const handleLongPress = useCallback(() => onLongPress(player), [onLongPress, player]);
    const handleShowDetail = useCallback(() => setShowDetailModal(true), []);
    const handleCloseDetail = useCallback(() => setShowDetailModal(false), []);

    return (
        <Pressable
            onLongPress={handleLongPress}
            delayLongPress={500}
            style={({ pressed }) => [
                PlayerCardStyles.touchableWrapper,
                pressed && PlayerCardStyles.cardWrapperPressed
            ]}
            accessibilityRole="button"
            accessibilityLabel={`玩家卡片：${player.nickname}`}
            accessibilityHint="长按可进行更多操作"
        >
            <View
                style={PlayerCardStyles.card}

            >
                {/* 主要内容区 */}
                <View style={PlayerCardStyles.cardContent}>
                    {/* 卡片头部 - 玩家信息 */}
                    <View style={PlayerCardStyles.cardHeader}>
                        <View style={PlayerCardStyles.playerInfo}>
                            <Avatar
                                uri={player.photoURL}
                                name={player.nickname}
                                size={48}
                                backgroundColor={playerData.avatarColor}
                                accessibilityLabel={player.photoURL ? `${player.nickname}的头像照片` : `${player.nickname}的头像，首字母${playerData.initialLetter}`}
                            />
                            <View style={PlayerCardStyles.nameAndStatus}>
                                <Text style={PlayerCardStyles.playerName}>{player.nickname}</Text>
                                <View style={PlayerCardStyles.statusBadge}>
                                    <View style={[
                                        PlayerCardStyles.statusDot,
                                        { backgroundColor: player.isActive ? color.success : color.error }
                                    ]} />
                                    <Text style={PlayerCardStyles.statusText}>
                                        {player.isActive ? '在场' : '已离场'}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* 盈亏徽章 */}
                        {playerData.isSettled && (
                            <View style={[
                                PlayerCardStyles.profitBadge,
                                { backgroundColor: playerData.profit >= 0 ? color.success : color.error }
                            ]}>
                                <MaterialCommunityIcons
                                    name={playerData.profit >= 0 ? "trending-up" : "trending-down"}
                                    size={16}
                                    color={color.lightText}
                                />
                                <Text style={PlayerCardStyles.profitText}>
                                    {(playerData.profit >= 0 ? '+' : '') + playerData.profit}
                                </Text>
                            </View>
                        )}

                        {/* 详情图标 */}
                        <TouchableOpacity
                            onPress={handleShowDetail}
                            style={PlayerCardStyles.detailIconButton}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <MaterialCommunityIcons
                                name="information-outline"
                                size={20}
                                color={color.mutedText}
                            />
                        </TouchableOpacity>
                    </View>

                    {/* 详细数据区域 */}
                    <PlayerDetails
                        player={player}
                        profit={playerData.profit}
                        isSettled={playerData.isSettled}
                    />

                    {/* 操作按钮区域 */}
                    <PlayerActions
                        player={player}
                        finalized={finalized}
                        onBuyIn={handleBuyIn}
                        onToggle={handleToggle}
                    />
                </View>
            </View>

            {/* 详情弹窗 */}
            <PlayerDetailModal
                player={player}
                visible={showDetailModal}
                onClose={handleCloseDetail}
            />
        </Pressable>
    );
});

PlayerCard.displayName = 'PlayerCard';

// 工具函数
const generatePlayerAvatar = (name: string): string => {
    // use palette tokens and a few related semantic tokens
    const colors = [color.primary, color.success, color.info, color.confirm, color.cancel, color.warning, color.strongGray];
    const colorIndex = name.charCodeAt(0) % colors.length;
    return colors[colorIndex];
};

