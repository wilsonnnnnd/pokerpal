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
import { useAudioPlayer, useAudioRecorder, setAudioModeAsync, RecordingPresets, AudioModule } from 'expo-audio';
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
        onTimeUp = () => console.log('⏰ 时间到，触发默认操作'),
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
    const soundRef = useRef<any | null>(null);
    const warningRef = useRef<any | null>(null);
    const timeupRef = useRef<any | null>(null);

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

        // 加载音效
        const loadSounds = async () => {
            if (soundsLoaded) return;

            try {
                setIsLoadingSound(true);

                // try expo-audio AudioModule first if available
                let _timeupSound: any = null;
                try {
                    if (AudioModule && (AudioModule as any).loadAsync) {
                        // Some builds may expose a loadAsync on AudioModule
                        _timeupSound = await (AudioModule as any).loadAsync(require('../assets/sounds/clock-alarm.mp3'));
                    } else if (AudioModule && (AudioModule as any).createSound) {
                        _timeupSound = await (AudioModule as any).createSound(require('../assets/sounds/clock-alarm.mp3'));
                    }
                } catch (e) {
                    _timeupSound = null;
                }

                // fallback to expo-av dynamically
                if (!_timeupSound) {
                    try {
                        // eslint-disable-next-line global-require
                        const { Audio: AVAudio } = require('expo-av');
                        _timeupSound = new AVAudio.Sound();
                        await _timeupSound.loadAsync(require('../assets/sounds/clock-alarm.mp3'));
                    } catch (err) {
                        logError('加载音效失败 (expo-av fallback)', err instanceof Error ? err.message : String(err));
                        _timeupSound = null;
                    }
                }

                timeupRef.current = _timeupSound;
                setSoundsLoaded(Boolean(_timeupSound));
            } catch (error) {
                logError('加载音效失败', error instanceof Error ? error.message : String(error));
            } finally {
                setIsLoadingSound(false);
            }
        };

        // 卸载音效
        const unloadSounds = async () => {
            try {
                if (timeupRef.current) {
                    try {
                        if (typeof timeupRef.current.unloadAsync === 'function') {
                            await timeupRef.current.unloadAsync();
                        } else if (typeof timeupRef.current.release === 'function') {
                            await timeupRef.current.release();
                        }
                    } catch (e) {
                        // ignore unload errors
                    }
                    timeupRef.current = null;
                }
                setSoundsLoaded(false);
            } catch (error) {
                logError('卸载音效失败', error instanceof Error ? error.message : String(error));
            }
        };

        // 组件卸载时清理
        useEffect(() => {
            return () => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
                unloadSounds();
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
                            playTimeupSound();
                            triggerHapticFeedback('heavy');
                            return 0;
                        }

                        // 在警告阈值时播放提示音
                        if (prev === warningThreshold + 1) {
                            playWarningSound();
                            triggerHapticFeedback('medium');
                        }

                        // 在紧急阈值内每秒播放滴答声
                        if (prev <= criticalThreshold + 1) {
                            playTickSound();
                            triggerHapticFeedback('light');
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

        // 播放警告音效
        const playWarningSound = async () => {
            if (soundEnabled && soundsLoaded && warningRef.current) {
                try {
                    if (typeof warningRef.current.setPositionAsync === 'function') {
                        await warningRef.current.setPositionAsync(0);
                    }
                    if (typeof warningRef.current.playAsync === 'function') {
                        await warningRef.current.playAsync();
                    } else if (typeof warningRef.current.play === 'function') {
                        await warningRef.current.play();
                    }
                } catch (error) {
                    logError('播放警告音效失败', error instanceof Error ? error.message : String(error));
                }
            }
        };

        // 播放滴答音效
        const playTickSound = async () => {
            if (soundEnabled && soundsLoaded && soundRef.current) {
                try {
                    if (typeof soundRef.current.setPositionAsync === 'function') {
                        await soundRef.current.setPositionAsync(0);
                    }
                    if (typeof soundRef.current.playAsync === 'function') {
                        await soundRef.current.playAsync();
                    } else if (typeof soundRef.current.play === 'function') {
                        await soundRef.current.play();
                    }
                } catch (error) {
                    logError('播放滴答音效失败', error instanceof Error ? error.message : String(error));
                }
            }
        };

        // 播放时间结束音效
        const playTimeupSound = async () => {
            if (soundEnabled && soundsLoaded && timeupRef.current) {
                try {
                    if (typeof timeupRef.current.setPositionAsync === 'function') {
                        await timeupRef.current.setPositionAsync(0);
                    }
                    if (typeof timeupRef.current.playAsync === 'function') {
                        await timeupRef.current.playAsync();
                    } else if (typeof timeupRef.current.play === 'function') {
                        await timeupRef.current.play();
                    }
                } catch (error) {
                    logError('播放结束音效失败', error instanceof Error ? error.message : String(error));
                }
            }
        };

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
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            break;
                        case 'heavy':
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            break;
                    }
                } else {
                    // Android使用振动API
                    switch (intensity) {
                        case 'light':
                            Vibration.vibrate(50);
                            break;
                        case 'medium':
                            Vibration.vibrate(100);
                            break;
                        case 'heavy':
                            Vibration.vibrate([0, 250, 100, 250]);
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
                        onPress={() => setRunning(prev => !prev)}
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
    launcherModalContent: {
        width: '90%',
        maxWidth: 380,
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

    // 启动器样式
    launcherContainer: {
        width: '100%',
        paddingVertical: Spacing.xl,
        paddingHorizontal: Spacing.lg,
    },
    launcherHeader: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    iconWrapper: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.md,
        shadowColor: color.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    launcherTitle: {
        fontSize: FontSize.h2,
        fontWeight: '700',
        color: color.title,
        marginBottom: Spacing.xs,
    },
    launcherSubtitle: {
        fontSize: FontSize.body,
        color: color.mutedText,
        textAlign: 'center',
        fontWeight: '500',
    },
    timerModes: {
        width: '100%',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: Spacing.lg,
    },
    timerModeButton: {
        width: '48%',
        marginBottom: Spacing.md,
        borderRadius: Radius.md,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
    },
    timerModeGradient: {
        padding: Spacing.lg,
        alignItems: 'center',
        minHeight: 100,
        justifyContent: 'center',
    },
    timerModeIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.sm,
    },
    timerModeText: {
        color: color.lightText,
        fontWeight: '700',
        fontSize: FontSize.h3,
        marginBottom: Spacing.xs,
    },
    timerModeDuration: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: FontSize.small,
        fontWeight: '500',
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

    // 时间编辑样式 (保持原有但优化)
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