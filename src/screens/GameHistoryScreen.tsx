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
                    const players = playersSnapshot.docs.map((playerDoc) => ({
                        id: playerDoc.id,
                        nickname: playerDoc.data().nickname,
                        chipDifference: playerDoc.data().chipDifference || 0,
                        cashDifference: playerDoc.data().cashDifference || 0,
                        roi: playerDoc.data().roi || 0,
                        totalBuyInChips: playerDoc.data().totalBuyInChips || 0,
                        buyInCount: playerDoc.data().buyInCount || 0,
                        endingChipCount: playerDoc.data().endingChipCount || 0,
                    }));
        
                    result.push({
                        id: gameId,
                        createdAt: data.startTime,
                        smallBlind: data.smallBlind,
                        bigBlind: data.bigBlind,
                        baseCashAmount: data.baseCashAmount,
                        baseChipAmount: data.baseChipAmount,
                        totalBuyIn: players.reduce((sum, p) => sum + p.totalBuyInChips, 0),
                        totalEnding: players.reduce((sum, p) => sum + p.totalBuyInChips + (p.chipDifference || 0), 0),
                        totalDiff: players.reduce((sum, p) => sum + (p.chipDifference || 0), 0),
                        players,
                    });
                }
        
                // 按时间排序，最新的游戏在前面
                result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
        
        const sortedPlayers = [...game.players].sort((a, b) => b.chipDifference - a.chipDifference);
        return {
            winner: sortedPlayers[0],
            loser: sortedPlayers[sortedPlayers.length - 1]
        };
    };
    
    const renderGameCard = ({ item }: { item: GameSnapshot }) => {
        const { winner, loser } = getWinnerAndLoser(item);
        const gameDate = new Date(item.createdAt);
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
                            <MaterialCommunityIcons name="poker-chip" size={20} color={color.iconHighlighter || "#d46613"} />
                            <Text style={styles.blindsText}>{item.smallBlind}/{item.bigBlind}</Text>
                        </View>
                        
                        <View style={styles.playerCountContainer}>
                            <Text style={styles.playerCountText}>{item.players.length}人参与</Text>
                        </View>
                    </View>
                    
                    <View style={styles.statsContainer}>
                        <View style={styles.statItem}>
                            <MaterialCommunityIcons name="bank" size={18} color={color.iconHighlighter || "#d46613"} />
                            <View style={styles.statTexts}>
                                <Text style={styles.statValue}>{item.totalBuyIn}</Text>
                                <Text style={styles.statLabel}>总买入</Text>
                            </View>
                        </View>
                        
                        <View style={styles.statItem}>
                            <MaterialCommunityIcons name="calculator-variant" size={18} color={color.iconHighlighter || "#d46613"} />
                            <View style={styles.statTexts}>
                                <Text style={styles.statValue}>{item.totalEnding}</Text>
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
                                    +{winner.chipDifference}
                                </Text>
                            </View>
                            
                            <View style={styles.playerRow}>
                                <View style={styles.playerInfo}>
                                    <MaterialCommunityIcons name="emoticon-sad" size={16} color="#9E9E9E" />
                                    <Text style={styles.playerName}>{loser.nickname}</Text>
                                </View>
                                <Text style={[styles.playerProfit, { color: "#F44336" }]}>
                                    {loser.chipDifference}
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
                <ActivityIndicator size="large" color={ "#d46613"} />
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f6fa',
    },
    list: {
        padding: 16,
        paddingBottom: 24,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f6fa',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#757575',
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        flexDirection: 'row',
    },
    dateContainer: {
        width: 70,
        backgroundColor: '#f8f9fa',
        padding: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderRightWidth: 1,
        borderRightColor: '#eeeeee',
    },
    dateBox: {
        alignItems: 'center',
    },
    dateText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    monthText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    yearText: {
        fontSize: 12,
        color: '#7f8c8d',
        marginTop: 2,
    },
    timeText: {
        fontSize: 12,
        color: '#7f8c8d',
        marginTop: 8,
    },
    cardContent: {
        flex: 1,
        padding: 12,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    blindsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    blindsText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2c3e50',
        marginLeft: 4,
    },
    playerCountContainer: {
        backgroundColor: '#f1f8e9',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    playerCountText: {
        fontSize: 13,
        color: '#558b2f',
        fontWeight: '500',
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        padding: 10,
        marginBottom: 12,
    },
    statItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    statTexts: {
        marginLeft: 6,
    },
    statValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2c3e50',
    },
    statLabel: {
        fontSize: 11,
        color: '#7f8c8d',
    },
    playersContainer: {
        backgroundColor: '#fafafa',
        borderRadius: 12,
        padding: 10,
        marginBottom: 8,
    },
    playerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    playerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    playerName: {
        fontSize: 13,
        color: '#2c3e50',
        marginLeft: 6,
    },
    playerProfit: {
        fontSize: 13,
        fontWeight: '600',
    },
    cardFooter: {
        alignItems: 'flex-end',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#757575',
        marginTop: 16,
    },
    emptySubText: {
        fontSize: 14,
        color: '#9E9E9E',
        marginTop: 8,
    },
});