import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, SafeAreaView, TouchableOpacity, Share, Alert, Image } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useGameHistoryStore } from '@/stores/useGameHistoryStore';
import { InfoRow } from '@/components/InfoRow';
import { PrimaryButton } from '@/components/PrimaryButton';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette as color } from '@/constants';
import { handleCopyToClipboard, handleSendEmail } from '@/utils/exportHandlers';
import { usePopup } from '@/components/PopupProvider';

export default function GameDetailScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation();
    const { gameId } = route.params;
    const { confirmPopup: showPopup } = usePopup();
    const [copying, setCopying] = useState(false);
    const [emailing, setEmailing] = useState(false);

    const game = useGameHistoryStore((state) =>
        state.history.find((g) => g.id === gameId)
    );

    if (!game) {
        return (
            <View style={styles.notFoundContainer}>
                <MaterialCommunityIcons name="alert-circle-outline" size={60} color="#bdc3c7" />
                <Text style={styles.notFound}>未找到该游戏记录</Text>
                <PrimaryButton
                    title="返回"
                    icon="arrow-left"
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                    textStyle={styles.backButtonText}
                />
            </View>
        );
    }

    // 计算游戏结果数据
    const winners = [...game.players].sort((a, b) => b.cashDifference - a.cashDifference);
    const topWinner = winners[0];
    const losers = [...game.players].sort((a, b) => a.cashDifference - b.cashDifference);
    const topLoser = losers[0];

    // 日期格式化
    const gameDate = new Date(
        typeof game.createdAt === 'string' ? game.createdAt : game.createdAt.toDate()
    );
    const dateString = gameDate.toLocaleDateString('en-AU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
    const timeString = gameDate.toLocaleTimeString('en-AU', {
        hour: '2-digit',
        minute: '2-digit'
    });

    // 生成随机头像颜色
    const generateAvatarColor = (name: string) => {
        const colors = ['#FFC107', '#FF9800', '#FF5722', '#4CAF50', '#2196F3', '#9C27B0', '#673AB7'];
        const colorIndex = name.charCodeAt(0) % colors.length;
        return colors[colorIndex];
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <View style={styles.gameInfoHeader}>
                        <View style={styles.dateTimeContainer}>
                            <Text style={styles.dateText}>{dateString}</Text>
                            <Text style={styles.timeText}>{timeString}</Text>
                        </View>

                        <View style={styles.blindContainer}>
                            <MaterialCommunityIcons name="poker-chip" size={18} color="#FFFFFF" />
                            <Text style={styles.blindText}>{game.smallBlind}/{game.bigBlind}</Text>
                        </View>
                    </View>

                    <Text style={styles.gameIdText}>ID: {game.id.slice(0, 12)}...</Text>
                </View>

                <View style={styles.summaryContainer}>
                    <View style={styles.summaryHeader}>
                        <MaterialCommunityIcons name="chart-box" size={20} color={color.iconHighlighter} />
                        <Text style={styles.summaryTitle}>游戏总览</Text>
                    </View>

                    <View style={styles.statsGrid}>
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{game.players.length}</Text>
                            <Text style={styles.statLabel}>玩家数</Text>
                        </View>

                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{game.totalBuyIn}</Text>
                            <Text style={styles.statLabel}>总买入</Text>
                        </View>

                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{game.totalEnding}</Text>
                            <Text style={styles.statLabel}>总结算</Text>
                        </View>

                        <View style={styles.statBox}>
                            <Text style={[
                                styles.statValue,
                                { color: game.totalDiff >= 0 ? '#4CAF50' : '#F44336' }
                            ]}>
                                {game.totalDiff >= 0 ? '+' : ''}{game.totalDiff}
                            </Text>
                            <Text style={styles.statLabel}>总差额</Text>
                        </View>
                    </View>

                    <View style={styles.exchangeRate}>
                        <MaterialCommunityIcons name="currency-usd" size={16} color="#607D8B" />
                        <Text style={styles.exchangeText}>
                            现金换算比例: 1筹码 = ${game.baseCashAmount / game.baseChipAmount}
                        </Text>
                    </View>
                </View>

                {topWinner && topLoser && (
                    <View style={styles.highlightsContainer}>
                        <View style={styles.highlightCard}>
                            <View style={styles.highlightHeader}>
                                <MaterialCommunityIcons name="trophy" size={18} color="#FFD700" />
                                <Text style={styles.highlightTitle}>最大赢家</Text>
                            </View>

                            <View style={styles.highlightContent}>
                                <View style={[styles.avatar, { backgroundColor: generateAvatarColor(topWinner.nickname) }]}>
                                    <Text style={styles.avatarText}>{topWinner.nickname.charAt(0).toUpperCase()}</Text>
                                </View>

                                <View style={styles.highlightInfo}>
                                    <Text style={styles.highlightName}>{topWinner.nickname}</Text>
                                    <Text style={styles.highlightProfit}>(+${topWinner.cashDifference.toFixed(2)})</Text>

                                </View>
                            </View>
                        </View>

                        <View style={styles.highlightCard}>
                            <View style={styles.highlightHeader}>
                                <MaterialCommunityIcons name="emoticon-sad" size={18} color="#9E9E9E" />
                                <Text style={styles.highlightTitle}>最大输家</Text>
                            </View>

                            <View style={styles.highlightContent}>
                                <View style={[styles.avatar, { backgroundColor: generateAvatarColor(topLoser.nickname) }]}>
                                    <Text style={styles.avatarText}>{topLoser.nickname.charAt(0).toUpperCase()}</Text>
                                </View>

                                <View style={styles.highlightInfo}>
                                    <Text style={styles.highlightName}>{topLoser.nickname}</Text>
                                    <Text style={[styles.highlightProfit, { color: '#F44336' }]}>
                                        (${topLoser.cashDifference.toFixed(2)})
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                )}

                <View style={styles.sectionHeader}>
                    <MaterialCommunityIcons name="account-group" size={20} color={color.iconHighlighter} />
                    <Text style={styles.sectionTitle}>玩家列表</Text>
                </View>

                <View style={styles.playerListContainer}>
                    {game.players.map((item, index) => (
                        <View style={styles.playerCard} key={item.id}>
                            <View style={styles.playerCardHeader}>
                                <View style={styles.playerIdentity}>
                                    <View style={styles.avatar}>
                                        {item.photoURL ? (
                                            <Image source={{ uri: item.photoURL }} style={styles.avatarImage} />
                                        ) : (
                                            <View style={[StyleSheet.absoluteFill, styles.avatarFallback, { backgroundColor: generateAvatarColor(item.nickname) }]}>
                                                <Text style={styles.avatarText}>{item.nickname.charAt(0).toUpperCase()}</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.playerName}>{item.nickname}</Text>
                                </View>

                                <View style={[
                                    styles.profitBadge,
                                    { backgroundColor: item.cashDifference >= 0 ? '#E8F5E9' : '#FFEBEE' }
                                ]}>
                                    <Text style={[
                                        styles.profitText,
                                        { color: item.cashDifference >= 0 ? '#4CAF50' : '#F44336' }
                                    ]}>
                                        {item.cashDifference >= 0 ? '+' : ''}{item.cashDifference.toFixed(2)}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.playerStats}>
                                <View style={styles.playerStatItem}>
                                    <MaterialCommunityIcons name="bank" size={16} color={color.iconHighlighter} />
                                    <View style={styles.playerStatTexts}>
                                        <Text style={styles.playerStatValue}>{item.totalBuyInChips}</Text>
                                        <Text style={styles.playerStatLabel}>总买入</Text>
                                    </View>
                                </View>

                                <View style={styles.playerStatItem}>
                                    <MaterialCommunityIcons name="poker-chip" size={16} color={color.iconHighlighter} />
                                    <View style={styles.playerStatTexts}>
                                        <Text style={styles.playerStatValue}>
                                            {(
                                                item.totalBuyInChips +
                                                (item.cashDifference / (game.baseCashAmount / game.baseChipAmount))
                                            ).toFixed(0)}
                                        </Text>
                                        <Text style={styles.playerStatLabel}>结算筹码</Text>
                                    </View>
                                </View>


                                <View style={styles.playerStatItem}>
                                    <MaterialCommunityIcons name="repeat" size={16} color={color.iconHighlighter} />
                                    <View style={styles.playerStatTexts}>
                                        <Text style={styles.playerStatValue}>{item.buyInCount}次</Text>
                                        <Text style={styles.playerStatLabel}>买入次数</Text>
                                    </View>
                                </View>

                                <View style={styles.playerStatItem}>
                                    <MaterialCommunityIcons name="chart-line" size={16} color={color.iconHighlighter} />
                                    <View style={styles.playerStatTexts}>
                                        <Text style={[
                                            styles.playerStatValue,
                                            { color: item.roiSum >= 0 ? '#4CAF50' : '#F44336' }
                                        ]}>
                                            {(item.roiSum * 100).toFixed(2)}%
                                        </Text>
                                        <Text style={styles.playerStatLabel}>ROI</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.playerCashResult}>
                                <MaterialCommunityIcons
                                    name={item.cashDifference >= 0 ? "cash-plus" : "cash-minus"}
                                    size={18}
                                    color={item.cashDifference >= 0 ? "#4CAF50" : "#F44336"}
                                />
                                <Text style={[
                                    styles.playerCashText,
                                    { color: item.cashDifference >= 0 ? "#4CAF50" : "#F44336" }
                                ]}>
                                    {item.cashDifference >= 0 ? "+" : ""}${Math.abs(item.cashDifference).toFixed(2)}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>

                <View style={styles.actionButtons}>
                    <PrimaryButton
                        title="复制战绩"
                        icon="content-copy"
                        onPress={() => handleCopyToClipboard(game, setCopying, showPopup)}
                        style={[styles.copyButton, copying && styles.buttonDisabled]}
                        textStyle={styles.actionButtonText}
                        disabled={copying}
                    />
                    <PrimaryButton
                        title="发送邮件"
                        icon="email"
                        onPress={() => handleSendEmail(setEmailing, showPopup)}
                        style={[styles.emailButton, emailing && styles.buttonDisabled]}
                        textStyle={styles.actionButtonText}
                        disabled={emailing}
                    />
                </View>
            </ScrollView>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f6fa',
    },
    scrollContent: {
        padding: 0,
        paddingBottom: 24,
    },
    notFoundContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f5f6fa',
    },
    notFound: {
        fontSize: 18,
        color: '#7f8c8d',
        textAlign: 'center',
        marginTop: 12,
        marginBottom: 24,
    },
    backButton: {
        backgroundColor: '#ecf0f1',
        paddingHorizontal: 24,
    },
    backButtonText: {
        color: '#34495e',
    },
    header: {
        backgroundColor: '#d46613',
        padding: 16,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },
    gameInfoHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dateTimeContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    dateText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    timeText: {
        fontSize: 12,
        color: '#FFFFFF',
        opacity: 0.9,
    },
    blindContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    blindText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginLeft: 6,
    },
    gameIdText: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.7)',
        marginTop: 8,
    },
    summaryContainer: {
        margin: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    summaryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    summaryTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginLeft: 6,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    statBox: {
        width: '48%',
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    statLabel: {
        fontSize: 12,
        color: '#7f8c8d',
        marginTop: 4,
    },
    exchangeRate: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ecf0f1',
        padding: 8,
        borderRadius: 6,
        marginTop: 4,
    },
    exchangeText: {
        fontSize: 12,
        color: '#34495e',
        marginLeft: 6,
    },
    highlightsContainer: {
        marginHorizontal: 16,
        marginBottom: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    highlightCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 12,
        width: '48%',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    highlightHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    highlightTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2c3e50',
        marginLeft: 4,
    },
    highlightContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
    },
    highlightInfo: {
        marginLeft: 8,
        flex: 1,
    },
    highlightName: {
        fontSize: 12,
        fontWeight: '600',
        color: '#2c3e50',
    },
    highlightProfit: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#4CAF50',
    },
    highlightCash: {
        fontSize: 12,
        color: '#4CAF50',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginLeft: 6,
    },
    playerListContainer: {
        paddingHorizontal: 16,
    },
    playerCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    playerCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    playerIdentity: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    playerName: {
        marginLeft: 8,
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
    },
    profitBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    profitText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    playerStats: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 8,
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    playerStatItem: {
        width: '45%',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        backgroundColor: '#ecf0f1',
        paddingHorizontal: 8,
        gap: 6,
        borderRadius: 6,
        marginBottom: 8,
        marginRight: 8,

    },
    playerStatTexts: {
        marginLeft: 6,

    },
    playerStatValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2c3e50',
    },
    playerStatLabel: {
        fontSize: 11,
        color: '#7f8c8d',
    },
    playerCashResult: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        backgroundColor: '#f8f9fa',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        alignSelf: 'flex-end',
    },
    playerCashText: {
        fontSize: 14,
        fontWeight: 'bold',
        marginLeft: 6,
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginHorizontal: 16,
        marginTop: 16,
    },
    copyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#3498db',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        flex: 1,
        marginRight: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.5,
    },
    emailButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2ecc71',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        flex: 1,
        marginLeft: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.5,
    },
    buttonDisabled: {
        backgroundColor: '#95a5a6',
        elevation: 0,
        shadowOpacity: 0,
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
        marginLeft: 6,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 20
    },
    avatarFallback: {
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        padding: 20
    },
});