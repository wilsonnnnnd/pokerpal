import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Animated, KeyboardAvoidingView, Platform } from 'react-native';
import { BuyInProps, Player } from '@/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette as color } from '@/constants';
import simpleT from '@/i18n/simpleT';
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
            alert(simpleT('enter_valid_integer'));
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
                            <Text style={ExitBuyInStyles.title}>{simpleT('edit_buyin_title')}</Text>
                            <TouchableOpacity onPress={onCancel}>
                                <MaterialCommunityIcons name="close" size={22} color="#95a5a6" />
                            </TouchableOpacity>
                        </View>

                        <Text style={ExitBuyInStyles.label}>{simpleT('current_player_label', undefined, { name: player.nickname })}</Text>

                    <View style={ExitBuyInStyles.inputContainer}>
                        <TextInput
                            style={[ExitBuyInStyles.input, isFocused && ExitBuyInStyles.inputFocused]}
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="number-pad"
                            placeholder={simpleT('enter_total_buyin_placeholder')}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                        />
                    </View>

                    <TouchableOpacity style={ExitBuyInStyles.button} onPress={handleConfirm}>
                        <Text style={ExitBuyInStyles.buttonText}>{simpleT('confirm_edit_button')}</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Animated.View>
    );
};

