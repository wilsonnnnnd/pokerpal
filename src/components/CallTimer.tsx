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
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { logError } from '@/utils/useLogger';
import { Palette as color } from '@/constants';

/**
 * 德州扑克Call Timer组件的引用接口
 */
export interface CallTimerHandle {
    show: (initialSeconds?: number) => void;
    hide: () => void;
    showLauncher: () => void; // 新增：显示启动界面
    reset: (newDuration?: number) => void;
    pause: () => void;
    resume: () => void;
}

/**
 * 计时模式定义
 */
export interface TimerMode {
    id: string;
    name: string;
    duration: number;
    icon: string;
    color: string;
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
    /** 计时模式列表 */
    timerModes?: TimerMode[];
}

// 常量
const RADIUS = 40;
const STROKE_WIDTH = 8;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// 默认计时模式
const DEFAULT_TIMER_MODES: TimerMode[] = [
    {
        id: 'standard',
        name: '标准',
        duration: 30,
        icon: 'timer-outline',
    color: color.success
    },
    {
        id: 'fast',
        name: '快速',
        duration: 15,
        icon: 'flash-outline',
    color: color.warning
    },
    {
        id: 'long',
        name: '加长',
        duration: 60,
        icon: 'hourglass-outline',
    color: color.info
    },
    {
        id: 'custom',
        name: '自定义',
        duration: 0,
        icon: 'create-outline',
    color: color.primary
    }
];

/**
 * 德州扑克Call Timer组件
 * 集成启动选项和计时器功能
 */
const CallTimer = forwardRef<CallTimerHandle, CallTimerProps>(
    ({
        defaultDuration = 30,
        warningThreshold = 10,
        criticalThreshold = 5,
        onTimeUp = () => console.log('⏰ 时间到，触发默认操作'),
        onClose = () => { },
        presetTimes = [15, 30, 45, 60, 90],
        soundEnabled = true,
        vibrationEnabled = true,
        timerModes = DEFAULT_TIMER_MODES
    }, ref) => {
        // 模态框状态
        const [visible, setVisible] = useState(false);
        const [showLauncherUI, setShowLauncherUI] = useState(true);

        // 计时器状态
        const [secondsLeft, setSecondsLeft] = useState(defaultDuration);
        const [initialDuration, setInitialDuration] = useState(defaultDuration);
        const [running, setRunning] = useState(true);
        const [editingTime, setEditingTime] = useState(false);
        const [timeInput, setTimeInput] = useState('');
        const [customTimerValue, setCustomTimerValue] = useState('30');

        // 音效状态
        const [isLoadingSound, setIsLoadingSound] = useState(false);
        const [soundsLoaded, setSoundsLoaded] = useState(false);

        // 引用
        const intervalRef = useRef<NodeJS.Timeout | null>(null);
        const soundRef = useRef<Audio.Sound | null>(null);
        const warningRef = useRef<Audio.Sound | null>(null);
        const timeupRef = useRef<Audio.Sound | null>(null);

        // 暴露方法给父组件
        useImperativeHandle(ref, () => ({
            show: (initialSeconds?: number) => {
                const duration = initialSeconds || defaultDuration;
                setSecondsLeft(duration);
                setInitialDuration(duration);
                setVisible(true);
                setShowLauncherUI(false); // 直接显示计时器
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
            showLauncher: () => {
                setVisible(true);
                setShowLauncherUI(true);
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


                const _timeupSound = new Audio.Sound();
                await _timeupSound.loadAsync(require('../assets/sounds/clock-alarm.mp3'));
                timeupRef.current = _timeupSound;


                setSoundsLoaded(true);
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
                    await timeupRef.current.unloadAsync();
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
            if (running && secondsLeft > 0 && visible && !showLauncherUI) {
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
        }, [running, secondsLeft, visible, showLauncherUI, warningThreshold, criticalThreshold]);

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
                    await warningRef.current.setPositionAsync(0);
                    await warningRef.current.playAsync();
                } catch (error) {
                    logError('播放警告音效失败', error instanceof Error ? error.message : String(error));
                }
            }
        };

        // 播放滴答音效
        const playTickSound = async () => {
            if (soundEnabled && soundsLoaded && soundRef.current) {
                try {
                    await soundRef.current.setPositionAsync(0);
                    await soundRef.current.playAsync();
                } catch (error) {
                    logError('播放滴答音效失败', error instanceof Error ? error.message : String(error));
                }
            }
        };

        // 播放时间结束音效
        const playTimeupSound = async () => {
            if (soundEnabled && soundsLoaded && timeupRef.current) {
                try {
                    await timeupRef.current.setPositionAsync(0);
                    await timeupRef.current.playAsync();
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

        // 启动指定模式的计时器
        const startTimerMode = (mode: TimerMode) => {
            if (mode.id === 'custom') {
                // 显示自定义时间输入
                Alert.prompt(
                    '自定义时间',
                    '请输入计时时间（秒）',
                    [
                        {
                            text: '取消',
                            style: 'cancel'
                        },
                        {
                            text: '确定',
                            onPress: (value) => {
                                const seconds = parseInt(value || '30');
                                if (isNaN(seconds) || seconds <= 0 || seconds > 600) {
                                    Alert.alert('提示', '请输入1-600之间的有效时间（秒）');
                                    return;
                                }
                                setSecondsLeft(seconds);
                                setInitialDuration(seconds);
                                setShowLauncherUI(false);
                                setRunning(true);
                                if (soundEnabled && !soundsLoaded) {
                                    loadSounds();
                                }
                            }
                        }
                    ],
                    'plain-text',
                    customTimerValue,
                    'number-pad'
                );
            } else {
                // 启动预设模式
                setSecondsLeft(mode.duration);
                setInitialDuration(mode.duration);
                setShowLauncherUI(false);
                setRunning(true);
                if (soundEnabled && !soundsLoaded) {
                    loadSounds();
                }
            }
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

        // 关闭模态框
        const handleClose = () => {
            setVisible(false);
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            onClose();
        };

        // 返回启动界面
        const backToLauncher = () => {
            setShowLauncherUI(true);
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
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

        // 渲染启动器UI
        const renderLauncher = () => (
            <View style={styles.launcherContainer}>
                <Text style={styles.launcherTitle}>选择计时模式</Text>

                <View style={styles.timerModes}>
                    {timerModes.map(mode => (
                        <TouchableOpacity
                            key={mode.id}
                            style={[styles.timerModeButton, { backgroundColor: mode.color }]}
                            onPress={() => startTimerMode(mode)}
                        >
                            <Ionicons name={mode.icon as any} size={24} color={color.lightText} />
                            <Text style={styles.timerModeText}>{mode.name}</Text>
                            {mode.id !== 'custom' && (
                                <Text style={styles.timerModeDuration}>{mode.duration}秒</Text>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity
                    style={styles.closeButton}
                    onPress={handleClose}
                >
                    <Ionicons name="close" size={24} color={color.text} />
                </TouchableOpacity>
            </View>
        );

        // 渲染计时器UI
        const renderTimer = () => (
            <>
                <Svg height={100} width={100}>
                    <Circle
                        stroke={color.mediumGray}
                        fill="none"
                        cx="50"
                        cy="50"
                        r={RADIUS}
                        strokeWidth={STROKE_WIDTH}
                    />
                    <Circle
                        stroke={getTimeColor()}
                        fill="none"
                        cx="50"
                        cy="50"
                        r={RADIUS}
                        strokeWidth={STROKE_WIDTH}
                        strokeDasharray={`${CIRCUMFERENCE}, ${CIRCUMFERENCE}`}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        rotation="-90"
                        origin="50, 50"
                    />
                </Svg>

                <TouchableOpacity onPress={() => setEditingTime(true)}>
                    <Text style={[styles.timeText, { color: getTimeColor() }]}>
                        {formatTime(secondsLeft)}s
                    </Text>
                </TouchableOpacity>

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
                            <Text
                                style={[
                                    styles.presetButtonText,
                                    initialDuration === time && styles.activePresetButtonText
                                ]}
                            >
                                {time}s
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.controlButtons}>
                    <TouchableOpacity
                        style={[
                            styles.controlButton,
                            running ? styles.pauseButton : styles.resumeButton
                        ]}
                        onPress={() => setRunning(prev => !prev)}
                    >
                        <Ionicons
                            name={running ? "pause" : "play"}
                            size={24}
                            color={color.lightText}
                        />
                        <Text style={styles.controlButtonText}>
                            {running ? '暂停' : '继续'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.controlButton, styles.resetButton]}
                        onPress={() => {
                            setSecondsLeft(initialDuration);
                            setRunning(true);
                        }}
                    >
                        <Ionicons name="refresh" size={24} color={color.lightText} />
                        <Text style={styles.controlButtonText}>重置</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.settingsContainer}>
                    <TouchableOpacity
                        style={styles.settingButton}
                        onPress={() => addSeconds(5)}
                    >
                        <Ionicons name="add-circle-outline" size={22} color={color.title} />
                        <Text style={styles.settingButtonText}>+5秒</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.settingButton}
                        onPress={() => addSeconds(15)}
                    >
                        <Ionicons name="add-circle-outline" size={22} color={color.title} />
                        <Text style={styles.settingButtonText}>+15秒</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.settingButton}
                        onPress={backToLauncher}
                    >
                        <Ionicons name="apps-outline" size={22} color={color.title} />
                        <Text style={styles.settingButtonText}>模式</Text>
                    </TouchableOpacity>
                </View>
            </>
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

            if (showLauncherUI) {
                return renderLauncher();
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
                    <View style={[styles.modalContent, showLauncherUI && styles.launcherModalContent]}>
                        {!showLauncherUI && !editingTime && !isLoadingSound && (
                            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                                <Ionicons name="close" size={24} color={color.text} />
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
    backgroundColor: color.overlayDark,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
    backgroundColor: color.lightBackground,
        padding: 24,
        borderRadius: 20,
        alignItems: 'center',
        elevation: 5,
        width: '80%',
        maxWidth: 320,
    shadowColor: color.shadowDark,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
    },
    launcherModalContent: {
        padding: 16,
        width: '90%',
        maxWidth: 360,
    },
    closeButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 10,
        padding: 8,
    },

    // 启动器样式
    launcherContainer: {
        width: '100%',
        alignItems: 'center',
        padding: 16,
    },
    launcherTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: color.title,
        marginBottom: 20,
    },
    timerModes: {
        width: '100%',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    timerModeButton: {
        width: '48%',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: color.shadowDark,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    timerModeText: {
        color: color.lightText,
        fontWeight: 'bold',
        fontSize: 16,
        marginTop: 8,
    },
    timerModeDuration: {
        color: 'rgba(255,255,255,0.85)',
        marginTop: 4,
        fontSize: 14,
    },

    // 计时器样式
    timeText: {
        fontSize: 32,
        fontWeight: 'bold',
        marginTop: 12,
        marginBottom: 8,
        color: color.title,
    },
    presetContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginTop: 16,
        marginBottom: 8,
    },
    presetButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        margin: 4,
        borderRadius: 20,
        backgroundColor: color.lightGray,
        borderWidth: 1,
        borderColor: color.mediumGray,
    },
    activePresetButton: {
        backgroundColor: color.lightBackground,
        borderColor: color.info,
    },
    presetButtonText: {
        color: color.strongGray,
        fontWeight: '500',
    },
    activePresetButtonText: {
        color: color.info,
        fontWeight: 'bold',
    },
    controlButtons: {
        flexDirection: 'row',
        marginTop: 20,
        justifyContent: 'space-between',
        width: '100%',
    },
    controlButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        flex: 1,
        marginHorizontal: 5,
    },
    pauseButton: {
        backgroundColor: color.warning,
    },
    resumeButton: {
        backgroundColor: color.success,
    },
    resetButton: {
        backgroundColor: color.strongGray,
    },
    controlButtonText: {
        color: color.lightText,
        fontWeight: 'bold',
        marginLeft: 6,
    },
    settingsContainer: {
        flexDirection: 'row',
        marginTop: 16,
        justifyContent: 'center',
    },
    settingButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        marginHorizontal: 8,
    },
    settingButtonText: {
        marginLeft: 4,
        color: color.strongGray,
    },

    // 时间编辑样式
    timeInputContainer: {
        width: '100%',
        padding: 20,
    },
    timeInputLabel: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    timeInput: {
        borderWidth: 1,
        borderColor: color.mediumGray,
        borderRadius: 8,
        padding: 12,
        fontSize: 20,
        textAlign: 'center',
        marginBottom: 16,
    },
    timeInputButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    timeInputButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        flex: 1,
        marginHorizontal: 5,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: color.lightGray,
    },
    cancelButtonText: {
        color: color.strongGray,
        fontWeight: '500',
    },
    confirmButton: {
        backgroundColor: color.success,
    },
    confirmButtonText: {
        color: color.lightText,
        fontWeight: 'bold',
    },

    // 加载样式
    loadingContainer: {
        padding: 30,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: color.text,
    },
});

export default CallTimer;