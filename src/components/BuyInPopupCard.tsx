import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, Animated } from 'react-native';
import { PrimaryButton } from './PrimaryButton';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette as color } from '@/constants';
import { Player } from '@/types';
import { useLogStore } from '@/stores/useLogStore';


type Props = {
    player: Player;
    onSubmit: (amount: number) => void;
    onCancel: () => void;
};

export const BuyInPopupCard: React.FC<Props> = ({ player, onSubmit, onCancel }) => {
    const [amount, setAmount] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const { log, clearLogs, logs, getLogsByTag, exportLogsAsText } = useLogStore();
    const presetValues = [
        { value: 1000, label: "+1K" },
        { value: 3000, label: "+3K" },
        { value: 5000, label: "+5K" },
        { value: 10000, label: "+10K" }
    ];

    const fadeAnim = useState(new Animated.Value(0))[0];

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, []);

    const handleConfirm = () => {
        const value = parseInt(amount || '0', 10);
        if (isNaN(value) || value <= 0) {
            alert('请输入大于 0 的有效整数');
            return;
        }

        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            onSubmit(value);
        });
    };

    const appendPreset = (value: number) => {
        const current = parseInt(amount || '0', 10);
        const sum = isNaN(current) ? value : current + value;
        setAmount(sum.toString());
    };

    // 生成玩家头像颜色
    const generateAvatarColor = (name: string) => {
        const colors = ['#FFC107', '#FF9800', '#FF5722', '#4CAF50', '#2196F3', '#9C27B0', '#673AB7'];
        const colorIndex = name.charCodeAt(0) % colors.length;
        return colors[colorIndex];
    };

    const avatarColor = generateAvatarColor(player.nickname);
    const initialLetter = player.nickname.charAt(0).toUpperCase();

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.cardContainer}
            >
                <View style={styles.card}>
                    <View style={styles.header}>
                        <View style={styles.headerContent}>
                            <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                                <Text style={styles.avatarText}>{initialLetter}</Text>
                            </View>
                            <View style={styles.headerTextContainer}>
                                <Text style={styles.title}>追加买入</Text>
                                <Text style={styles.subtitle}>{player.nickname}</Text>
                            </View>
                        </View>

                        <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
                            <MaterialCommunityIcons name="close" size={22} color="#95a5a6" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.body}>
                        <Text style={styles.inputLabel}>筹码数量</Text>
                        <View style={styles.inputContainer}>
                            <View style={styles.chipIconContainer}>
                                <MaterialCommunityIcons
                                    name="poker-chip"
                                    size={20}
                                    color={color.iconHighlighter || "#d46613"}
                                />
                            </View>
                            <TextInput
                                style={[
                                    styles.input,
                                    isFocused && styles.inputFocused
                                ]}
                                value={amount}
                                onChangeText={setAmount}
                                keyboardType="number-pad"
                                placeholder="输入筹码数"
                                placeholderTextColor="#95a5a6"
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                            />
                        </View>

                        <Text style={styles.presetLabel}>快速添加：</Text>
                        <View style={styles.quickButtons}>
                            {presetValues.map((item) => (
                                <TouchableOpacity
                                    key={item.value}
                                    style={styles.quickBtn}
                                    onPress={() => appendPreset(item.value)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.quickText}>{item.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.currentBuyIn}>
                            <Text style={styles.currentBuyInLabel}>当前已买入：</Text>
                            <Text style={styles.currentBuyInValue}>{player.totalBuyInChips} 筹码</Text>
                        </View>

                        {amount && (
                            <View style={styles.summary}>
                                <Text style={styles.summaryLabel}>追加后总计：</Text>
                                <Text style={styles.summaryValue}>
                                    {player.totalBuyInChips + parseInt(amount || '0', 10)} 筹码
                                </Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={onCancel}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.cancelButtonText}>取消</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.confirmButton,
                                (!amount || parseInt(amount, 10) <= 0) && styles.confirmButtonDisabled
                            ]}
                            onPress={handleConfirm}
                            activeOpacity={0.7}
                            disabled={!amount || parseInt(amount, 10) <= 0}
                        >
                            <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
                            <Text style={styles.confirmButtonText}>确认买入</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    cardContainer: {
        width: '100%',
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
    },
    headerTextContainer: {
        marginLeft: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#2c3e50',
    },
    subtitle: {
        fontSize: 14,
        color: '#7f8c8d',
        marginTop: 2,
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#f5f6fa',
        justifyContent: 'center',
        alignItems: 'center',
    },
    body: {
        padding: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#34495e',
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    chipIconContainer: {
        width: 40,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f6fa',
        borderTopLeftRadius: 8,
        borderBottomLeftRadius: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRightWidth: 0,
    },
    input: {
        flex: 1,
        height: 48,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderTopRightRadius: 8,
        borderBottomRightRadius: 8,
        paddingHorizontal: 12,
        fontSize: 16,
        color: '#2c3e50',
        backgroundColor: '#f9f9f9',
    },
    inputFocused: {
        borderColor: '#d46613',
        backgroundColor: '#FFFFFF',
    },
    presetLabel: {
        fontSize: 14,
        color: '#7f8c8d',
        marginBottom: 8,
    },
    quickButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 16,
    },
    quickBtn: {
        backgroundColor: '#f5f6fa',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        marginRight: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    quickText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2c3e50',
    },
    currentBuyIn: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    currentBuyInLabel: {
        fontSize: 14,
        color: '#7f8c8d',
    },
    currentBuyInValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2c3e50',
    },
    summary: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#f8f9fa',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        marginTop: 8,
    },
    summaryLabel: {
        fontSize: 14,
        color: '#34495e',
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: '700',
        color: '#d46613',
    },
    footer: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        padding: 16,
    },
    cancelButton: {
        flex: 1,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f6fa',
        borderRadius: 8,
        marginRight: 8,
    },
    cancelButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#7f8c8d',
    },
    confirmButton: {
        flex: 2,
        flexDirection: 'row',
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#4CAF50',
        borderRadius: 8,
        marginLeft: 8,
    },
    confirmButtonDisabled: {
        backgroundColor: '#A5D6A7',
        opacity: 0.7,
    },
    confirmButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
        marginLeft: 6,
    },
});