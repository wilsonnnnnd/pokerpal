import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Spacing, Radius, FontSize } from '@/constants/designTokens';
import { Player } from '@/types';
import { PrimaryButton } from './PrimaryButton';

type Props = {
    player: Player;
    onConfirm: (chipCount: number) => void;
    onCancel: () => void;
};

export const SettleChipPopupCard: React.FC<Props> = ({ player, onConfirm, onCancel }) => {
    const [chipInput, setChipInput] = useState('');

    const handleConfirm = () => {
        const value = parseInt(chipInput || '0', 10);
        if (isNaN(value) || value < 0) {
            alert('请输入有效的整数筹码数');
            return;
        }
        onConfirm(value);
    };

    return (
        <KeyboardAvoidingView
            style={styles.card}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <Text style={styles.title}>💸 玩家离场结算</Text>
            <Text style={styles.subtitle}>{player.nickname} 离场，请输入剩余筹码：</Text>

            <TextInput
                style={styles.input}
                value={chipInput}
                onChangeText={setChipInput}
                keyboardType="number-pad"
                placeholder="筹码数"
            />

            <View style={[styles.buttonRow,{marginBottom: Spacing.md}]}>
                <PrimaryButton
                    title="取消"
                    onPress={onCancel}
                    style={[styles.button, styles.cancel]}
                    textStyle={styles.cancelText}
                />
                <PrimaryButton
                    title="确认"
                    onPress={handleConfirm}
                    style={styles.button}
                />
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: Radius.lg,
        padding: Spacing.lg,
    },
    title: {
        fontSize: FontSize.h3,
        fontWeight: '700',
        marginBottom: Spacing.xs,
        color: '#2c3e50',
    },
    subtitle: {
        fontSize: FontSize.body,
        marginBottom: Spacing.md,
        color: '#666',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: Radius.md,
        padding: Spacing.md,
        fontSize: FontSize.h3,
        textAlign: 'center',
        marginBottom: Spacing.lg,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    button: {
        flex: 1,
    },
    cancel: {
        backgroundColor: '#eee',
    },
    cancelText: {
        color: '#888',
    },
});
