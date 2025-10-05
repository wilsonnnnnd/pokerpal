import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette as color } from '@/constants';
import { GameHistorystyles as styles } from '@/assets/styles';
import { getPlayerRanking, formatDateTime } from '@/services/gameHistoryService';

interface LocalGameCardProps {
    item: any;
    index: number;
    onPress: (item: any) => void;
}

export const LocalGameCard: React.FC<LocalGameCardProps> = ({ item, index, onPress }) => {
    const h = item.__history;
    if (!h) return null;

    const players = h.players || [];
    const { winner, loser } = getPlayerRanking(players);

    // 动画值
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;

    // 进入动画
    useEffect(() => {
        const delay = Math.min(index * 80, 400); // 略快的动画
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                delay,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                delay,
                tension: 60,
                friction: 8,
                useNativeDriver: true,
            }),
        ]).start();
    }, [index, fadeAnim, scaleAnim]);

    const handlePress = () => {
        // 点击动画
        Animated.sequence([
            Animated.timing(scaleAnim, {
                toValue: 0.96,
                duration: 80,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 80,
                useNativeDriver: true,
            }),
        ]).start();

        onPress(item);
    };

    const { day, month, year, time } = formatDateTime(h.created);

    return (
        <Animated.View
            style={[
                styles.card,
                {
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                },
            ]}
        >
            <TouchableOpacity
                style={styles.cardTouchable}
                onPress={handlePress}
                activeOpacity={0.9}
            >
                <LinearGradient
                    colors={['#FFFFFF', '#F8FAFB']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cardGradient}
                >
                    {/* 左侧日期区域 - 本地数据标识 */}
                    <LinearGradient
                        colors={[color.primary, color.primary]} // 使用蓝色系区分本地数据
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={styles.dateContainer}
                    >
                        <View style={styles.dateBox}>
                            <Text style={styles.dateText}>{day}</Text>
                            <View style={styles.dateSeparator} />
                            <Text style={styles.monthYearText}>{month}/{year.slice(2)}</Text>
                        </View>
                        <View style={styles.timeContainer}>
                            <MaterialCommunityIcons name="database" size={12} color="rgba(255, 255, 255, 0.8)" />
                            <Text style={styles.timeText}>{time}</Text>
                        </View>
                    </LinearGradient>

                    <View style={styles.cardContent}>
                        {/* 头部信息 */}
                        <View style={styles.cardHeader}>
                            <View style={styles.blindsContainer}>
                                <MaterialCommunityIcons name="poker-chip" size={18} color={color.primary} />
                                <Text style={styles.blindsText}>{h.smallBlind}/{h.bigBlind}</Text>
                            </View>
                            <View style={[styles.playerBadge, { backgroundColor: 'rgba(164, 200, 225, 0.1)' }]}>
                                <MaterialCommunityIcons name="account-group" size={16} color={color.info} />
                                <Text style={[styles.playerCountText, { color: color.info }]}>{h.players.length}</Text>
                            </View>
                        </View>

                        {/* 统计数据 */}
                        <View style={styles.statsContainer}>
                            <View style={styles.statCard}>
                                <MaterialCommunityIcons name="bank" size={16} color={color.info} />
                                <View style={styles.statTexts}>
                                    <Text style={styles.statValue}>${Number(h.totalBuyInCash).toFixed(0)}</Text>
                                    <Text style={styles.statLabel}>买入</Text>
                                </View>
                            </View>

                            <View style={styles.statDivider} />

                            <View style={styles.statCard}>
                                <MaterialCommunityIcons name="calculator-variant" size={16} color={color.warning} />
                                <View style={styles.statTexts}>
                                    <Text style={styles.statValue}>${Number(h.totalEndingCash).toFixed(0)}</Text>
                                    <Text style={styles.statLabel}>结算</Text>
                                </View>
                            </View>

                            <View style={styles.statDivider} />

                            <View style={styles.statCard}>
                                <MaterialCommunityIcons
                                    name={h.totalDiffCash >= 0 ? 'trending-up' : 'trending-down'}
                                    size={16}
                                    color={h.totalDiffCash >= 0 ? color.success : color.error}
                                />
                                <View style={styles.statTexts}>
                                    <Text
                                        style={[
                                            styles.statValue,
                                            { color: h.totalDiffCash >= 0 ? color.success : color.error },
                                        ]}
                                    >
                                        {h.totalDiffCash >= 0 ? '+' : ''}${Math.abs(Number(h.totalDiffCash)).toFixed(0)}
                                    </Text>
                                    <Text style={styles.statLabel}>差额</Text>
                                </View>
                            </View>
                        </View>

                        {/* 最大赢家/输家 */}
                        {winner && loser && (
                            <View style={styles.playersContainer}>
                                <View style={styles.playerRow}>
                                    <View style={styles.playerInfo}>
                                        <View style={styles.winnerBadge}>
                                            <MaterialCommunityIcons name="trophy" size={12} color="#FFD700" />
                                        </View>
                                        <Text style={styles.playerName} numberOfLines={1}>{winner.nickname}</Text>
                                    </View>
                                    <Text style={[styles.playerProfit, { color: color.success }]}>
                                        +${Number(winner.settleCashDiff).toFixed(0)}
                                    </Text>
                                </View>

                                <View style={styles.playerRow}>
                                    <View style={styles.playerInfo}>
                                        <View style={styles.loserBadge}>
                                            <MaterialCommunityIcons name="arrow-down" size={12} color="#9E9E9E" />
                                        </View>
                                        <Text style={styles.playerName} numberOfLines={1}>{loser.nickname}</Text>
                                    </View>
                                    <Text style={[styles.playerProfit, { color: color.error }]}>
                                        -${Math.abs(Number(loser.settleCashDiff)).toFixed(0)}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* 右侧箭头 + 本地标识 */}
                        <View style={styles.cardFooter}>
                            <View style={styles.localBadge}>
                                <MaterialCommunityIcons name="hard-hat" size={14} color={color.info} />
                                <Text style={styles.localBadgeText}>本地</Text>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={20} color={color.mutedText} />
                        </View>
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        </Animated.View>
    );
};
