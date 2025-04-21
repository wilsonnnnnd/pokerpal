import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GradientCard } from './GradientCard';
import { Player } from '@/types';
import { Palette as color } from '@/constants';
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
                                <View style={[styles.statusIndicator, { backgroundColor: player.isActive ? '#4CAF50' : '#9E9E9E' }]} />
                                <Text style={styles.statusText}>{player.isActive ? '在场' : '已离场'}</Text>
                            </View>
                        </View>
                    </View>

                    {isSettled && (
                        <View style={[styles.profitBadge, { backgroundColor: profit >= 0 ? '#e8f5e9' : '#ffebee' }]}>
                            <MaterialCommunityIcons
                                name={profit >= 0 ? 'arrow-up' : 'arrow-down'}
                                size={16}
                                color={profit >= 0 ? '#4CAF50' : '#F44336'}
                            />
                            <Text style={[styles.profitText, { color: profit >= 0 ? '#4CAF50' : '#F44336' }]}>
                                {profit >= 0 ? '+' : ''}{profit}
                            </Text>
                        </View>
                    )}
                </View>

                <View style={styles.detailsContainer}>
                    {/* 买入信息 */}
                    <View style={styles.detailsRow}>
                        <View style={styles.detailItem}>
                            <MaterialCommunityIcons name="cash" size={20} color={color.iconHighlighter} />
                            <View style={styles.detailTexts}>
                                <Text style={styles.detailValue}>{player.totalBuyInChips}</Text>
                                <Text style={styles.detailLabel}>总买入</Text>
                            </View>
                        </View>
                        
                        <View style={styles.detailItem}>
                            <MaterialCommunityIcons name="format-list-numbered" size={20} color={color.iconHighlighter} />
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
                                    color={color.iconHighlighter} 
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
                        iconColor="#fff"
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
                        iconColor="#fff"
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
    const colors = ['#FFC107', '#FF9800', '#FF5722', '#4CAF50', '#2196F3', '#9C27B0', '#673AB7'];
    const colorIndex = name.charCodeAt(0) % colors.length;
    return colors[colorIndex];
};

const styles = StyleSheet.create({
    touchableWrapper: {
        marginHorizontal: 2,
        marginVertical: 1,
    },
    cardWrapperPressed: {
        opacity: 0.97,
    },
    card: { 
        padding: 0, 
        borderRadius: 16, 
        overflow: 'hidden', 
        elevation: 4 
    },
    avatar: { 
        width: 40, 
        height: 40, 
        borderRadius: 20, 
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
        fontSize: 20, 
        fontWeight: 'bold', 
        color: 'white' 
    },
    cardHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingHorizontal: 16, 
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eaeaea',
    },
    avatarAndName: { 
        flexDirection: 'row', 
        alignItems: 'center' 
    },
    nameContainer: { 
        marginLeft: 12 
    },
    name: { 
        fontSize: 18, 
        fontWeight: '700', 
        color: '#2c3e50' 
    },
    statusContainer: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        marginTop: 4 
    },
    statusIndicator: { 
        width: 8, 
        height: 8, 
        borderRadius: 4, 
        marginRight: 4 
    },
    statusText: { 
        fontSize: 12, 
        color: '#7f8c8d' 
    },
    profitBadge: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 10, 
        paddingVertical: 4, 
        borderRadius: 12 
    },
    profitText: { 
        fontSize: 14, 
        fontWeight: 'bold', 
        marginLeft: 2 
    },
    detailsContainer: { 
        padding: 16, 
        backgroundColor: '#fff' 
    },
    detailsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    detailItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        padding: 10,
        borderRadius: 12,
        marginHorizontal: 4,
    },
    detailTexts: {
        marginLeft: 8,
    },
    detailValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
    },
    detailLabel: {
        fontSize: 12,
        color: '#7f8c8d',
        marginTop: 2,
    },
    actions: { 
        flexDirection: 'row', 
        padding: 16, 
        borderTopWidth: 1, 
        borderTopColor: '#eaeaea', 
        backgroundColor: '#f8f9fa',
        gap: 16,
    },
    buyinButton: { 
        flex: 1,
        backgroundColor: '#4CAF50',
        borderRadius: 12,
    },
    leaveButton: { 
        flex: 1,
        backgroundColor: '#F44336',
        borderRadius: 12,
    },
    returnButton: { 
        flex: 1,
        backgroundColor: '#2196F3',
        borderRadius: 12,
    },
    leaveText: { 
        fontSize: 14, 
        fontWeight: '600', 
        color: '#FFFFFF' 
    },
    buyinText: { 
        fontSize: 14, 
        fontWeight: '600', 
        color: '#FFFFFF' 
    },
    disabledButton: { 
        opacity: 0.5 
    },
});