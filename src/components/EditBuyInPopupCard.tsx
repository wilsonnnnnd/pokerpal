import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Animated, KeyboardAvoidingView, Platform } from 'react-native';
import { BuyInProps, Player } from '@/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette as color } from '@/constants';
import { ExitBuyInStyles } from '@/assets/styles';


export const EditBuyInPopupCard: React.FC<BuyInProps> = ({ player, onSubmit, onCancel }) => {
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
            onSubmit(value);
        });
    };

    return (
        <Animated.View style={[ExitBuyInStyles.container, { opacity: fadeAnim }]}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={ExitBuyInStyles.card}>
                    <View style={ExitBuyInStyles.header}>
                        <Text style={ExitBuyInStyles.title}>编辑总买入</Text>
                        <TouchableOpacity onPress={onCancel}>
                            <MaterialCommunityIcons name="close" size={22} color="#95a5a6" />
                        </TouchableOpacity>
                    </View>

                    <Text style={ExitBuyInStyles.label}>当前玩家：{player.nickname}</Text>

                    <View style={ExitBuyInStyles.inputContainer}>
                        <TextInput
                            style={[ExitBuyInStyles.input, isFocused && ExitBuyInStyles.inputFocused]}
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="number-pad"
                            placeholder="输入总买入筹码"
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                        />
                    </View>

                    <TouchableOpacity style={ExitBuyInStyles.button} onPress={handleConfirm}>
                        <Text style={ExitBuyInStyles.buttonText}>确认修改</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Animated.View>
    );
};

