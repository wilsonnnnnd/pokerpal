import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette as color } from '@/constants';
import { GameHistorystyles as styles } from '@/assets/styles';
import { GameHistoryItem } from '@/types';
import simpleT from '@/i18n/simpleT';

interface GameCardProps {
    item: GameHistoryItem;
    index: number;
    onPress: (item: GameHistoryItem) => void;
}

export const GameCard: React.FC<GameCardProps> = ({ item, index, onPress }) => {
    // 获取最大赢家和输家
    const pickTop = (game: GameHistoryItem) => {
        const players = game.players ?? [];
        if (players.length === 0) return { winner: null, loser: null };
        const sorted = [...players].sort((a, b) => b.settleCashDiff - a.settleCashDiff);
        return { winner: sorted[0], loser: sorted[sorted.length - 1] };
    };

    const { winner, loser } = pickTop(item);

    // 格式化时间
    const formatDateTime = (dateStr: string) => {
        if (!dateStr) return { day: '--', month: '--', year: '--', time: '--:--' };
        const d = new Date(dateStr);
        return {
            day: String(d.getDate()).padStart(2, '0'),
            month: String(d.getMonth() + 1).padStart(2, '0'),
            year: String(d.getFullYear()),
            time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
        };
    };

    const { day, month, year, time } = formatDateTime(item.created);

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
                    {/* 左侧日期区域 - 云端数据标识 */}
                    <LinearGradient
                        colors={[color.primary, color.primary]} // 使用蓝色系
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
                            <MaterialCommunityIcons name="cloud" size={12} color="rgba(255, 255, 255, 0.8)" />
                            <Text style={styles.timeText}>{time}</Text>
                        </View>
                    </LinearGradient>

                    <View style={styles.cardContent}>
                        {/* 头部信息 */}
                        <View style={styles.cardHeader}>
                            <View style={styles.blindsContainer}>
                                <MaterialCommunityIcons name="poker-chip" size={18} color={color.primary} />
                                <Text style={styles.blindsText}>{item.smallBlind}/{item.bigBlind}</Text>
                            </View>
                            <View style={styles.playerBadge}>
                                <MaterialCommunityIcons name="account-group" size={16} color={color.success} />
                                <Text style={styles.playerCountText}>{item.playerCount ?? item.players?.length ?? 0}</Text>
                            </View>
                        </View>

                        {/* 统计数据 */}
                        <View style={styles.statsContainer}>
                            <View style={styles.statCard}>
                                <MaterialCommunityIcons name="bank" size={16} color={color.info} />
                                <View style={styles.statTexts}>
                                    <Text style={styles.statValue}>${Number(item.totalBuyInCash).toFixed(0)}</Text>
                                    <Text style={styles.statLabel}>{simpleT('buyin_label')}</Text>
                                </View>
                            </View>

                            <View style={styles.statDivider} />

                            <View style={styles.statCard}>
                                <MaterialCommunityIcons name="calculator-variant" size={16} color={color.warning} />
                                <View style={styles.statTexts}>
                                    <Text style={styles.statValue}>${Number(item.totalEndingCash).toFixed(0)}</Text>
                                    <Text style={styles.statLabel}>{simpleT('settle_label')}</Text>
                                </View>
                            </View>

                            <View style={styles.statDivider} />

                            <View style={styles.statCard}>
                                <MaterialCommunityIcons
                                    name={item.totalDiffCash >= 0 ? 'trending-up' : 'trending-down'}
                                    size={16}
                                    color={item.totalDiffCash >= 0 ? color.success : color.error}
                                />
                                <View style={styles.statTexts}>
                                    <Text
                                        style={[
                                            styles.statValue,
                                            { color: item.totalDiffCash >= 0 ? color.success : color.error },
                                        ]}
                                    >
                                        {item.totalDiffCash >= 0 ? '+' : ''}${Math.abs(Number(item.totalDiffCash)).toFixed(0)}
                                    </Text>
                                    <Text style={styles.statLabel}>{simpleT('diff_label')}</Text>
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

                        {/* 右侧箭头 + 云端标识 */}
                        <View style={styles.cardFooter}>
                            <View style={styles.localBadge}>
                                <MaterialCommunityIcons name="cloud" size={14} color={color.info} />
                                <Text style={styles.localBadgeText}>{simpleT('cloud_label')}</Text>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={20} color={color.mutedText} />
                        </View>
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        </Animated.View>
    );
};
