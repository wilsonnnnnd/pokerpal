import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Animated, KeyboardAvoidingView, Platform } from 'react-native';
import { Player } from '@/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette as color } from '@/constants';

interface Props {
    player: Player;
    onConfirm: (buyInAmount: number) => void; // Add this line
    onCancel: () => void;
}

export const EditBuyInPopupCard: React.FC<Props> = ({ player, onConfirm, onCancel }) => {
    const [amount, setAmount] = useState(player.totalBuyInChips.toString());
    const [isFocused, setIsFocused] = useState(false);
    const fadeAnim = useState(new Animated.Value(0))[0];

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, []);

    const handleConfirm = () => {
        const value = parseInt(amount, 10);
        if (isNaN(value) || value < 0) {
            alert('请输入一个有效的整数（可为0）');
            return;
        }
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            // Pass the number value directly rather than an updated player object
            onConfirm(value);
        });
    };

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={styles.card}>
                    <View style={styles.header}>
                        <Text style={styles.title}>编辑总买入</Text>
                        <TouchableOpacity onPress={onCancel}>
                            <MaterialCommunityIcons name="close" size={22} color="#95a5a6" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.label}>当前玩家：{player.nickname}</Text>

                    <View style={styles.inputContainer}>
                        <TextInput
                            style={[styles.input, isFocused && styles.inputFocused]}
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="number-pad"
                            placeholder="输入总买入筹码"
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                        />
                    </View>

                    <TouchableOpacity style={styles.button} onPress={handleConfirm}>
                        <Text style={styles.buttonText}>确认修改</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    label: {
        fontSize: 14,
        color: '#7f8c8d',
        marginBottom: 12,
    },
    inputContainer: {
        marginBottom: 16,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 10,
        fontSize: 16,
        color: '#2c3e50',
        backgroundColor: '#f9f9f9',
    },
    inputFocused: {
        borderColor: color.highLighter,
        backgroundColor: '#fff',
    },
    button: {
        backgroundColor: '#4CAF50',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
});