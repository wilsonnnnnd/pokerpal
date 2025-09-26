import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    TextInput,
    Alert,
    ActivityIndicator,
    Platform,
    Vibration
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { logError } from '@/utils/useLogger';
import { Palette as color } from '@/constants';
import { Spacing, Radius, FontSize, Elevation } from '@/constants/designTokens';

/**
 * 德州扑克Call Timer组件的引用接口
 */
export interface CallTimerHandle {
    show: (initialSeconds?: number) => void;
    hide: () => void;
    reset: (newDuration?: number) => void;
    pause: () => void;
    resume: () => void;
}

/**
 * 德州扑克Call Timer组件属性
 */
export interface CallTimerProps {
    /** 默认计时时间(秒) */
    defaultDuration?: number;
    /** 警告阈值(秒) */
    warningThreshold?: number;
    /** 紧急阈值(秒) */
    criticalThreshold?: number;
    /** 时间结束回调函数 */
    onTimeUp?: () => void;
    /** 计时器关闭回调函数 */
    onClose?: () => void;
    /** 预设时间列表(秒) */
    presetTimes?: number[];
    /** 是否启用声音 */
    soundEnabled?: boolean;
    /** 是否启用振动 */
    vibrationEnabled?: boolean;
}

// 常量
const RADIUS = 40;
const STROKE_WIDTH = 8;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * 德州扑克Call Timer组件
 * 简化版本，移除模式选择功能
 */
const CallTimer = forwardRef<CallTimerHandle, CallTimerProps>(
    ({
        defaultDuration = 30,
        warningThreshold = 10,
        criticalThreshold = 5,
        onTimeUp = () => {},
        onClose = () => { },
        presetTimes = [15, 30, 60],
        soundEnabled = true,
        vibrationEnabled = true,
    }, ref) => {
        // 模态框状态
        const [visible, setVisible] = useState(false);

        // 计时器状态
        const [secondsLeft, setSecondsLeft] = useState(defaultDuration);
        const [initialDuration, setInitialDuration] = useState(defaultDuration);
        const [running, setRunning] = useState(false);
        const [editingTime, setEditingTime] = useState(false);
        const [timeInput, setTimeInput] = useState('');

        // 音效状态
        const [isLoadingSound, setIsLoadingSound] = useState(false);
        const [soundsLoaded, setSoundsLoaded] = useState(false);

        // 引用
        const intervalRef = useRef<NodeJS.Timeout | null>(null);

        // 使用 expo-audio 的 useAudioPlayer hook
        const audioPlayer = useAudioPlayer();

        // 设置音频模式
        useEffect(() => {
            const setupAudio = async () => {
                try {
                    await setAudioModeAsync({ 
                        playsInSilentMode: true, 
                        allowsRecording: false 
                    });
                } catch (e) {
                    // 设置音频模式失败时静默处理
                }
            };
            setupAudio();
        }, []);

        // 加载音效
        const loadSounds = async () => {
            if (soundsLoaded) return;
            setIsLoadingSound(true);
            try {
                if (audioPlayer) {
                    audioPlayer.replace(require('../assets/sounds/clock-alarm.mp3'));
                    setSoundsLoaded(true);
                } else {
                    setSoundsLoaded(false);
                }
            } catch (error) {
                logError('加载音效失败', error instanceof Error ? error.message : String(error));
                setSoundsLoaded(false);
            } finally {
                setIsLoadingSound(false);
            }
        };

        // 播放音效
        const playSound = async () => {
            if (!soundEnabled) return;
            try {
                if (audioPlayer && soundsLoaded) {
                    audioPlayer.seekTo(0);
                    audioPlayer.play();
                }
            } catch (error) {
                logError('播放音效失败', error instanceof Error ? error.message : String(error));
            }
        };

        // 停止音效
        const stopSound = async () => {
            try {
                if (audioPlayer && soundsLoaded) {
                    audioPlayer.pause();
                }
            } catch (error) {
                logError('停止音效失败', error instanceof Error ? error.message : String(error));
            }
        };

        // 暴露方法给父组件
        useImperativeHandle(ref, () => ({
            show: (initialSeconds?: number) => {
                const duration = initialSeconds || defaultDuration;
                setSecondsLeft(duration);
                setInitialDuration(duration);
                setVisible(true);
                setRunning(true);
                if (soundEnabled && !soundsLoaded) {
                    loadSounds();
                }
            },
            hide: () => {
                setVisible(false);
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
                // 停止播放音频
                stopSound();
            },
            reset: (newDuration?: number) => {
                if (intervalRef.current) clearInterval(intervalRef.current);
                const resetValue = newDuration || initialDuration;
                setSecondsLeft(resetValue);
                setInitialDuration(resetValue);
                setRunning(true);
            },
            pause: () => setRunning(false),
            resume: () => setRunning(true),
        }));

        // 组件卸载时清理
        useEffect(() => {
            return () => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
            };
        }, []);

        // 计时器逻辑
        useEffect(() => {
            if (running && secondsLeft > 0 && visible) {
                intervalRef.current = setInterval(() => {
                    setSecondsLeft(prev => {
                        if (prev <= 1) {
                            if (intervalRef.current) clearInterval(intervalRef.current);
                            setRunning(false);
                            onTimeUp();
                            // 倒计时结束时播放声音
                            playSound();
                            triggerHapticFeedback('heavy');
                            return 0;
                        }

                        // 倒计时到10秒时触发触感反馈（只触发一次）
                        if (prev === 11) { // prev - 1 = 10，所以在11的时候触发，确保在倒数到10秒时反馈
                            triggerHapticFeedback('medium');
                        }

                        return prev - 1;
                    });
                }, 1000);
            } else {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
            }

            return () => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
            };
        }, [running, secondsLeft, visible, warningThreshold, criticalThreshold]);

        // 关闭模态框时重置状态
        useEffect(() => {
            if (!visible) {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
            }
        }, [visible]);

        // 触发触觉反馈
        const triggerHapticFeedback = (intensity: 'light' | 'medium' | 'heavy') => {
            if (!vibrationEnabled) return;

            try {
                if (Platform.OS === 'ios') {
                    switch (intensity) {
                        case 'light':
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            break;
                        case 'medium':
                            // 10秒提醒使用更强烈的触感反馈
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                            break;
                        case 'heavy':
                            // 倒计时结束使用通知型触感反馈
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                            break;
                    }
                } else {
                    // Android使用振动API
                    switch (intensity) {
                        case 'light':
                            Vibration.vibrate(50);
                            break;
                        case 'medium':
                            // 10秒提醒振动模式：短震-停顿-短震
                            Vibration.vibrate([0, 150, 100, 150]);
                            break;
                        case 'heavy':
                            // 倒计时结束振动模式：长震提醒
                            Vibration.vibrate([0, 300, 150, 300]);
                            break;
                    }
                }
            } catch (error) {
                logError('触发触觉反馈失败', error instanceof Error ? error.message : String(error));
            }
        };

        // 关闭模态框
        const handleClose = () => {
            setVisible(false);
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            // 停止播放音频
            stopSound();
            onClose();
        };

        // 获取时间颜色
        const getTimeColor = () => {
            if (secondsLeft <= criticalThreshold) return color.error; // 红色
            if (secondsLeft <= warningThreshold) return color.warning; // 橙色
            return color.success; // 绿色
        };

        // 格式化时间显示
        const formatTime = (seconds: number) => {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins > 0 ? `${mins}:` : ''}${secs < 10 && mins > 0 ? '0' : ''}${secs}`;
        };

        // 计算进度环
        const progress = secondsLeft / initialDuration;
        const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

        // 修改当前计时值
        const setPresetTime = (seconds: number) => {
            setSecondsLeft(seconds);
            setInitialDuration(seconds);
            setRunning(true);
        };

        // 添加时间
        const addSeconds = (seconds: number) => {
            setSecondsLeft(prev => {
                const newTime = prev + seconds;
                return newTime > 600 ? 600 : newTime; // 最大10分钟
            });
            if (!running) setRunning(true);
        };

        // 处理时间输入
        const handleTimeInputChange = (text: string) => {
            // 只允许输入数字
            const sanitizedText = text.replace(/[^0-9]/g, '');
            setTimeInput(sanitizedText);
        };

        // 确认输入的时间
        const confirmTimeInput = () => {
            const inputSeconds = parseInt(timeInput);

            if (isNaN(inputSeconds) || inputSeconds <= 0) {
                Alert.alert('提示', '请输入有效的时间（秒）');
                return;
            }

            if (inputSeconds > 600) { // 最大10分钟
                Alert.alert('提示', '时间不能超过10分钟（600秒）');
                return;
            }

            setSecondsLeft(inputSeconds);
            setInitialDuration(inputSeconds);
            setEditingTime(false);
            setRunning(true);
            setTimeInput('');
        };

        // 渲染计时器UI
        const renderTimer = () => (
            <LinearGradient
                colors={['#FFFFFF', '#F8FAFB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.timerContainer}
            >
                {/* 计时器圆环和时间显示 */}
                <View style={styles.timerDisplay}>
                    <View style={styles.timerRing}>
                        <Svg height={120} width={120}>
                            <Circle
                                stroke="rgba(0, 0, 0, 0.08)"
                                fill="none"
                                cx="60"
                                cy="60"
                                r={RADIUS}
                                strokeWidth={STROKE_WIDTH}
                            />
                            <Circle
                                stroke={getTimeColor()}
                                fill="none"
                                cx="60"
                                cy="60"
                                r={RADIUS}
                                strokeWidth={STROKE_WIDTH}
                                strokeDasharray={`${CIRCUMFERENCE}, ${CIRCUMFERENCE}`}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                                rotation="-90"
                                origin="60, 60"
                            />
                        </Svg>
                        <View style={styles.timeDisplayCenter}>
                            <TouchableOpacity onPress={() => setEditingTime(true)}>
                                <Text style={[styles.timeText, { color: getTimeColor() }]}>
                                    {formatTime(secondsLeft)}
                                </Text>
                            </TouchableOpacity>
                            <Text style={styles.timeUnit}>秒</Text>
                        </View>
                    </View>
                </View>

                {/* 预设时间按钮 */}
                <View style={styles.presetContainer}>
                    {presetTimes.map((time) => (
                        <TouchableOpacity
                            key={time}
                            style={[
                                styles.presetButton,
                                initialDuration === time && styles.activePresetButton
                            ]}
                            onPress={() => setPresetTime(time)}
                        >
                            <LinearGradient
                                colors={initialDuration === time 
                                    ? [color.primary, color.highLighter]
                                    : ['#FFFFFF', '#F5F5F5']}
                                style={styles.presetButtonGradient}
                            >
                                <Text
                                    style={[
                                        styles.presetButtonText,
                                        initialDuration === time && styles.activePresetButtonText
                                    ]}
                                >
                                    {time}s
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* 控制按钮 */}
                <View style={styles.controlButtons}>
                    <TouchableOpacity
                        style={styles.controlButtonWrapper}
                        onPress={() => {
                            const newRunning = !running;
                            setRunning(newRunning);
                            // 如果暂停计时器，同时停止音频播放
                            if (!newRunning) {
                                stopSound();
                            }
                        }}
                    >
                        <LinearGradient
                            colors={running 
                                ? [color.warning, '#FFA726']
                                : [color.success, '#66BB6A']}
                            style={styles.controlButton}
                        >
                            <Ionicons
                                name={running ? "pause" : "play"}
                                size={24}
                                color={color.lightText}
                            />
                            <Text style={styles.controlButtonText}>
                                {running ? '暂停' : '继续'}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.controlButtonWrapper}
                        onPress={() => {
                            setSecondsLeft(initialDuration);
                            setRunning(true);
                        }}
                    >
                        <LinearGradient
                            colors={[color.strongGray, '#757575']}
                            style={styles.controlButton}
                        >
                            <Ionicons name="refresh" size={24} color={color.lightText} />
                            <Text style={styles.controlButtonText}>重置</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* 设置按钮 */}
                <View style={styles.settingsContainer}>
                    <TouchableOpacity
                        style={styles.settingButton}
                        onPress={() => addSeconds(5)}
                    >
                        <View style={styles.settingButtonInner}>
                            <Ionicons name="add-circle-outline" size={20} color={color.primary} />
                            <Text style={styles.settingButtonText}>+5秒</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.settingButton}
                        onPress={() => addSeconds(15)}
                    >
                        <View style={styles.settingButtonInner}>
                            <Ionicons name="add-circle-outline" size={20} color={color.primary} />
                            <Text style={styles.settingButtonText}>+15秒</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </LinearGradient>
        );

        // 渲染编辑时间UI
        const renderTimeEdit = () => (
            <View style={styles.timeInputContainer}>
                <Text style={styles.timeInputLabel}>设置时间（秒）</Text>
                <TextInput
                    style={styles.timeInput}
                    value={timeInput}
                    onChangeText={handleTimeInputChange}
                    keyboardType="number-pad"
                    maxLength={3}
                    autoFocus
                    placeholder="输入秒数"
                />
                <View style={styles.timeInputButtons}>
                    <TouchableOpacity
                        style={[styles.timeInputButton, styles.cancelButton]}
                        onPress={() => setEditingTime(false)}
                    >
                        <Text style={styles.cancelButtonText}>取消</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.timeInputButton, styles.confirmButton]}
                        onPress={confirmTimeInput}
                    >
                        <Text style={styles.confirmButtonText}>确定</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );

        // 渲染加载UI
        const renderLoading = () => (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={color.success} />
                <Text style={styles.loadingText}>加载音效中...</Text>
            </View>
        );

        // 渲染内容
        const renderContent = () => {
            if (isLoadingSound) {
                return renderLoading();
            }

            if (editingTime) {
                return renderTimeEdit();
            }

            return renderTimer();
        };

        return (
            <Modal
                visible={visible}
                transparent
                animationType="fade"
                onRequestClose={handleClose}
            >
                <View style={styles.modalOverlay}>
                    <View style={[
                        styles.modalContent, 
                        editingTime && styles.timeEditModalContent
                    ]}>
                        {!editingTime && !isLoadingSound && (
                            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                                <View style={styles.closeButtonCircle}>
                                    <Ionicons name="close" size={20} color={color.mutedText} />
                                </View>
                            </TouchableOpacity>
                        )}

                        {renderContent()}
                    </View>
                </View>
            </Modal>
        );
    }
);

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: 'transparent',
        borderRadius: Radius.xl,
        alignItems: 'center',
        elevation: 8,
        width: '85%',
        maxWidth: 340,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        overflow: 'hidden',
    },
    timeEditModalContent: {
        backgroundColor: color.lightBackground,
        padding: Spacing.lg,
    },
    closeButton: {
        position: 'absolute',
        top: Spacing.md,
        right: Spacing.md,
        zIndex: 10,
    },
    closeButtonCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },

    // 计时器样式
    timerContainer: {
        width: '100%',
        alignItems: 'center',
        paddingVertical: Spacing.xl,
        paddingHorizontal: Spacing.lg,
    },
    timerDisplay: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    timerRing: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    timeDisplayCenter: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    timeText: {
        fontSize: 36,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 2,
    },
    timeUnit: {
        fontSize: FontSize.small,
        color: color.mutedText,
        fontWeight: '500',
    },
    presetContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginBottom: Spacing.lg,
        paddingHorizontal: Spacing.sm,
    },
    presetButton: {
        margin: Spacing.xs,
        borderRadius: Radius.md,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    presetButtonGradient: {
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 50,
    },
    activePresetButton: {
        elevation: 4,
        shadowOpacity: 0.2,
        shadowRadius: 6,
    },
    presetButtonText: {
        color: color.text,
        fontWeight: '600',
        fontSize: FontSize.body,
    },
    activePresetButtonText: {
        color: color.lightText,
        fontWeight: '700',
    },
    controlButtons: {
        flexDirection: 'row',
        width: '100%',
        marginBottom: Spacing.lg,
        paddingHorizontal: Spacing.sm,
    },
    controlButtonWrapper: {
        flex: 1,
        marginHorizontal: Spacing.xs,
        borderRadius: Radius.md,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
    },
    controlButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        minHeight: 48,
    },
    controlButtonText: {
        color: color.lightText,
        fontWeight: '700',
        marginLeft: Spacing.xs,
        fontSize: FontSize.body,
    },
    settingsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        paddingHorizontal: Spacing.lg,
    },
    settingButton: {
        marginHorizontal: Spacing.sm,
        borderRadius: Radius.md,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    settingButtonInner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
    },
    settingButtonText: {
        marginLeft: Spacing.xs,
        color: color.text,
        fontWeight: '600',
        fontSize: FontSize.small,
    },

    // 时间编辑样式
    timeInputContainer: {
        width: '100%',
        padding: Spacing.xl,
    },
    timeInputLabel: {
        fontSize: FontSize.h3,
        fontWeight: '700',
        marginBottom: Spacing.lg,
        textAlign: 'center',
        color: color.title,
    },
    timeInput: {
        borderWidth: 2,
        borderColor: color.primary,
        borderRadius: Radius.md,
        padding: Spacing.md,
        fontSize: FontSize.h3,
        textAlign: 'center',
        marginBottom: Spacing.lg,
        backgroundColor: color.lightBackground,
        fontWeight: '600',
    },
    timeInputButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    timeInputButton: {
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
        borderRadius: Radius.md,
        flex: 1,
        marginHorizontal: Spacing.xs,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    cancelButton: {
        backgroundColor: color.lightGray,
    },
    cancelButtonText: {
        color: color.text,
        fontWeight: '600',
    },
    confirmButton: {
        backgroundColor: color.success,
    },
    confirmButtonText: {
        color: color.lightText,
        fontWeight: '700',
    },

    // 加载样式
    loadingContainer: {
        padding: Spacing.xl,
        alignItems: 'center',
        backgroundColor: color.lightBackground,
        borderRadius: Radius.xl,
    },
    loadingText: {
        marginTop: Spacing.md,
        fontSize: FontSize.body,
        color: color.text,
        fontWeight: '500',
    },
});

export default CallTimer;