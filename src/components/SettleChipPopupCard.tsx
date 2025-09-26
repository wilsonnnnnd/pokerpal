import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Spacing, Radius, FontSize, Elevation } from '@/constants/designTokens';
import { Gradients } from '@/constants/gradients';
import { Palette as color } from '@/constants';
import { Player } from '@/types';
import { PrimaryButton } from './PrimaryButton';

type Props = {
    player: Player;
    onConfirm: (chipCount: number) => void;
    onCancel: () => void;
};

export const SettleChipPopupCard: React.FC<Props> = ({ player, onConfirm, onCancel }) => {
    const [chipInput, setChipInput] = useState('');
    const [error, setError] = useState('');

    const handleConfirm = () => {
        const value = parseInt(chipInput || '0', 10);
        if (isNaN(value) || value < 0) {
            setError('请输入有效的筹码数（不能为负数）');
            return;
        }
        setError('');
        onConfirm(value);
    };

    const handleInputChange = (text: string) => {
        setChipInput(text);
        if (error) {
            setError(''); // 清除错误信息
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <LinearGradient
                colors={['rgb(255, 255, 255)', 'rgb(255, 255, 255)']}
                style={styles.card}
            >
                {/* 头部标题区域 */}
                <View style={styles.header}>
                    <MaterialCommunityIcons 
                        name="account-cash" 
                        size={32} 
                        color={color.primary} 
                        style={styles.headerIcon}
                    />
                    <Text style={styles.title}>玩家离场结算</Text>
                    <Text style={styles.subtitle}>
                        <Text style={styles.playerName}>{player.nickname}</Text> 离场
                    </Text>
                </View>

                {/* 输入区域 */}
                <View style={styles.inputSection}>
                    <Text style={styles.inputLabel}>请输入剩余筹码数：</Text>
                    
                    <View style={[styles.inputContainer, error ? styles.inputError : null]}>
                        <MaterialCommunityIcons 
                            name="poker-chip" 
                            size={20} 
                            color={error ? color.error : color.strongGray} 
                            style={styles.inputIcon}
                        />
                        <TextInput
                            style={styles.input}
                            value={chipInput}
                            onChangeText={handleInputChange}
                            keyboardType="number-pad"
                            placeholder="输入筹码数"
                            placeholderTextColor={color.weakGray}
                        />
                    </View>

                    {error ? (
                        <View style={styles.errorContainer}>
                            <MaterialCommunityIcons 
                                name="alert-circle" 
                                size={16} 
                                color={color.error} 
                            />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}
                </View>

                {/* 按钮区域 */}
                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={[styles.button, styles.cancelButton]}
                        onPress={onCancel}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={Gradients[5]}
                            style={styles.buttonGradient}
                        >
                            <MaterialCommunityIcons name="close" size={20} color={color.strongGray} />
                            <Text style={styles.cancelButtonText}>取消</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, styles.confirmButton]}
                        onPress={handleConfirm}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={['#4CAF50', '#45a049']}
                            style={styles.buttonGradient}
                        >
                            <MaterialCommunityIcons name="check" size={20} color="white" />
                            <Text style={styles.confirmButtonText}>确认结算</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </LinearGradient>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        borderRadius: Radius.lg,
        padding: Spacing.xl,
        width: '100%',
        maxWidth: 400,
        elevation: Elevation.overlay,
        shadowColor: color.shadowDark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
    },
    header: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    headerIcon: {
        marginBottom: Spacing.sm,
    },
    title: {
        fontSize: FontSize.h2,
        fontWeight: '700',
        marginBottom: Spacing.xs,
        color: color.valueText,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: FontSize.body,
        color: color.text,
        textAlign: 'center',
    },
    playerName: {
        fontWeight: '600',
        color: color.primary,
    },
    inputSection: {
        marginBottom: Spacing.xl,
    },
    inputLabel: {
        fontSize: FontSize.body,
        fontWeight: '500',
        color: color.valueText,
        marginBottom: Spacing.sm,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: color.mediumGray,
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.md,
        backgroundColor: color.lightBackground,
        marginBottom: Spacing.sm,
    },
    inputError: {
        borderColor: color.error,
    },
    inputIcon: {
        marginRight: Spacing.sm,
    },
    input: {
        flex: 1,
        paddingVertical: Spacing.lg,
        fontSize: FontSize.h3,
        textAlign: 'center',
        color: color.valueText,
        fontWeight: '600',
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    errorText: {
        fontSize: FontSize.small,
        color: color.error,
        marginLeft: Spacing.xs,
        flex: 1,
    },
    quickAmountLabel: {
        fontSize: FontSize.small,
        fontWeight: '500',
        color: color.text,
        marginBottom: Spacing.sm,
        marginTop: Spacing.sm,
    },
    quickAmountRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing.lg,
    },
    quickAmountButton: {
        flex: 1,
        marginHorizontal: Spacing.xs,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderRadius: Radius.sm,
        borderWidth: 1,
        borderColor: color.mediumGray,
        backgroundColor: color.lightBackground,
        alignItems: 'center',
    },
    quickAmountButtonSelected: {
        borderColor: color.primary,
        backgroundColor: color.primary,
    },
    quickAmountText: {
        fontSize: FontSize.small,
        fontWeight: '500',
        color: color.text,
    },
    quickAmountTextSelected: {
        color: color.lightText,
        fontWeight: '600',
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    button: {
        flex: 1,
        borderRadius: Radius.md,
        elevation: Elevation.card,
        shadowColor: color.shadowDark,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        overflow: 'hidden',
    },
    buttonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing.md,
    },
    cancelButton: {
        // Style handled by gradient
    },
    confirmButton: {
        // Style handled by gradient
    },
    cancelButtonText: {
        fontSize: FontSize.body,
        fontWeight: '600',
        color: color.strongGray,
        marginLeft: Spacing.xs,
    },
    confirmButtonText: {
        fontSize: FontSize.body,
        fontWeight: '600',
        color: color.lightText,
        marginLeft: Spacing.xs,
    },
});
