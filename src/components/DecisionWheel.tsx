import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing, Vibration } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Palette as color } from '@/constants';
import { Spacing, Radius, FontSize, Elevation } from '@/constants/designTokens';
import { Gradients } from '@/constants/gradients';
import * as Haptics from 'expo-haptics';

const OPTIONS = ['CALL', 'FOLD'];

interface DecisionWheelProps {
    onClose: () => void;
}

export default function DecisionWheel({ onClose }: DecisionWheelProps) {
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const [decision, setDecision] = useState('');
    const [spinning, setSpinning] = useState(false);
    const [showResult, setShowResult] = useState(false);
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    
    // 当转盘停止时的脉动动画
    useEffect(() => {
        if (decision) {
            // 结果卡片淡入动画
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }).start();
            
            // 脉动动画
            Animated.loop(
                Animated.sequence([
                    Animated.timing(scaleAnim, {
                        toValue: 1.08,
                        duration: 800,
                        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
                        useNativeDriver: true,
                    }),
                    Animated.timing(scaleAnim, {
                        toValue: 1,
                        duration: 800,
                        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            scaleAnim.setValue(1);
            fadeAnim.setValue(0);
        }
    }, [decision]);
    
    const spinWheel = () => {
        if (spinning) return;

        // 触觉反馈
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch (e) {
            // 降级到普通振动
            Vibration.vibrate(50);
        }

        setSpinning(true);
        setDecision('');
        setShowResult(false);

        // 转盘旋转圈数和随机角度
        const spinDegrees = 360 * 6 + Math.floor(Math.random() * 360);
        
        Animated.timing(rotateAnim, {
            toValue: spinDegrees,
            duration: 3500,
            easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
            useNativeDriver: true,
        }).start(() => {
            const finalDeg = spinDegrees % 360;
            const index = finalDeg < 180 ? 0 : 1; // Half-half for 2 options
            
            // 触觉反馈表示结束
            try {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (e) {
                Vibration.vibrate([100, 50, 100]);
            }
            
            setDecision(OPTIONS[index]);
            setShowResult(true);
            rotateAnim.setValue(0);
            setSpinning(false);
        });
    };

    const spinInterpolate = rotateAnim.interpolate({
        inputRange: [0, 360],
        outputRange: ['0deg', '360deg'],
    });



    return (
        <LinearGradient
            colors={Gradients[0]}
            style={styles.container}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        >
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <MaterialCommunityIcons name="close" size={24} color={color.lightText} />
            </TouchableOpacity>
            
            <View style={styles.content}>
                <Text style={styles.title}>德州扑克决策转盘</Text>

                <View style={styles.wheelContainer}>
                    <Animated.View 
                        style={[
                            styles.wheel, 
                            { 
                                transform: [
                                    { rotate: spinInterpolate },
                                    { scale: decision ? scaleAnim : 1 }
                                ] 
                            }
                        ]}
                    >
                        <LinearGradient
                            colors={['#4CAF50', '#45a049']}
                            style={[styles.half, styles.leftHalf]}
                        >
                            <Text style={styles.optionText}>CALL</Text>
                        </LinearGradient>
                        <LinearGradient
                            colors={['#f44336', '#d32f2f']}
                            style={[styles.half, styles.rightHalf]}
                        >
                            <Text style={styles.optionText}>FOLD</Text>
                        </LinearGradient>
                        <LinearGradient
                            colors={['#2c3e50', '#34495e']}
                            style={styles.wheelCenter}
                        >
                            <MaterialCommunityIcons name="cards-playing-outline" size={30} color={color.lightText} />
                        </LinearGradient>
                    </Animated.View>

                    <View style={styles.arrowContainer}>
                        <Ionicons name="caret-up" size={40} color={color.lightText} />
                    </View>
                </View>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity 
                        style={[styles.button, styles.spinButton]} 
                        onPress={spinWheel} 
                        disabled={spinning}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={spinning ? Gradients[5] : ['#2196F3', '#1976D2']}
                            style={styles.buttonGradient}
                        >
                            <MaterialCommunityIcons 
                                name={spinning ? "loading" : "rotate-360"} 
                                size={20} 
                                color={color.lightText} 
                            />
                            <Text style={styles.buttonText}>
                                {spinning ? '转动中...' : '开始旋转'}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {showResult && (
                    <Animated.View 
                        style={[
                            styles.resultContainer,
                            { 
                                transform: [{ scale: scaleAnim }],
                                opacity: fadeAnim,
                            }
                        ]}
                    >
                        <LinearGradient
                            colors={decision === 'CALL' ? ['#E8F5E8', '#D4EDDA'] : ['#F8D7DA', '#F5C6CB']}
                            style={styles.resultGradient}
                        >
                            <MaterialCommunityIcons 
                                name={decision === 'CALL' ? "check-circle" : "close-circle"}
                                size={36}
                                color={decision === 'CALL' ? color.success : color.error}
                                style={{ marginBottom: Spacing.sm }}
                            />
                            <Text style={styles.decisionResult}>决策结果</Text>
                            <Text style={[
                                styles.decisionText,
                                { color: decision === 'CALL' ? color.success : color.error }
                            ]}>
                                {decision}
                            </Text>
                        </LinearGradient>
                    </Animated.View>
                )}
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
    },
    content: {
        flex: 1,
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    title: {
        fontSize: FontSize.h1,
        fontWeight: 'bold',
        color: color.valueText,
        textShadowColor: color.shadowLight,
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
        marginBottom: Spacing.lg,
        textAlign: 'center',
    },
    wheelContainer: {
        alignItems: 'center',
        marginVertical: Spacing.xl,
    },
    wheel: {
        width: 280,
        height: 280,
        borderRadius: 140,
        overflow: 'hidden',
        borderWidth: 6,
        borderColor: color.lightText,
        flexDirection: 'row',
        elevation: Elevation.overlay,
        shadowColor: color.shadowDark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        position: 'relative',
    },
    half: {
        width: '50%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    leftHalf: {
        // Gradient applied inline
    },
    rightHalf: {
        // Gradient applied inline  
    },
    optionText: {
        fontSize: FontSize.h2,
        color: color.lightText,
        fontWeight: 'bold',
        textShadowColor: color.shadowDark,
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
    wheelCenter: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 70,
        height: 70,
        marginLeft: -35,
        marginTop: -35,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: Elevation.card,
        borderWidth: 3,
        borderColor: color.lightText,
    },
    arrowContainer: {
        position: 'absolute',
        top: -30,
        elevation: Elevation.overlay,
        shadowColor: color.shadowDark,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
    },
    closeButton: {
        position: 'absolute',
        top: 50,
        right: Spacing.xl,
        zIndex: 10,
        backgroundColor: color.shadowDark,
        borderRadius: Radius.xl,
        padding: Spacing.md,
        elevation: Elevation.card,
    },
    buttonContainer: {
        width: '100%',
        alignItems: 'center',
        marginTop: Spacing.xl,
    },
    button: {
        borderRadius: Radius.xl,
        elevation: Elevation.card,
        shadowColor: color.shadowDark,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        overflow: 'hidden',
    },
    spinButton: {
        minWidth: 200,
    },
    buttonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing.xl,
    },
    buttonText: {
        color: color.lightText,
        fontWeight: 'bold',
        fontSize: FontSize.body,
        marginLeft: Spacing.sm,
    },
    resultContainer: {
        marginTop: Spacing.xl,
        width: '85%',
        borderRadius: Radius.lg,
        overflow: 'hidden',
        elevation: Elevation.overlay,
        shadowColor: color.shadowDark,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        borderWidth: 2,
        borderColor: color.lightText,
    },
    resultGradient: {
        paddingVertical: Spacing.xl,
        paddingHorizontal: Spacing.lg,
        alignItems: 'center',
    },
    decisionResult: {
        fontSize: FontSize.h3,
        fontWeight: '600',
        color: color.valueText,
        marginBottom: Spacing.sm,
    },
    decisionText: {
        fontSize: 42,
        fontWeight: 'bold',
        color: color.valueText,
        textShadowColor: color.shadowLight,
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    }
});