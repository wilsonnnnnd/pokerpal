import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Keyboard,
    TouchableWithoutFeedback,
    TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useGameStore } from '@/stores/useGameStore';
import { PrimaryButton } from './PrimaryButton';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette as color } from '@/constants';
import * as yup from 'yup';
import 'react-native-get-random-values';
import { generateSecureId } from '@/utils/getSecureNumber';
import { InputField } from './InputField';
import Toast from 'react-native-toast-message';
import { generateToken } from '@/utils/getSecureNumber';
import { createGameOnServer } from '@/firebase/saveGame';
import storage from '@/services/storageService';
import { SETTINGS_KEY } from '@/constants/namingVar';
import { getCurrencySymbol } from '@/constants/currency';
import { CURRENT_USER_KEY } from '@/constants/namingVar';
import usePermission from '@/hooks/usePermission';
import { useLogger } from '@/utils/useLogger';
import { GameSetUpStyles } from '@/assets/styles';
import { GameSetupCardProps } from '@/types';



export const GameSetupCard = ({ onConfirm, onCancel }: GameSetupCardProps) => {
    const setGame = useGameStore((state) => state.setGame);
    const setToken = useGameStore((state) => state.setToken);
    const { clearLogs } = useLogger();
    const { isHost } = usePermission();
    
    // 创建refs用于存储输入框引用
    const smallBlindRef = useRef<TextInput | null>(null);
    const bigBlindRef = useRef<TextInput | null>(null);
    const defaultBuyInRef = useRef<TextInput | null>(null);
    const baseCashAmountRef = useRef<TextInput | null>(null);

    // 使用对象来管理表单状态
    const [formValues, setFormValues] = useState({
        smallBlind: '',
        bigBlind: '',
        baseChipAmount: '',
        baseCashAmount: '',
    });
    // currency removed — keep numeric inputs only
    const [currencyInfo, setCurrencyInfo] = useState<{ code?: string; symbol?: string; rate?: number }>({});
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    // 在组件初始化时尝试从全局或本地设置读取货币信息
    useEffect(() => {
        (async () => {
            try {
                const g = (global as any).__pokerpal_settings;
                if (g && g.currency) {
                    setCurrencyInfo({ code: g.currency, symbol: getCurrencySymbol(g.currency) });
                    return;
                }
                const s = await storage.getLocal(SETTINGS_KEY);
                if (s && s.currency) {
                    setCurrencyInfo({ code: s.currency, symbol: getCurrencySymbol(s.currency) });
                } else {
                    // no currency info found: write default settings and update global
                    const defaults = { language: 'zh', timezone: 'GMT+10', currency: 'AUD' };
                    try {
                        await storage.setLocal(SETTINGS_KEY, defaults);
                    } catch (e) {
                        // ignore write errors
                    }
                    try { (global as any).__pokerpal_settings = defaults; } catch (e) { /* ignore */ }
                    setCurrencyInfo({ code: defaults.currency, symbol: getCurrencySymbol(defaults.currency) });
                }
            } catch (e) {
                // ignore
            }
        })();
    }, []);

    // 游戏设置验证模式
    const gameSchema = yup.object().shape({
        smallBlind: yup
            .number()
            .typeError('请输入有效的数字')
            .positive('小盲注必须为正数')
            .integer('小盲注必须为整数')
            .required('请输入小盲注'),
        bigBlind: yup
            .number()
            .typeError('请输入有效的数字')
            .positive('大盲注必须为正数')
            .integer('大盲注必须为整数')
            .required('请输入大盲注')
            .test(
                'is-greater-than-small-blind',
                '大盲注必须大于或等于小盲注',
                function (value) {
                    const { smallBlind } = this.parent;
                    return !value || !smallBlind || value >= smallBlind;
                }
            ),
        baseChipAmount: yup
            .number()
            .typeError('请输入有效的数字')
            .positive('买入筹码必须为正数')
            .integer('买入筹码必须为整数')
            .required('请输入初始买入筹码'),
        baseCashAmount: yup
            .number()
            .typeError('请输入有效的数字')
            .positive('兑换金额必须为正数')
            .required('请输入兑换金额'),
    });

    // 处理表单输入变化
    const handleInputChange = (field: string, value: string) => {
        // 仅允许数字输入
        const numericValue = value.replace(/[^0-9]/g, '');

        // 更新表单值
        setFormValues(prev => ({
            ...prev,
            [field]: numericValue
        }));

        // 清除对应字段的错误
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    // 验证单个字段
    const validateField = (field: string, value: string) => {
        try {
            // 创建只包含当前字段的验证schema
            const fieldSchema = yup.object().shape({
                [field]: gameSchema.fields[field as keyof typeof gameSchema.fields]
            });

            // 验证字段
            fieldSchema.validateSync({ [field]: value ? Number(value) : undefined }, { abortEarly: false });

            // 如果验证通过，清除错误
            if (errors[field]) {
                setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors[field];
                    return newErrors;
                });
            }
        } catch (error) {
            if (error instanceof yup.ValidationError) {
                // 设置错误信息
                const newErrors = { ...errors };
                error.inner.forEach(err => {
                    if (err.path) {
                        newErrors[err.path] = err.message;
                    }
                });
                setErrors(newErrors);
            }
        }
    };

    // 处理输入框失去焦点时的验证
    const handleBlur = (field: string) => {
        validateField(field, formValues[field as keyof typeof formValues]);
    };

    const handleStartGame = async () => {

        try {
            // 隐藏键盘
            Keyboard.dismiss();

            // 清除之前游戏的日志缓存
            clearLogs();

            // 转换值为数字类型
            const gameData = {
                // 用 Number 更直观（string -> number），配合 yup 校验
                smallBlind: formValues.smallBlind ? Number(formValues.smallBlind) : undefined,
                bigBlind: formValues.bigBlind ? Number(formValues.bigBlind) : undefined,
                baseChipAmount: formValues.baseChipAmount ? Number(formValues.baseChipAmount) : undefined,
                baseCashAmount: formValues.baseCashAmount ? Number(formValues.baseCashAmount) : undefined,
            };

            // 验证数据
            gameSchema.validateSync(gameData, { abortEarly: false });

            const gameId = generateSecureId('game');
            const token = generateToken(); // 👈 生成 token
            setToken(token); // 👈 存入全局 Zustand

            // 清除错误
            setErrors({});

            // 保存游戏设置
            setGame({
                gameId,
                smallBlind: gameData.smallBlind ?? 0,
                bigBlind: gameData.bigBlind ?? 0,
                baseChipAmount: gameData.baseChipAmount ?? 0,
                baseCashAmount: gameData.baseCashAmount ?? 0,
            });


            const user = await storage.getLocal(CURRENT_USER_KEY);
            if (isHost) {
                //同步到Firebase
                await createGameOnServer({
                    gameId,
                    smallBlind: gameData.smallBlind ?? 0,
                    bigBlind: gameData.bigBlind ?? 0,
                    baseChipAmount: gameData.baseChipAmount ?? 0,
                    baseCashAmount: gameData.baseCashAmount ?? 0,
                    finalized: false,
                    token,
                    createdBy: user?.displayName,

                });
            }

            onConfirm();
        } catch (error) {
            if (error instanceof yup.ValidationError) {
                // 格式化验证错误
                const newErrors: { [key: string]: string } = {};
                error.inner.forEach(err => {
                    if (err.path) {
                        newErrors[err.path] = err.message;
                    }
                });
                setErrors(newErrors);

                Toast.show({
                    type: 'error',
                    text1: '输入错误',
                    text2: '请检查输入的值',
                    visibilityTime: 2000,
                    position: 'bottom',
                });
            } else {
                onConfirm();
                Toast.show({
                    type: 'error',
                    text1: '未知错误',
                    text2: error instanceof Error ? error.message : '发生未知错误，请稍后再试',
                    visibilityTime: 2000,
                    position: 'bottom',
                });
            }
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={GameSetUpStyles.keyboardAvoid}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <ScrollView contentContainerStyle={GameSetUpStyles.scrollContainer}>
                    <View style={GameSetUpStyles.card}>
                        {/* Header Section with Gradient */}
                        <LinearGradient
                            colors={[color.primary, color.highLighter]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={GameSetUpStyles.headerGradient}
                        >
                            <View style={GameSetUpStyles.iconContainer}>
                                <MaterialCommunityIcons
                                    name="cards-playing-outline"
                                    size={32}
                                    color={color.lightText}
                                />
                            </View>
                            <Text style={GameSetUpStyles.title}>游戏设置</Text>
                            <Text style={GameSetUpStyles.subtitle}>配置你的德州扑克游戏</Text>
                        </LinearGradient>

                        {/* Form Section */}
                        <View style={GameSetUpStyles.formSection}>
                            {/* Blind Settings */}
                            <View style={GameSetUpStyles.sectionContainer}>
                                <View style={GameSetUpStyles.sectionHeader}>
                                    <MaterialCommunityIcons
                                        name="scale-balance"
                                        size={20}
                                        color={color.primary}
                                    />
                                    <Text style={GameSetUpStyles.sectionTitle}>盲注设置</Text>
                                </View>

                                <View style={GameSetUpStyles.inputRow}>
                                    <View style={GameSetUpStyles.halfWidth}>
                                        <InputField
                                            label="小盲注"
                                            fieldName="smallBlind"
                                            value={formValues.smallBlind}
                                            placeholder="50"
                                            icon="scale-balance"
                                            keyboardType="number-pad"
                                            error={errors.smallBlind}
                                            onChangeText={handleInputChange}
                                            onBlur={() => handleBlur('smallBlind')}
                                            inputRef={smallBlindRef}
                                        />
                                    </View>
                                    <View style={GameSetUpStyles.halfWidth}>
                                        <InputField
                                            label="大盲注"
                                            fieldName="bigBlind"
                                            value={formValues.bigBlind}
                                            placeholder="100"
                                            icon="scale-balance"
                                            keyboardType="number-pad"
                                            error={errors.bigBlind}
                                            onChangeText={handleInputChange}
                                            onBlur={() => handleBlur('bigBlind')}
                                            inputRef={bigBlindRef}
                                        />
                                    </View>
                                </View>
                            </View>

                            {/* Buy-in Settings */}
                            <View style={GameSetUpStyles.sectionContainer}>
                                <View style={GameSetUpStyles.sectionHeader}>
                                    <MaterialCommunityIcons
                                        name="wallet-outline"
                                        size={20}
                                        color={color.primary}
                                    />
                                    <Text style={GameSetUpStyles.sectionTitle}>买入设置</Text>
                                </View>

                                <InputField
                                    label="初始买入筹码"
                                    fieldName="baseChipAmount"
                                    value={formValues.baseChipAmount}
                                    placeholder="1000"
                                    icon="poker-chip"
                                    keyboardType="number-pad"
                                    error={errors.baseChipAmount}
                                    onChangeText={handleInputChange}
                                    onBlur={() => handleBlur('baseChipAmount')}
                                    inputRef={defaultBuyInRef}
                                />

                                <InputField
                                    label={`兑换金额 ${currencyInfo.symbol ? `(${currencyInfo.symbol})` : ''}`}
                                    fieldName="baseCashAmount"
                                    value={formValues.baseCashAmount}
                                    placeholder={currencyInfo.symbol ? `例如: 100${currencyInfo.symbol}` : '100'}
                                    icon="cash"
                                    keyboardType="number-pad"
                                    error={errors.baseCashAmount}
                                    onChangeText={handleInputChange}
                                    onBlur={() => handleBlur('baseCashAmount')}
                                    inputRef={baseCashAmountRef}
                                />
                            </View>
                        </View>

                        {/* Action Buttons */}
                        <View style={GameSetUpStyles.buttonSection}>
                            <View style={GameSetUpStyles.buttonGroup}>
                                {onCancel && (
                                    <PrimaryButton
                                        title="取消"
                                        icon="close"
                                        iconPosition="left"
                                        iconColor={color.mutedText}
                                        onPress={onCancel}
                                        variant="outlined"
                                        style={GameSetUpStyles.cancelButton}
                                    />
                                )}
                                <PrimaryButton
                                    title="开始游戏"
                                    icon="play-circle"
                                    iconPosition="right"
                                    onPress={handleStartGame}
                                    style={GameSetUpStyles.confirmButton}
                                />
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
};

