import React, { useMemo, useCallback, useState } from 'react';
import { View, Text, Image, StyleSheet, Pressable, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GradientCard } from './GradientCard';
import { Player } from '@/types';
import { Palette as color } from '@/constants';
import { Spacing, Radius, FontSize, Elevation } from '@/constants/designTokens';
import { Gradients } from '@/constants/gradients';
import { PrimaryButton } from './PrimaryButton';
import { useLogger } from '@/utils/useLogger';

// 类型定义
interface PlayerCardProps {
    player: Player;
    index: number;
    onBuyIn: (player: Player) => void;
    onToggle: (player: Player) => void;
    onLongPress: (player: Player) => void;
    finalized: boolean;
}

interface PlayerAvatarProps {
    player: Player;
    avatarColor: string;
    initialLetter: string;
}

interface PlayerDetailsProps {
    player: Player;
    profit: number;
    isSettled: boolean;
}

interface PlayerActionsProps {
    player: Player;
    finalized: boolean;
    onBuyIn: () => void;
    onToggle: () => void;
}

// 头像组件
const PlayerAvatar = React.memo<PlayerAvatarProps>(({ player, avatarColor, initialLetter }) => (
    <View
        style={styles.avatar}
        accessible={true}
        accessibilityRole="image"
        accessibilityLabel={player.photoURL ? `${player.nickname}的头像照片` : `${player.nickname}的头像，首字母${initialLetter}`}
    >
        {player.photoURL ? (
            <Image
                source={{ uri: player.photoURL }}
                style={styles.avatarImage}
                accessible={false}
            />
        ) : (
            <View style={[StyleSheet.absoluteFill, styles.avatarFallback, { backgroundColor: avatarColor }]}>
                <Text style={styles.avatarText}>{initialLetter}</Text>
            </View>
        )}
    </View>
));

PlayerAvatar.displayName = 'PlayerAvatar';

// 详情组件
const PlayerDetails = React.memo<PlayerDetailsProps>(({ player, profit, isSettled }) => (
    <View style={styles.detailsContainer}>
        {/* 买入信息卡片 */}
        <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
                <View style={styles.iconContainer}>
                    <MaterialCommunityIcons name="cash" size={24} color={color.highLighter} />
                </View>
                <View style={styles.detailTexts}>
                    <Text style={styles.detailValue}>{player.totalBuyInChips}</Text>
                    <Text style={styles.detailLabel}>总买入</Text>
                </View>
            </View>

            <View style={styles.detailItem}>
                <View style={styles.iconContainer}>
                    <MaterialCommunityIcons name="format-list-numbered" size={24} color={color.highLighter} />
                </View>
                <View style={styles.detailTexts}>
                    <Text style={styles.detailValue}>{player.buyInChipsList.length}</Text>
                    <Text style={styles.detailLabel}>买入次数</Text>
                </View>
            </View>
        </View>

        {/* 结算信息 - 只在玩家结算后显示 */}
        {isSettled && (
            <View style={styles.detailsRow}>
                <View style={styles.detailItem}>
                    <View style={styles.iconContainer}>
                        <MaterialCommunityIcons
                            name="calculator-variant"
                            size={24}
                            color={color.highLighter}
                        />
                    </View>
                    <View style={styles.detailTexts}>
                        <Text style={styles.detailValue}>
                            {player.settleChipCount}
                        </Text>
                        <Text style={styles.detailLabel}>结算筹码</Text>
                    </View>
                </View>

                <View style={[
                    styles.detailItem,
                    { backgroundColor: profit >= 0 ? 'rgba(172, 189, 134, 0.1)' : 'rgba(244, 67, 54, 0.1)' }
                ]}>
                    <View style={styles.iconContainer}>
                        <MaterialCommunityIcons
                            name={profit >= 0 ? "trending-up" : "trending-down"}
                            size={24}
                            color={profit >= 0 ? color.success : color.error}
                        />
                    </View>
                    <View style={styles.detailTexts}>
                        <Text style={[
                            styles.detailValue,
                            { color: profit >= 0 ? color.success : color.error }
                        ]}>
                            {(profit >= 0 ? '+' : '') + profit}
                        </Text>
                        <Text style={styles.detailLabel}>盈亏</Text>
                    </View>
                </View>
            </View>
        )}
    </View>
));

PlayerDetails.displayName = 'PlayerDetails';

// 操作按钮组件
const PlayerActions = React.memo<PlayerActionsProps>(({ player, finalized, onBuyIn, onToggle }) => (
    <View style={styles.actions}>
        <PrimaryButton
            title="追加买入"
            icon="plus"
            iconColor={color.lightText}
            onPress={onBuyIn}
            style={[
                styles.buyinButton,
                !player.isActive && styles.disabledButton
            ]}
            textStyle={styles.buyinText}
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
                player.isActive ? styles.leaveButton : styles.returnButton,
                finalized && styles.disabledButton
            ]}
            textStyle={styles.leaveText}
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
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        {/* 头像和标题区域 */}
                        <View style={styles.modalHeaderContent}>
                            <View style={styles.modalAvatar}>
                                {player.photoURL ? (
                                    <Image
                                        source={{ uri: player.photoURL }}
                                        style={styles.modalAvatarImage}
                                    />
                                ) : (
                                    <View style={[styles.modalAvatarFallback, { backgroundColor: avatarColor }]}>
                                        <Text style={styles.modalAvatarText}>{initialLetter}</Text>
                                    </View>
                                )}
                                {/* 状态指示器 */}
                                <View style={[
                                    styles.modalStatusIndicator,
                                    { backgroundColor: player.isActive ? color.success : color.error }
                                ]} />
                            </View>
                            <View style={styles.modalTitleSection}>
                                <Text style={styles.modalTitle}>{player.nickname}</Text>
                                <Text style={styles.modalSubtitle}>
                                    {player.isActive ? '在场玩家' : '已离场'}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
                            <MaterialCommunityIcons name="close" size={24} color={color.mutedText} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                        {/* 基本信息 */}
                        <View style={styles.modalSection}>
                            <View style={styles.modalSectionHeader}>
                                <MaterialCommunityIcons name="account-circle" size={20} color={color.primary} />
                                <Text style={styles.modalSectionTitle}>基本信息</Text>
                            </View>
                            <View style={styles.modalInfoItem}>
                                <MaterialCommunityIcons name="account-plus" size={18} color={color.success} />
                                <Text style={styles.modalInfoLabel}>加入时间：</Text>
                                <Text style={styles.modalInfoValue}>{formatDate(player.joinAt)}</Text>
                            </View>
                            <View style={styles.modalInfoItem}>
                                <MaterialCommunityIcons name="email" size={18} color={color.primary} />
                                <Text style={styles.modalInfoLabel}>邮箱：</Text>
                                <Text style={styles.modalInfoValue}>{player.email || '未设置'}</Text>
                            </View>
                        </View>

                        {/* 买入历史 */}
                        <View style={styles.modalSection}>
                            <View style={styles.modalSectionHeader}>
                                <MaterialCommunityIcons name="cash-multiple" size={20} color={color.info} />
                                <Text style={styles.modalSectionTitle}>买入历史</Text>
                            </View>
                            <View style={styles.modalStatsRow}>
                                <View style={styles.modalStatCard}>
                                    <MaterialCommunityIcons name="sigma" size={24} color={color.info} />
                                    <Text style={styles.modalStatValue}>{player.totalBuyInChips}</Text>
                                    <Text style={styles.modalStatLabel}>总买入筹码</Text>
                                </View>
                                <View style={styles.modalStatCard}>
                                    <MaterialCommunityIcons name="format-list-numbered" size={24} color={color.info} />
                                    <Text style={styles.modalStatValue}>{getBuyInHistory.length}</Text>
                                    <Text style={styles.modalStatLabel}>买入次数</Text>
                                </View>
                            </View>

                            {/* 买入明细 */}
                            {getBuyInHistory.length > 0 && (
                                <View style={styles.buyInHistory}>
                                    <View style={styles.buyInHistoryHeader}>
                                        <MaterialCommunityIcons name="history" size={16} color={color.mutedText} />
                                        <Text style={styles.buyInHistoryTitle}>买入明细</Text>
                                    </View>
                                    {getBuyInHistory.map((buyIn, index) => (
                                        <View key={index} style={styles.buyInHistoryItem}>
                                            <View style={styles.buyInHistoryLeft}>
                                                <View style={styles.buyInHistoryTag}>
                                                    <MaterialCommunityIcons
                                                        name={buyIn.isInitial ? "star" : "plus"}
                                                        size={12}
                                                        color={buyIn.isInitial ? color.warning : color.info}
                                                    />
                                                    <Text style={styles.buyInHistoryIndex}>
                                                        {buyIn.isInitial ? '初始买入' : `第${index}次追加`}
                                                    </Text>
                                                </View>
                                                <Text style={styles.buyInHistoryTime}>
                                                    {buyIn.timestamp.toLocaleString('zh-CN', {
                                                        month: '2-digit',
                                                        day: '2-digit',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </Text>
                                            </View>
                                            <View style={styles.buyInHistoryRight}>
                                                <Text style={styles.buyInHistoryAmount}>{buyIn.amount}</Text>
                                                <Text style={styles.buyInHistoryUnit}>筹码</Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>

                        {/* 结算信息 */}
                        {player.settleChipCount !== undefined && (
                            <View style={styles.modalSection}>
                                <View style={styles.modalSectionHeader}>
                                    <MaterialCommunityIcons name="calculator-variant" size={20} color={color.highLighter} />
                                    <Text style={styles.modalSectionTitle}>结算信息</Text>
                                </View>
                                <View style={styles.modalStatsRow}>
                                    <View style={styles.modalStatCard}>
                                        <MaterialCommunityIcons name="calculator-variant" size={24} color={color.highLighter} />
                                        <Text style={styles.modalStatValue}>{player.settleChipCount}</Text>
                                        <Text style={styles.modalStatLabel}>结算筹码</Text>
                                    </View>
                                    {player.settleChipDiff !== undefined && (
                                        <View style={[
                                            styles.modalStatCard,
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
                                                styles.modalStatValue,
                                                { color: player.settleChipDiff >= 0 ? color.success : color.error }
                                            ]}>
                                                {player.settleChipDiff >= 0 ? '+' : ''}{player.settleChipDiff}
                                            </Text>
                                            <Text style={styles.modalStatLabel}>筹码盈亏</Text>
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
                styles.touchableWrapper,
                pressed && styles.cardWrapperPressed
            ]}
            accessibilityRole="button"
            accessibilityLabel={`玩家卡片：${player.nickname}`}
            accessibilityHint="长按可进行更多操作"
        >
            <View
                style={styles.card}

            >
                {/* 主要内容区 */}
                <View style={styles.cardContent}>
                    {/* 卡片头部 - 玩家信息 */}
                    <View style={styles.cardHeader}>
                        <View style={styles.playerInfo}>
                            <PlayerAvatar
                                player={player}
                                avatarColor={playerData.avatarColor}
                                initialLetter={playerData.initialLetter}
                            />
                            <View style={styles.nameAndStatus}>
                                <Text style={styles.playerName}>{player.nickname}</Text>
                                <View style={styles.statusBadge}>
                                    <View style={[
                                        styles.statusDot,
                                        { backgroundColor: player.isActive ? color.success : color.error }
                                    ]} />
                                    <Text style={styles.statusText}>
                                        {player.isActive ? '在场' : '已离场'}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* 盈亏徽章 */}
                        {playerData.isSettled && (
                            <View style={[
                                styles.profitBadge,
                                { backgroundColor: playerData.profit >= 0 ? color.success : color.error }
                            ]}>
                                <MaterialCommunityIcons
                                    name={playerData.profit >= 0 ? "trending-up" : "trending-down"}
                                    size={16}
                                    color={color.lightText}
                                />
                                <Text style={styles.profitText}>
                                    {(playerData.profit >= 0 ? '+' : '') + playerData.profit}
                                </Text>
                            </View>
                        )}

                        {/* 详情图标 */}
                        <TouchableOpacity
                            onPress={handleShowDetail}
                            style={styles.detailIconButton}
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

const styles = StyleSheet.create({
    touchableWrapper: {
        marginVertical: Spacing.sm,
    },
    cardWrapperPressed: {
        opacity: 0.95,
        transform: [{ scale: 0.98 }],
    },
    card: {
        borderRadius: Radius.lg,
        overflow: 'hidden',
        elevation: Elevation.card,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        marginHorizontal: Spacing.xs,
    },

    // 主要内容容器
    cardContent: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)', // 半透明白色覆盖层
        flex: 1,
    },

    // 卡片头部重新设计
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.lg,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    },

    // 玩家信息区域
    playerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    nameAndStatus: {
        marginLeft: Spacing.md,
        flex: 1,
    },
    playerName: {
        fontSize: FontSize.h3,
        fontWeight: '700',
        color: color.title,
        marginBottom: Spacing.xs,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderRadius: Radius.sm,
        alignSelf: 'flex-start',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: Spacing.xs,
    },
    statusText: {
        fontSize: FontSize.small,
        fontWeight: '600',
        color: color.text,
    },

    // 盈亏徽章
    profitBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    profitText: {
        fontSize: FontSize.body,
        fontWeight: '700',
        color: color.lightText,
        marginLeft: Spacing.xs,
    },

    // 头像样式优化
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
        borderWidth: 3,
        borderColor: 'rgba(255, 255, 255, 0.8)',
    },
    avatarFallback: {
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 26,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 23,
    },
    avatarText: {
        fontSize: FontSize.h2,
        fontWeight: 'bold',
        color: color.lightText,
    },

    // 详情区域优化
    detailsContainer: {
        padding: Spacing.lg,
    },
    detailsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing.md,
    },
    detailItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        padding: Spacing.md,
        borderRadius: Radius.md,
        marginHorizontal: Spacing.xs,
        minHeight: 64,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
    },
    detailTexts: {
        marginLeft: Spacing.md,
        flex: 1,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    detailValue: {
        fontSize: FontSize.h3,
        fontWeight: '700',
        color: color.valueText,
        marginBottom: 2,
    },
    detailLabel: {
        fontSize: FontSize.small,
        color: color.mutedText,
        fontWeight: '500',
    },

    // 操作区域优化
    actions: {
        flexDirection: 'row',
        padding: Spacing.lg,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(0, 0, 0, 0.1)',
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        gap: Spacing.md,
    },
    buyinButton: {
        flex: 1,
        backgroundColor: color.success,
        borderRadius: Radius.md,
        minHeight: 48,
        shadowColor: color.success,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    leaveButton: {
        flex: 1,
        backgroundColor: color.error,
        borderRadius: Radius.md,
        minHeight: 48,
        shadowColor: color.error,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    returnButton: {
        flex: 1,
        backgroundColor: color.info,
        borderRadius: Radius.md,
        minHeight: 48,
        shadowColor: color.info,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    leaveText: {
        fontSize: FontSize.body,
        fontWeight: '700',
        color: color.lightText,
    },
    buyinText: {
        fontSize: FontSize.body,
        fontWeight: '700',
        color: color.lightText,
    },
    disabledButton: {
        opacity: 0.5,
    },

    // 详情图标按钮
    detailIconButton: {
        padding: Spacing.sm,
        borderRadius: Radius.sm,
        backgroundColor: color.lightBackground,
        marginLeft: Spacing.sm,
        borderWidth: 1,
        borderColor: color.borderColor,
    },

    // 弹窗样式
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    modalContainer: {
        backgroundColor: color.background,
        borderRadius: Radius.lg,
        width: '100%',
        maxWidth: 400,
        maxHeight: '80%',
        shadowColor: color.strongGray,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 12,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.lg,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: color.borderColor,
        backgroundColor: color.lightBackground,
    },
    modalHeaderContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    modalAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginRight: Spacing.md,
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    modalAvatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 30,
    },
    modalAvatarFallback: {
        width: '100%',
        height: '100%',
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalAvatarText: {
        fontSize: FontSize.h2,
        fontWeight: 'bold',
        color: color.lightText,
    },
    modalStatusIndicator: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: color.background,
    },
    modalTitleSection: {
        flex: 1,
    },
    modalTitle: {
        fontSize: FontSize.h2,
        fontWeight: '700',
        color: color.title,
        marginBottom: Spacing.xs,
    },
    modalSubtitle: {
        fontSize: FontSize.body,
        color: color.mutedText,
        fontWeight: '500',
    },
    modalCloseButton: {
        padding: Spacing.sm,
        borderRadius: Radius.sm,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    modalContent: {
        padding: Spacing.lg,
        backgroundColor: color.lightBackground,
    },
    modalSection: {
        marginBottom: Spacing.lg,
    },
    modalSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.md,
        paddingBottom: Spacing.xs,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: color.borderColor,
    },
    modalSectionTitle: {
        fontSize: FontSize.body,
        fontWeight: '600',
        color: color.title,
        marginLeft: Spacing.sm,
    },
    modalStatsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing.md,
        gap: Spacing.sm,
    },
    modalStatCard: {
        flex: 1,
        backgroundColor: color.lightBackground,
        borderRadius: Radius.md,
        padding: Spacing.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: color.borderColor,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    modalStatValue: {
        fontSize: FontSize.h3,
        fontWeight: '700',
        color: color.title,
        marginVertical: Spacing.xs,
    },
    modalStatLabel: {
        fontSize: FontSize.small,
        color: color.mutedText,
        textAlign: 'center',
        fontWeight: '500',
    },
    modalInfoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.sm,
        paddingVertical: Spacing.xs,
    },
    modalInfoLabel: {
        fontSize: FontSize.body,
        color: color.text,
        marginLeft: Spacing.sm,
        minWidth: 80,
    },
    modalInfoValue: {
        fontSize: FontSize.body,
        fontWeight: '500',
        color: color.valueText,
        flex: 1,
    },
    buyInHistory: {
        marginTop: Spacing.sm,
        paddingLeft: Spacing.lg,
    },
    buyInHistoryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    buyInHistoryTitle: {
        fontSize: FontSize.small,
        fontWeight: '600',
        color: color.mutedText,
        marginLeft: Spacing.xs,
    },
    buyInHistoryItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        backgroundColor: color.lightBackground,
        borderRadius: Radius.sm,
        marginBottom: Spacing.xs,
        borderWidth: 1,
        borderColor: color.borderColor,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    buyInHistoryLeft: {
        flex: 1,
    },
    buyInHistoryTag: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    buyInHistoryIndex: {
        fontSize: FontSize.small,
        fontWeight: '600',
        color: color.title,
        marginLeft: Spacing.xs,
    },
    buyInHistoryTime: {
        fontSize: FontSize.small - 1,
        color: color.mutedText,
    },
    buyInHistoryRight: {
        alignItems: 'flex-end',
    },
    buyInHistoryAmount: {
        fontSize: FontSize.h3,
        fontWeight: '700',
        color: color.highLighter,
    },
    buyInHistoryUnit: {
        fontSize: FontSize.small,
        color: color.mutedText,
        marginTop: 2,
    },
});