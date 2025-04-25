import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    Modal,
    KeyboardAvoidingView,
    Platform,
    TouchableOpacity,
    ScrollView,
    Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { usePlayerStore } from '@/stores/usePlayerStore';

interface InsuranceCalculatorProps {
    visible: boolean;
    onClose: () => void;
}

export default function InsuranceCalculator({ visible, onClose }: InsuranceCalculatorProps) {
    const [potSize, setPotSize] = useState('');
    const [outs, setOuts] = useState('');
    const [totalCards, setTotalCards] = useState('46');
    const [rakePercent, setRakePercent] = useState('0');
    const [insuranceRate, setInsuranceRate] = useState('');
    const [payout, setPayout] = useState('');
    const [isCoinFlip, setIsCoinFlip] = useState(false);
    const [winProb, setWinProb] = useState(0);
    const players = usePlayerStore((state) => state.players);
    const [selectedPlayer, setSelectedPlayer] = useState(players.length > 0 ? players[0].nickname : '');
    const [insuranceRecords, setInsuranceRecords] = useState<Array<{
        player: string;
        winRate: number;
        insurance: string;
        payout: string;
        timestamp: Date;
    }>>([]);

    const calculateInsurance = () => {
        const pot = parseFloat(potSize);
        const outCount = parseInt(outs);
        const total = parseInt(totalCards);
        const rake = parseFloat(rakePercent);

        if (!pot || !outCount || !total || outCount >= total || isNaN(rake)) {
            Alert.alert('提示', '请输入有效的数字和抽水比例');
            return;
        }

        const loseProb = outCount / total;
        const win = 1 - loseProb;
        const winProbValue = win * 100;

        const fairOdds = win / loseProb;
        const rakeFactor = 1 - rake / 100;
        const payoutRatio = fairOdds * rakeFactor;

        const premium = pot / payoutRatio;
        const payoutValue = pot;

        const insuranceRateValue = premium.toFixed(0);
        const payoutValueStr = payoutValue.toFixed(0);

        if (!isFinite(premium) || premium <= 0) {
            Alert.alert('提示', '计算失败，请检查输入');
            return;
        }

        setWinProb(winProbValue);
        setInsuranceRate(insuranceRateValue);
        setPayout(payoutValueStr);
        setIsCoinFlip(winProbValue >= 45 && winProbValue <= 55);

        setInsuranceRecords(prev => [
            ...prev,
            {
                player: selectedPlayer || '未命名',
                winRate: winProbValue,
                insurance: insuranceRateValue,
                payout: payoutValueStr,
                timestamp: new Date()
            }
        ]);
    };

    const reset = () => {
        setPotSize('');
        setOuts('');
        setTotalCards('46');
        setRakePercent('10');
        setInsuranceRate('');
        setPayout('');
        setIsCoinFlip(false);
        setWinProb(0);
        setSelectedPlayer(players.length > 0 ? players[0].nickname : '');
    };

    const closeCalculator = () => {
        reset();
        setInsuranceRecords([]);
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={closeCalculator}>
            <View style={styles.overlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.keyboardView}
                >
                    <ScrollView contentContainerStyle={styles.scrollContainer}>
                        <View style={styles.modalBox}>
                            <LinearGradient
                                colors={['#3a7bd5', '#2e5fb9']}
                                style={styles.header}
                            >
                                <Text style={styles.title}>德州扑克保险计算器</Text>
                                <TouchableOpacity style={styles.closeButton} onPress={closeCalculator}>
                                    <MaterialCommunityIcons name="close" size={24} color="#fff" />
                                </TouchableOpacity>
                            </LinearGradient>

                            <View style={styles.content}>
                                <Text style={styles.label}>选择玩家</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.playerSelectorScroll}>
                                    <View style={styles.playerSelector}>
                                        {players.map((player) => (
                                            <TouchableOpacity
                                                key={player.id}
                                                style={[
                                                    styles.playerButton,
                                                    selectedPlayer === player.nickname && styles.playerButtonSelected
                                                ]}
                                                onPress={() => setSelectedPlayer(player.nickname)}
                                            >
                                                <Text
                                                    style={[
                                                        styles.playerButtonText,
                                                        selectedPlayer === player.nickname && styles.playerButtonTextSelected
                                                    ]}
                                                    numberOfLines={1}
                                                    ellipsizeMode="tail"
                                                >
                                                    {player.nickname}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>
                                <Text style={styles.label}>抽水比例 (%)</Text>
                                <View style={styles.inputGroup}>
                                    <MaterialCommunityIcons name="percent" size={20} color="#3a7bd5" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="默认 10%"
                                        placeholderTextColor="#999"
                                        value={rakePercent}
                                        onChangeText={setRakePercent}
                                        keyboardType="numeric"
                                    />
                                </View>

                                <Text style={styles.label}>底池大小</Text>
                                <View style={styles.inputGroup}>
                                    <MaterialCommunityIcons name="poker-chip" size={20} color="#3a7bd5" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="底池大小"
                                        placeholderTextColor="#999"
                                        value={potSize}
                                        onChangeText={setPotSize}
                                        keyboardType="numeric"
                                    />
                                </View>

                                <Text style={styles.label}>Outs</Text>
                                <View style={styles.inputGroup}>
                                    <MaterialCommunityIcons name="cards" size={20} color="#3a7bd5" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="outs 牌数"
                                        placeholderTextColor="#999"
                                        value={outs}
                                        onChangeText={setOuts}
                                        keyboardType="numeric"
                                    />
                                </View>

                                <Text style={styles.label}>剩余未知牌数</Text>
                                <View style={styles.inputGroup}>
                                    <MaterialCommunityIcons name="cards-outline" size={20} color="#3a7bd5" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="默认 46"
                                        placeholderTextColor="#999"
                                        value={totalCards}
                                        onChangeText={setTotalCards}
                                        keyboardType="numeric"
                                    />
                                </View>

                                <View style={styles.buttonGroup}>
                                    <TouchableOpacity style={styles.calculateButton} onPress={calculateInsurance}>
                                        <MaterialCommunityIcons name="calculator" size={18} color="#fff" />
                                        <Text style={styles.calculateButtonText}>计算保险</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.resetButton} onPress={reset}>
                                        <Text style={styles.resetButtonText}>重置</Text>
                                    </TouchableOpacity>
                                </View>

                                {insuranceRate !== '' && (
                                    <View style={styles.resultBox}>
                                        <View style={styles.resultHeader}>
                                            <MaterialCommunityIcons name="chart-line" size={20} color="#fff" />
                                            <Text style={styles.resultHeaderText}>计算结果</Text>
                                        </View>

                                        <View style={styles.resultContent}>
                                            <Text style={styles.resultText}>胜率：{winProb.toFixed(1)}%</Text>
                                            <Text style={styles.resultText}>保险费用：{insuranceRate}</Text>
                                            <Text style={styles.resultText}>若被爆冷赔付：{payout}</Text>
                                            {isCoinFlip && (
                                                <Text style={[styles.resultText, { color: '#e74c3c' }]}>⚠️ Coin Flip 区间，胜率接近 50%</Text>
                                            )}
                                        </View>
                                    </View>
                                )}

                                {insuranceRecords.length > 0 && (
                                    <View style={styles.resultBox}>
                                        <View style={styles.resultHeader}>
                                            <MaterialCommunityIcons name="history" size={20} color="#fff" />
                                            <Text style={styles.resultHeaderText}>记录</Text>
                                        </View>
                                        <View style={styles.resultContent}>
                                            {insuranceRecords.map((r, i) => (
                                                <Text key={i} style={styles.resultText}>
                                                    🧾 {r.player}：{r.winRate.toFixed(1)}% 胜率，保 {r.insurance}，赔 {r.payout}
                                                </Text>
                                            ))}
                                        </View>
                                    </View>
                                )}
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    keyboardView: {
        width: '100%',
        maxWidth: 400,
        maxHeight: '90%',
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingVertical: 20,
    },
    modalBox: {
        backgroundColor: '#fff',
        borderRadius: 16,
        width: '90%',
        maxWidth: 380,
        alignSelf: 'center',
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
    },
    playerSelectorScroll: {
        marginBottom: 20,
    },
    playerSelector: {
        flexDirection: 'row',
    },
    playerButton: {
        borderWidth: 1,
        borderColor: '#ddd',
        paddingVertical: 12,
        paddingHorizontal: 16,
        minWidth: 100,
        marginRight: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
    },
    playerButtonSelected: {
        backgroundColor: '#3a7bd5',
        borderColor: '#3a7bd5',
    },
    playerButtonText: {
        color: '#444',
        fontWeight: '500',
    },
    playerButtonTextSelected: {
        color: '#fff',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    closeButton: {
        padding: 4,
    },
    content: {
        padding: 20,
    },
    label: {
        fontSize: 15,
        marginBottom: 6,
        fontWeight: '500'
    },
    inputGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        marginBottom: 12,
        paddingHorizontal: 12,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        paddingVertical: 14,
        fontSize: 16,
        color: '#333',
    },
    buttonGroup: {
        flexDirection: 'row',
        marginVertical: 16,
    },
    calculateButton: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#3a7bd5',
        paddingVertical: 12,
        borderRadius: 8,
        marginRight: 10,
    },
    calculateButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        marginLeft: 8,
    },
    resetButton: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        paddingVertical: 12,
    },
    resetButtonText: {
        fontWeight: '600',
        color: '#666',
    },
    resultBox: {
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ccc',
        marginTop: 16,
        overflow: 'hidden',
    },
    resultHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#3a7bd5',
        padding: 12,
    },
    resultHeaderText: {
        color: '#fff',
        fontWeight: 'bold',
        marginLeft: 8,
    },
    resultContent: {
        backgroundColor: '#f7f8fa',
        padding: 12,
    },
    resultText: {
        fontSize: 14,
        marginBottom: 6,
        color: '#333',
    },
});
