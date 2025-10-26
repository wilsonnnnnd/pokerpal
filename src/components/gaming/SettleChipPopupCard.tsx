import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Spacing, Radius, FontSize, Elevation } from '@/constants/designTokens';
import { Gradients } from '@/constants/gradients';
import { Palette as color } from '@/constants';
import simpleT from '@/i18n/simpleT';
import { BuyInProps, Player } from '@/types';
import { PrimaryButton } from '../common/PrimaryButton';
import { SettleChipsStyles } from '@/assets/styles';


export const SettleChipPopupCard: React.FC<BuyInProps> = ({ player, onSubmit, onCancel }) => {
    const [chipInput, setChipInput] = useState('');
    const [error, setError] = useState('');

    const handleConfirm = () => {
        const value = parseInt(chipInput || '0', 10);
        if (isNaN(value) || value < 0) {
            setError(simpleT('chip_input_invalid'));
            return;
        }
        setError('');
        onSubmit(value);
    };

    const handleInputChange = (text: string) => {
        setChipInput(text);
        if (error) {
            setError(''); // 清除错误信息
        }
    };

    return (
        <KeyboardAvoidingView
            style={SettleChipsStyles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <LinearGradient
                colors={['rgb(255, 255, 255)', 'rgb(255, 255, 255)']}
                style={SettleChipsStyles.card}
            >
                {/* 头部标题区域 */}
                <View style={SettleChipsStyles.header}>
                    <MaterialCommunityIcons 
                        name="account-cash" 
                        size={32} 
                        color={color.primary} 
                        style={SettleChipsStyles.headerIcon}
                    />
                    <Text style={SettleChipsStyles.title}>{simpleT('settle_player_exit_title')}</Text>
                    <Text style={SettleChipsStyles.subtitle}>
                        {simpleT('player_exit_subtitle', undefined, { name: player.nickname })}
                    </Text>
                </View>

                {/* 输入区域 */}
                <View style={SettleChipsStyles.inputSection}>
                    <Text style={SettleChipsStyles.inputLabel}>{simpleT('input_enter_remaining_chips')}</Text>
                    
                    <View style={[SettleChipsStyles.inputContainer, error ? SettleChipsStyles.inputError : null]}>
                        <MaterialCommunityIcons 
                            name="poker-chip" 
                            size={20} 
                            color={error ? color.error : color.strongGray} 
                            style={SettleChipsStyles.inputIcon}
                        />
                        <TextInput
                            style={SettleChipsStyles.input}
                            value={chipInput}
                            onChangeText={handleInputChange}
                            keyboardType="number-pad"
                            placeholder={simpleT('chip_input_placeholder')}
                            placeholderTextColor={color.weakGray}
                        />
                    </View>

                    {error ? (
                        <View style={SettleChipsStyles.errorContainer}>
                            <MaterialCommunityIcons 
                                name="alert-circle" 
                                size={16} 
                                color={color.error} 
                            />
                            <Text style={SettleChipsStyles.errorText}>{error}</Text>
                        </View>
                    ) : null}
                </View>

                {/* 按钮区域 */}
                <View style={SettleChipsStyles.buttonContainer}>
                    <TouchableOpacity
                        style={[SettleChipsStyles.button, SettleChipsStyles.cancelButton]}
                        onPress={onCancel}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={Gradients[5]}
                            style={SettleChipsStyles.buttonGradient}
                        >
                            <MaterialCommunityIcons name="close" size={20} color={color.strongGray} />
                            <Text style={SettleChipsStyles.cancelButtonText}>{simpleT('cancel')}</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[SettleChipsStyles.button, SettleChipsStyles.confirmButton]}
                        onPress={handleConfirm}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={['#4CAF50', '#45a049']}
                            style={SettleChipsStyles.buttonGradient}
                        >
                            <MaterialCommunityIcons name="check" size={20} color="white" />
                            <Text style={SettleChipsStyles.confirmButtonText}>{simpleT('confirm_settlement')}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </LinearGradient>
        </KeyboardAvoidingView>
    );
};
