import React, { useMemo, useCallback } from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GradientCard } from './GradientCard';
import { Player } from '@/types';
import { Palette as color } from '@/constants';
import { Spacing, Radius, FontSize, Elevation } from '@/constants/designTokens';
import { Gradients } from '@/constants/gradients';
import { PrimaryButton } from './PrimaryButton';

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
                            {color: profit >= 0 ? color.success : color.error}
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

export const PlayerCard = React.memo<PlayerCardProps>(({
    player,
    index,
    onBuyIn,
    onToggle,
    onLongPress,
    finalized,
}) => {
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

    return (
        <Pressable
            onLongPress={handleLongPress}
            delayLongPress={500}
            style={({pressed}) => [
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
});