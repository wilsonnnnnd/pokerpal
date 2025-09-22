import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, Animated, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette as color } from '@/constants';
import { Player } from '@/types';
import { useGameStore } from '@/stores/useGameStore';


type Props = {
    player: Player;
    onSubmit: (amount: number) => void;
    onCancel: () => void;
};

export const BuyInPopupCard: React.FC<Props> = ({ player, onSubmit, onCancel }) => {
    const [amount, setAmount] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    // 防止连续快速点击快捷按钮
    const [quickDisabled, setQuickDisabled] = useState(false);
    // 根据当前游戏的大盲生成：bigBlind * 100 / 200 / 500 / 1000
    const bigBlind = useGameStore.getState().bigBlind ?? 1;
    
    const multipliers = [100, 200, 500, 1000];
    const presetValues = multipliers.map(m => ({
        value: bigBlind * m,
        label: `+${m}`
    }));

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
        if (quickDisabled) return;
        setQuickDisabled(true);
        try {
            const current = parseInt(amount || '0', 10);
            const sum = isNaN(current) ? value : current + value;
            setAmount(sum.toString());
        } finally {
            // 短暂解锁，防止连续点击（300ms）
            setTimeout(() => setQuickDisabled(false), 300);
        }
    };

    // 生成玩家头像颜色
    const generateAvatarColor = (name: string) => {
    // 使用主色、成功色、信息色等作为备选头像颜色
    const colors = [color.primary, color.success, color.info, color.confirm, color.strongGray, color.weakGray, color.info];
    const colorIndex = name.charCodeAt(0) % colors.length;
    return colors[colorIndex];
    };

    const avatarColor = generateAvatarColor(player.nickname);
    const initialLetter = player.nickname.charAt(0).toUpperCase();

    // 优先使用玩家已有头像 URL（avatarUrl / photoURL），否则使用首字母色块作为头像
    const avatarUrl = (player as any).avatarUrl || (player as any).photoURL || null;

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.cardContainer}
            >
                <View style={styles.card}>
                    <View style={styles.header}>
                        <View style={styles.headerContent}>
                            {avatarUrl ? (
                                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                            ) : (
                                <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                                    <Text style={styles.avatarText}>{initialLetter}</Text>
                                </View>
                            )}
                            <View style={styles.headerTextContainer}>
                                <Text style={styles.title}>追加买入</Text>
                                <Text style={styles.subtitle}>{player.nickname}</Text>
                            </View>
                        </View>

                        <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
                            <MaterialCommunityIcons name="close" size={22} color={color.mutedText} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.body}>
                        <Text style={styles.inputLabel}>筹码数量</Text>
                        <View style={styles.inputContainer}>
                            <View style={styles.chipIconContainer}>
                                <MaterialCommunityIcons
                                    name="poker-chip"
                                    size={20}
                                    color={color.highLighter}
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
                                placeholderTextColor={color.mutedText}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                            />
                        </View>

                        <Text style={styles.presetLabel}>快速添加：</Text>
                        <View style={styles.quickButtons}>
                            {presetValues.map((item) => (
                                <TouchableOpacity
                                    key={item.value}
                                    style={[styles.quickBtn, quickDisabled && styles.quickBtnDisabled]}
                                    onPress={() => appendPreset(item.value)}
                                    activeOpacity={0.7}
                                    disabled={quickDisabled}
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
        backgroundColor: color.lightBackground,
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
    borderBottomColor: color.mediumGray,
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
    avatarImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    avatarText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: color.lightText,
    },
    headerTextContainer: {
        marginLeft: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: color.valueText,
    },
    subtitle: {
        fontSize: 14,
        color: color.valueLabel,
        marginTop: 2,
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: color.lightGray,
        justifyContent: 'center',
        alignItems: 'center',
    },
    body: {
        padding: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: color.strongGray,
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
        backgroundColor: color.lightGray,
        borderTopLeftRadius: 8,
        borderBottomLeftRadius: 8,
        borderWidth: 1,
        borderColor: color.borderColor || color.mediumGray,
        borderRightWidth: 0,
    },
    input: {
        flex: 1,
        height: 48,
        borderWidth: 1,
        borderColor: color.borderColor || color.mediumGray,
        borderTopRightRadius: 8,
        borderBottomRightRadius: 8,
        paddingHorizontal: 12,
        fontSize: 16,
        color: color.valueText,
        backgroundColor: color.lightGray,
    },
    inputFocused: {
        borderColor: color.primary,
        backgroundColor: color.lightBackground,
    },
    presetLabel: {
        fontSize: 14,
        color: color.valueLabel,
        marginBottom: 8,
    },
    quickButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 16,
    },
    quickBtn: {
        backgroundColor: color.lightGray,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        marginRight: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: color.borderColor || color.mediumGray,
    },
    quickBtnDisabled: {
        opacity: 0.6,
    },
    quickText: {
        fontSize: 14,
        fontWeight: '600',
        color: color.valueText,
    },
    currentBuyIn: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: color.mediumGray,
    },
    currentBuyInLabel: {
        fontSize: 14,
        color: color.valueLabel,
    },
    currentBuyInValue: {
        fontSize: 14,
        fontWeight: '600',
        color: color.valueText,
    },
    summary: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: color.lightGray,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        marginTop: 8,
    },
    summaryLabel: {
        fontSize: 14,
        color: color.strongGray,
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: '700',
        color: color.primary,
    },
    footer: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: color.mediumGray,
        padding: 16,
    },
    cancelButton: {
        flex: 1,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: color.lightGray,
        borderRadius: 8,
        marginRight: 8,
    },
    cancelButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: color.valueLabel,
    },
    confirmButton: {
        flex: 2,
        flexDirection: 'row',
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: color.success,
        borderRadius: 8,
        marginLeft: 8,
    },
    confirmButtonDisabled: {
        backgroundColor: color.lightGray,
        opacity: 0.7,
    },
    confirmButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: color.lightText,
        marginLeft: 6,
    },
});