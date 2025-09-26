import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Keyboard,
    TouchableWithoutFeedback,
    TextInput,
} from 'react-native';
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
// settings key removed from namingVar; no currency usage here


interface GameSetupCardProps {
    onConfirm: () => void;
    onCancel?: () => void;
}

export const GameSetupCard = ({ onConfirm, onCancel }: GameSetupCardProps) => {
    const setGame = useGameStore((state) => state.setGame);
    const setToken = useGameStore((state) => state.setToken);
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
    const { isHost } = usePermission();

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
                    const defaults = { language: 'en', timezone: 'GMT+10', currency: 'AUD' };
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

    // 创建refs用于存储输入框引用
    const smallBlindRef = useRef<TextInput | null>(null);
    const bigBlindRef = useRef<TextInput | null>(null);
    const defaultBuyInRef = useRef<TextInput | null>(null);
    const baseCashAmountRef = useRef<TextInput | null>(null);

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
            style={styles.keyboardAvoid}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <ScrollView contentContainerStyle={styles.scrollContainer}>
                    <View style={styles.card}>
                        <View style={styles.header}>
                            <MaterialCommunityIcons name="cards-club" size={28} color={color.info} />
                            <Text style={styles.title}>游戏设置</Text>
                        </View>

                        <InputField
                            label="小盲注"
                            fieldName="smallBlind"
                            value={formValues.smallBlind}
                            placeholder="例如：50"
                            icon="scale-balance"
                            keyboardType="number-pad"
                            error={errors.smallBlind}
                            onChangeText={handleInputChange}
                            onBlur={() => handleBlur('smallBlind')}
                            inputRef={smallBlindRef}
                        />

                        <InputField
                            label="大盲注"
                            fieldName="bigBlind"
                            value={formValues.bigBlind}
                            placeholder="例如：100"
                            icon="scale-balance"
                            keyboardType="number-pad"
                            error={errors.bigBlind}
                            onChangeText={handleInputChange}
                            onBlur={() => handleBlur('bigBlind')}
                            inputRef={bigBlindRef}
                        />

                        <InputField
                            label="初始买入筹码"
                            fieldName="baseChipAmount"
                            value={formValues.baseChipAmount}
                            placeholder="例如：1000"
                            icon="wallet"
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
                            placeholder={currencyInfo.symbol ? `例如 (${currencyInfo.symbol})` : '例如'}
                            icon="swap-horizontal"
                            keyboardType="number-pad"
                            error={errors.baseCashAmount}
                            onChangeText={handleInputChange}
                            onBlur={() => handleBlur('baseCashAmount')}
                            inputRef={baseCashAmountRef}
                        />

                        <View style={styles.buttonGroup}>
                            {onCancel && (
                                <PrimaryButton
                                    title="取消"
                                    icon="close"
                                    iconPosition="left"
                                    iconColor={color.error}
                                    onPress={onCancel}
                                    variant="outlined"
                                    style={styles.cancelButton}
                                />
                            )}
                            <PrimaryButton
                                title="开始游戏"
                                icon="play-circle"
                                iconPosition="right"
                                onPress={handleStartGame}
                                style={styles.confirmButton}
                            />
                        </View>
                    </View>
                </ScrollView>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    keyboardAvoid: {
        flex: 1,
        justifyContent: 'center',
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingVertical: 20,
    },
    card: {
        marginHorizontal: 20,
        borderRadius: 20,
        padding: 24,
        backgroundColor: color.lightBackground,
        shadowColor: color.shadowLight,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginLeft: 10,
        color: color.valueText,
    },
    buttonGroup: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 24,
    },
    cancelButton: {
        borderColor: color.valueLabel,
        flex: 1,
        marginRight: 12,
    },
    confirmButton: {
        backgroundColor: color.success,
        flex: 2,
    },
});