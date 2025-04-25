import React, { useEffect, useState } from 'react';
import { FlatList, Text, View, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useGameHistoryStore } from '@/stores/useGameHistoryStore';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette as color } from '@/constants';
import { GameSnapshot } from '@/types';
import Toast from 'react-native-toast-message';
import {GameHistorystyles as styles} from '@/assets/styles';
type HomeScreenNav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export default function GameHistoryScreen() {
    const { history, setHistory, clearHistory } = useGameHistoryStore();
    const navigation = useNavigation<HomeScreenNav>();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchGames = async () => {
            setLoading(true);
            try {
                const snapshot = await getDocs(collection(db, 'games'));
                const result: GameSnapshot[] = [];

                for (const docSnap of snapshot.docs) {
                    const data = docSnap.data();
                    const gameId = data.gameId;

                    // 获取玩家子集合
                    const playersSnapshot = await getDocs(collection(db, 'games', gameId, 'players'));
                    const players = playersSnapshot.docs.map((playerDoc) => {
                        const data = playerDoc.data();
                        const email = data.email || '';
                        const nickname = data.nickname || email.split('@')[0] || '未知玩家';

                        return {
                            id: playerDoc.id,
                            nickname,
                            cashDifference: data.settleCashDiff ?? 0,
                            roiSum: data.settleROI ?? 0,
                            totalBuyInChips: data.totalBuyInChips ?? 0,
                            buyInCount: data.buyInCount ?? 0,
                            endingChipCount: data.endingChipCount ?? 0,
                        };
                    });

                    result.push({
                        id: gameId,
                        createdAt: data.createdAt,
                        updatedAt: data.updatedAt,
                        smallBlind: data.smallBlind,
                        bigBlind: data.bigBlind,
                        baseCashAmount: data.baseCashAmount,
                        baseChipAmount: data.baseChipAmount,
                        totalBuyIn: players.reduce((sum, p) => sum + p.totalBuyInChips, 0),
                        totalEnding: players.reduce((sum, p) => sum + p.endingChipCount, 0),
                        totalDiff: players.reduce((sum, p) => sum + p.endingChipCount, 0),
                        players, // 直接使用，无需二次 map
                    });

                }

                // 按时间排序，最新的游戏在前面
                result.sort((a, b) => {
                    const dateA = typeof a.createdAt === 'string' ? new Date(a.createdAt) : a.createdAt.toDate();
                    const dateB = typeof b.createdAt === 'string' ? new Date(b.createdAt) : b.createdAt.toDate();
                    return dateB.getTime() - dateA.getTime();
                });
                setHistory(result);
            } catch (error) {
                Toast.show({
                    type: 'error',
                    text1: '加载游戏历史失败',
                    text2: '请检查网络连接或稍后再试。',
                    visibilityTime: 2000,
                    position: 'bottom',
                });

            } finally {
                setLoading(false);
            }
        };
        fetchGames();

        return () => {
            clearHistory();
        };
    }, []);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getWinnerAndLoser = (game: GameSnapshot) => {
        if (game.players.length === 0) return { winner: null, loser: null };

        const sortedPlayers = [...game.players].sort((a, b) => b.cashDifference - a.cashDifference);
        return {
            winner: sortedPlayers[0],
            loser: sortedPlayers[sortedPlayers.length - 1]
        };
    };

    const renderGameCard = ({ item }: { item: GameSnapshot }) => {
        const { winner, loser } = getWinnerAndLoser(item);
        const gameDate = typeof item.createdAt === 'string' 
            ? new Date(item.createdAt) 
            : item.createdAt.toDate();
        const day = gameDate.toLocaleDateString('zh-CN', { day: '2-digit' });
        const month = gameDate.toLocaleDateString('zh-CN', { month: '2-digit' });
        const time = gameDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        const year = gameDate.getFullYear();

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('GameDetail', { gameId: item.id })}
                activeOpacity={0.7}
            >
                <View style={styles.dateContainer}>
                    <View style={styles.dateBox}>
                        <Text style={styles.dateText}>{day}</Text>
                        <Text style={styles.monthText}>{month}</Text>
                        <Text style={styles.yearText}>{year}</Text>
                    </View>
                    <Text style={styles.timeText}>{time}</Text>
                </View>

                <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                        <View style={styles.blindsContainer}>
                            <MaterialCommunityIcons name="poker-chip" size={20} color={color.highLighter || "#d46613"} />
                            <Text style={styles.blindsText}>{item.smallBlind}/{item.bigBlind}</Text>
                        </View>

                        <View style={styles.playerCountContainer}>
                            <Text style={styles.playerCountText}>{item.players.length}人参与</Text>
                        </View>
                    </View>

                    <View style={styles.statsContainer}>
                        <View style={styles.statItem}>
                            <MaterialCommunityIcons name="bank" size={18} color={color.highLighter || "#d46613"} />
                            <View style={styles.statTexts}>
                                <Text style={styles.statValue}>{item.totalBuyIn/1000 + "K"}</Text>
                                <Text style={styles.statLabel}>总买入</Text>
                            </View>
                        </View>

                        <View style={styles.statItem}>
                            <MaterialCommunityIcons name="calculator-variant" size={18} color={color.highLighter || "#d46613"} />
                            <View style={styles.statTexts}>
                                <Text style={styles.statValue}>
                                    {(
                                        Number(
                                            item.players.reduce(
                                                (sum, p) =>
                                                    sum +
                                                    (Number(p.cashDifference) / (Number(item.baseCashAmount) / Number(item.baseChipAmount))) +
                                                    Number(p.totalBuyInChips),
                                                0
                                            ).toFixed(0)
                                        ) / 1000
                                    ) + "K"}
                                </Text>

                                <Text style={styles.statLabel}>结算总额</Text>
                            </View>
                        </View>

                        <View style={styles.statItem}>
                            <MaterialCommunityIcons
                                name={item.totalDiff >= 0 ? "alert-circle-check" : "alert-circle"}
                                size={18}
                                color={item.totalDiff >= 0 ? "#4CAF50" : "#F44336"}
                            />
                            <View style={styles.statTexts}>
                                <Text style={[styles.statValue, {
                                    color: item.totalDiff >= 0 ? "#4CAF50" : "#F44336"
                                }]}>
                                    {item.totalDiff >= 0 ? '+' : ''}{item.totalDiff}
                                </Text>
                                <Text style={styles.statLabel}>差额</Text>
                            </View>
                        </View>
                    </View>

                    {winner && loser && (
                        <View style={styles.playersContainer}>
                            <View style={styles.playerRow}>
                                <View style={styles.playerInfo}>
                                    <MaterialCommunityIcons name="trophy" size={16} color="#FFD700" />
                                    <Text style={styles.playerName}>{winner.nickname}</Text>
                                </View>
                                <Text style={[styles.playerProfit, { color: "#4CAF50" }]}>
                                    +{winner.cashDifference}
                                </Text>
                            </View>

                            <View style={styles.playerRow}>
                                <View style={styles.playerInfo}>
                                    <MaterialCommunityIcons name="emoticon-sad" size={16} color="#9E9E9E" />
                                    <Text style={styles.playerName}>{loser.nickname}</Text>
                                </View>
                                <Text style={[styles.playerProfit, { color: "#F44336" }]}>
                                    {loser.cashDifference}
                                </Text>
                            </View>
                        </View>
                    )}

                    <View style={styles.cardFooter}>
                        <MaterialCommunityIcons name="chevron-right" size={20} color="#9E9E9E" />
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={"#d46613"} />
                <Text style={styles.loadingText}>加载游戏历史...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={history}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                renderItem={renderGameCard}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons
                            name="cards"
                            size={60}
                            color="#BDBDBD"
                        />
                        <Text style={styles.emptyText}>暂无游戏记录</Text>
                        <Text style={styles.emptySubText}>开始一局新游戏吧！</Text>
                    </View>
                }
            />
        </View>
    );
}

