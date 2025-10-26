import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, Animated, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette as color } from '@/constants';
import simpleT from '@/i18n/simpleT';
import { BuyInProps, Player } from '@/types';
import { useGameStore } from '@/stores/useGameStore';
import { InputField } from '../common/InputField';
import { BuyInCardStyles } from '@/assets/styles';


export const BuyInPopupCard: React.FC<BuyInProps> = ({ player, onSubmit, onCancel }) => {
    const [amount, setAmount] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    // 防止连续快速点击快捷按钮
    const [quickDisabled, setQuickDisabled] = useState(false);
    // 根据当前游戏的基础筹码金额生成快速买入选项
    const baseChipAmount = useGameStore.getState().baseChipAmount ?? 1000;
    
    // 基于基础筹码金额的专业买入选项：1x, 2x, 3x, 5x
    // label 使用 i18n key，以便在渲染时通过 simpleT 解析（避免导入时翻译）
    const presetValues = [
        {
            value: baseChipAmount,
            label: 'buyin_preset_standard',
            subtitle: `${baseChipAmount}`
        },
        {
            value: baseChipAmount * 2,
            label: 'buyin_preset_double',
            subtitle: `${baseChipAmount * 2}`
        },
        {
            value: baseChipAmount * 3,
            label: 'buyin_preset_triple',
            subtitle: `${baseChipAmount * 3}`
        },
        {
            value: baseChipAmount * 5,
            label: 'buyin_preset_deep',
            subtitle: `${baseChipAmount * 5}`
        }
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
            alert(simpleT('buyin_invalid_amount_msg'));
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
        <Animated.View style={[BuyInCardStyles.container, { opacity: fadeAnim }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={BuyInCardStyles.cardContainer}
            >
                <View style={BuyInCardStyles.card}>
                    <View style={BuyInCardStyles.header}>
                        <View style={BuyInCardStyles.headerContent}>
                            {avatarUrl ? (
                                <Image source={{ uri: avatarUrl }} style={BuyInCardStyles.avatarImage} />
                            ) : (
                                <View style={[BuyInCardStyles.avatar, { backgroundColor: avatarColor }]}>
                                    <Text style={BuyInCardStyles.avatarText}>{initialLetter}</Text>
                                </View>
                            )}
                                            <View style={BuyInCardStyles.headerTextContainer}>
                                                <Text style={BuyInCardStyles.title}>{simpleT('buyin_add_title')}</Text>
                                <Text style={BuyInCardStyles.subtitle}>{player.nickname}</Text>
                            </View>
                        </View>

                        <TouchableOpacity onPress={onCancel} style={BuyInCardStyles.closeButton}>
                            <MaterialCommunityIcons name="close" size={22} color={color.mutedText} />
                        </TouchableOpacity>
                    </View>

                    <View style={BuyInCardStyles.body}>
                        <InputField
                            label={simpleT('buyin_amount_label')}
                            fieldName="amount"
                            value={amount}
                            placeholder={simpleT('buyin_amount_placeholder')}
                            icon="poker-chip"
                            keyboardType="number-pad"
                            onChangeText={(field, value) => setAmount(value)}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            returnKeyType="done"
                        />

                        <View style={BuyInCardStyles.baseChipInfo}>
                            <MaterialCommunityIcons name="information-outline" size={16} color={color.info} />
                            <Text style={BuyInCardStyles.baseChipText}>
                                {simpleT('buyin_base_chip_info', undefined, { baseChipAmount })}
                            </Text>
                        </View>

                        <Text style={BuyInCardStyles.presetLabel}>{simpleT('buyin_quick_add_label')}</Text>
                        <View style={BuyInCardStyles.quickButtons}>
                            {presetValues.map((item, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[BuyInCardStyles.quickBtn, quickDisabled && BuyInCardStyles.quickBtnDisabled]}
                                    onPress={() => appendPreset(item.value)}
                                    activeOpacity={0.7}
                                    disabled={quickDisabled}
                                >
                                    <Text style={BuyInCardStyles.quickText}>{simpleT(item.label)}</Text>
                                    <Text style={BuyInCardStyles.quickSubtext}>{item.subtitle}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={BuyInCardStyles.currentBuyIn}>
                            <Text style={BuyInCardStyles.currentBuyInLabel}>{simpleT('buyin_current_buyin_label')}</Text>
                            <Text style={BuyInCardStyles.currentBuyInValue}>{player.totalBuyInChips} {simpleT('buyin_chips_suffix')}</Text>
                        </View>

                        {amount && (
                            <View style={BuyInCardStyles.summary}>
                                <Text style={BuyInCardStyles.summaryLabel}>{simpleT('buyin_total_after_label')}</Text>
                                <Text style={BuyInCardStyles.summaryValue}>
                                    {player.totalBuyInChips + parseInt(amount || '0', 10)} {simpleT('buyin_chips_suffix')}
                                </Text>
                            </View>
                        )}
                    </View>

                    <View style={BuyInCardStyles.footer}>
                        <TouchableOpacity
                            style={BuyInCardStyles.cancelButton}
                            onPress={onCancel}
                            activeOpacity={0.7}
                        >
                            <Text style={BuyInCardStyles.cancelButtonText}>{simpleT('cancel')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                BuyInCardStyles.confirmButton,
                                (!amount || parseInt(amount, 10) <= 0) && BuyInCardStyles.confirmButtonDisabled
                            ]}
                            onPress={handleConfirm}
                            activeOpacity={0.7}
                            disabled={!amount || parseInt(amount, 10) <= 0}
                        >
                            <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
                            <Text style={BuyInCardStyles.confirmButtonText}>{simpleT('buyin_confirm_buyin')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Animated.View>
    );
};

