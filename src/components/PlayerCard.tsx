import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GradientCard } from './GradientCard';
import { Player } from '@/types';
import { Palette as color } from '@/constants';
import { Spacing, Radius, FontSize, Elevation } from '@/constants/designTokens';
import { PrimaryButton } from './PrimaryButton';

export function PlayerCard({
    player,
    index,
    onBuyIn,
    onToggle,
    onLongPress,
    finalized,
}: {
    player: Player;
    index: number;
    onBuyIn: (p: Player) => void;
    onToggle: (p: Player) => void;
    onLongPress: (p: Player) => void;
    finalized: boolean;
}) {
    const avatarColor = generatePlayerAvatar(player.nickname);
    const initialLetter = player.nickname.charAt(0).toUpperCase();
    const profit = (player.settleChipCount || 0) - player.totalBuyInChips;
    const isSettled = player.settleChipCount !== undefined;


    return (
        <Pressable
            onLongPress={() => onLongPress(player)}
            delayLongPress={500}
            style={({pressed}) => [
                styles.touchableWrapper,
                pressed && styles.cardWrapperPressed
            ]}
        >
            <GradientCard index={index} style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.avatarAndName}>
                        <View style={styles.avatar}>
                            {player.photoURL ? (
                                <Image source={{ uri: player.photoURL }} style={styles.avatarImage} />
                            ) : (
                                <View style={[StyleSheet.absoluteFill, styles.avatarFallback, { backgroundColor: avatarColor }]}>
                                    <Text style={styles.avatarText}>{initialLetter}</Text>
                                </View>
                            )}
                        </View>
                        <View style={styles.nameContainer}>
                            <Text style={styles.name}>{player.nickname}</Text>
                            <View style={styles.statusContainer}>
                                <View style={[styles.statusIndicator, { backgroundColor: player.isActive ? color.success : color.error }]} />
                                <Text style={styles.statusText}>{player.isActive ? '在场' : '已离场'}</Text>
                            </View>
                        </View>
                    </View>

                </View>

                <View style={styles.detailsContainer}>
                    {/* 买入信息 */}
                    <View style={styles.detailsRow}>
                        <View style={styles.detailItem}>
                            <MaterialCommunityIcons name="cash" size={20} color={color.highLighter} />
                            <View style={styles.detailTexts}>
                                <Text style={styles.detailValue}>{player.totalBuyInChips}</Text>
                                <Text style={styles.detailLabel}>总买入</Text>
                            </View>
                        </View>
                        
                        <View style={styles.detailItem}>
                            <MaterialCommunityIcons name="format-list-numbered" size={20} color={color.highLighter} />
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
                                <MaterialCommunityIcons 
                                    name="calculator-variant" 
                                    size={20} 
                                    color={color.highLighter} 
                                />
                                <View style={styles.detailTexts}>
                                    <Text style={styles.detailValue}>
                                        {player.settleChipCount}
                                    </Text>
                                    <Text style={styles.detailLabel}>结算筹码</Text>
                                </View>
                            </View>
                            
                            <View style={styles.detailItem}>
                                <MaterialCommunityIcons 
                                    name={profit >= 0 ? "trending-up" : "trending-down"} 
                                    size={20} 
                                    color={profit >= 0 ? color.success : color.error} 
                                />
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

                <View style={styles.actions}>
                    <PrimaryButton
                        title="追加买入"
                        icon="plus"
                        iconColor={color.lightText}
                        onPress={() => onBuyIn(player)}
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
                        onPress={() => onToggle(player)}
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
            </GradientCard>
        </Pressable>
    );
}

const generatePlayerAvatar = (name: string) => {
    // use palette tokens and a few related semantic tokens
    const colors = [color.primary, color.success, color.info, color.confirm, color.cancel, color.warning, color.strongGray];
    const colorIndex = name.charCodeAt(0) % colors.length;
    return colors[colorIndex];
};

const styles = StyleSheet.create({
    touchableWrapper: {
        marginHorizontal: Spacing.xs,
        marginVertical: Spacing.xs,
    },
    cardWrapperPressed: {
        opacity: 0.97,
    },
    card: { 
        padding: 0, 
        borderRadius: Radius.lg, 
        overflow: 'hidden', 
        elevation: Elevation.card 
    },
    avatar: { 
        width: 40, 
        height: 40, 
        borderRadius: Radius.round === 999 ? 20 : Radius.md, 
        justifyContent: 'center', 
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    avatarFallback: { 
        justifyContent: 'center', 
        alignItems: 'center', 
        borderRadius: 20 
    },
    avatarImage: { 
        width: '100%', 
        height: '100%', 
        borderRadius: 20 
    },
    avatarText: { 
        fontSize: FontSize.h3, 
        fontWeight: 'bold', 
        color: color.lightText 
    },
    cardHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingHorizontal: Spacing.lg, 
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
    borderBottomColor: color.mediumGray,
    },
    avatarAndName: { 
        flexDirection: 'row', 
        alignItems: 'center' 
    },
    nameContainer: { 
        marginLeft: 12 
    },
    name: { 
        fontSize: FontSize.h3, 
        fontWeight: '700', 
    color: color.valueText 
    },
    statusContainer: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        marginTop: Spacing.xs 
    },
    statusIndicator: { 
        width: 12,
        height: 12,
        borderRadius: 12,
        marginRight: Spacing.xs,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.06)'
    },
    statusText: { 
        fontSize: 12, 
        color: color.valueLabel,
        fontWeight: '600'
    },
    profitBadge: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: Spacing.md, 
        paddingVertical: Spacing.xs, 
        borderRadius: Radius.md 
    },
    profitText: { 
        fontSize: FontSize.body, 
        fontWeight: 'bold', 
        marginLeft: Spacing.xs 
    },
    detailsContainer: { 
        padding: Spacing.lg, 
        backgroundColor: color.lightBackground 
    },
    detailsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    marginBottom: Spacing.lg,
    },
    detailItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    backgroundColor: color.lightGray,
        padding: Spacing.md,
        borderRadius: Radius.md,
        marginHorizontal: Spacing.xs,
    },
    detailTexts: {
        marginLeft: Spacing.sm,
    },
    detailValue: {
        fontSize: FontSize.body,
        fontWeight: '600',
    color: color.valueText,
    },
    detailLabel: {
        fontSize: FontSize.small,
    color: color.valueLabel,
        marginTop: Spacing.xs,
    },
    actions: { 
        flexDirection: 'row', 
        padding: Spacing.lg, 
        borderTopWidth: 1, 
        borderTopColor: color.mediumGray, 
        backgroundColor: color.lightGray,
        gap: Spacing.lg,
    },
    buyinButton: { 
        flex: 1,
        backgroundColor: color.success,
        borderRadius: Radius.md,
    },
    leaveButton: { 
        flex: 1,
        backgroundColor: color.error,
        borderRadius: Radius.md,
    },
    returnButton: { 
        flex: 1,
        backgroundColor: color.info,
        borderRadius: Radius.md,
    },
    leaveText: { 
        fontSize: FontSize.body, 
        fontWeight: '600', 
        color: color.lightText 
    },
    buyinText: { 
        fontSize: FontSize.body, 
        fontWeight: '600', 
        color: color.lightText 
    },
    disabledButton: { 
        opacity: 0.5 
    },
});