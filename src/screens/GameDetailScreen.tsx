import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, SafeAreaView, TouchableOpacity, Share, Alert, Image } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useGameHistoryStore } from '@/stores/useGameHistoryStore';
import { InfoRow } from '@/components/InfoRow';
import { PrimaryButton } from '@/components/PrimaryButton';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette as color, Palette } from '@/constants';
import { handleCopyToClipboard, handleSendEmail } from '@/utils/exportHandlers';
import { usePopup } from '@/components/PopupProvider';
import { GameDetailstyles as styles } from '@/assets/styles';

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
        game.created ? (typeof game.created === 'string' ? game.created : game.created.toDate()) : new Date(0)
    );
    const dateString = String(gameDate.getFullYear()) + '-' +
        String(gameDate.getMonth() + 1).padStart(2, '0') + '-' +
        String(gameDate.getDate()).padStart(2, '0');
    const timeString = String(gameDate.getHours()).padStart(2, '0') + ':' +
        String(gameDate.getMinutes()).padStart(2, '0');
        

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
                        <MaterialCommunityIcons name="chart-box" size={20} color={color.highLighter} />
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
                                    <Text style={[styles.highlightProfit, { color: Palette.error }]}>
                                        (${topLoser.cashDifference.toFixed(2)})
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                )}

                <View style={styles.sectionHeader}>
                    <MaterialCommunityIcons name="account-group" size={20} color={color.highLighter} />
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
                                        { color: item.cashDifference >= 0 ? Palette.success : Palette.error }
                                    ]}>
                                        {item.cashDifference >= 0 ? '+' : ''}{item.cashDifference.toFixed(2)}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.playerStats}>
                                <View style={styles.playerStatItem}>
                                    <MaterialCommunityIcons name="bank" size={16} color={color.highLighter} />
                                    <View style={styles.playerStatTexts}>
                                        <Text style={styles.playerStatValue}>{item.totalBuyInChips}</Text>
                                        <Text style={styles.playerStatLabel}>总买入</Text>
                                    </View>
                                </View>

                                <View style={styles.playerStatItem}>
                                    <MaterialCommunityIcons name="poker-chip" size={16} color={color.highLighter} />
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
                                    <MaterialCommunityIcons name="repeat" size={16} color={color.highLighter} />
                                    <View style={styles.playerStatTexts}>
                                        <Text style={styles.playerStatValue}>{item.buyInCount}次</Text>
                                        <Text style={styles.playerStatLabel}>买入次数</Text>
                                    </View>
                                </View>

                                <View style={styles.playerStatItem}>
                                    <MaterialCommunityIcons name="chart-line" size={16} color={color.highLighter} />
                                    <View style={styles.playerStatTexts}>
                                        <Text style={[
                                            styles.playerStatValue,
                                            { color: item.roiSum >= 0 ? Palette.success : Palette.error }
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
                                    color={item.cashDifference >= 0 ? Palette.success : Palette.error}
                                />
                                <Text style={[
                                    styles.playerCashText,
                                    { color: item.cashDifference >= 0 ? Palette.success : Palette.error }
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

