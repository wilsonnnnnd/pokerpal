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
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as yup from 'yup';
import { useLogStore } from '@/stores/useLogStore';
import localDb from '@/services/localDb';
import 'react-native-get-random-values';
import { generateSecureId } from '@/utils/getSecureNumber';
import { InputField } from './InputField';
import Toast from 'react-native-toast-message';
import { generateToken } from '@/utils/getSecureNumber';
import { createGameOnServer } from '@/firebase/saveGame';
import storage from '@/services/storageService';


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
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const log = useLogStore((state) => state.log);

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

            // 记录游戏设置
            log('Game', `游戏设置: ${JSON.stringify({
                gameId,
                token,
                smallBlind: gameData.smallBlind,
                bigBlind: gameData.bigBlind,
                baseChipAmount: gameData.baseChipAmount,
                baseCashAmount: gameData.baseCashAmount,
                created: new Date().toISOString(),
                updated: new Date().toISOString(),
            })}`);

            const user = await storage.getLocal('@pokerpal:currentUser');
            console.log('当前用户', user);

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

    useEffect(() => {
        // 读取游戏存储信息
        const logGameStorage = async () => {
            try {
                const value = await AsyncStorage.getItem('game-storage');
                if (value !== null) {
                    log('game-storage', JSON.stringify({
                        level: 'Info',
                        message: 'game-storage 数据',
                        data: JSON.parse(value)
                    }));
                } else {
                    log('game-storage', JSON.stringify({
                        level: 'Info',
                        message: '没有找到 game-storage 数据'
                    }));
                }
            } catch (error) {
                Toast.show({
                    type: 'error',
                    text1: '读取失败',
                    text2: '无法读取游戏存储数据，请稍后再试',
                    visibilityTime: 2000,
                    position: 'bottom',
                });

                log('game-storage', JSON.stringify({
                    level: 'Error',
                    message: '读取失败',
                    error: String(error)
                }));
            }
        };

        logGameStorage();
    }, []);

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoid}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <ScrollView contentContainerStyle={styles.scrollContainer}>
                    <View style={styles.card}>
                        <View style={styles.header}>
                            <MaterialCommunityIcons name="gamepad-variant" size={28} color={color.info} />
                            <Text style={styles.title}>游戏设置</Text>
                        </View>

                        <InputField
                            label="小盲注"
                            fieldName="smallBlind"
                            value={formValues.smallBlind}
                            placeholder="例如：50"
                            icon="currency-usd"
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
                            icon="currency-usd"
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
                            icon="cash"
                            keyboardType="number-pad"
                            error={errors.baseChipAmount}
                            onChangeText={handleInputChange}
                            onBlur={() => handleBlur('baseChipAmount')}
                            inputRef={defaultBuyInRef}
                        />

                        <InputField
                            label="兑换金额（澳币）"
                            fieldName="baseCashAmount"
                            value={formValues.baseCashAmount}
                            placeholder="例如：100"
                            icon="cash"
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