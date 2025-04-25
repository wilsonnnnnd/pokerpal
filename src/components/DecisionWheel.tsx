import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing, Vibration } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
    
    // 当转盘停止时的脉动动画
    useEffect(() => {
        if (decision) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(scaleAnim, {
                        toValue: 1.05,
                        duration: 700,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scaleAnim, {
                        toValue: 1,
                        duration: 700,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            scaleAnim.setValue(1);
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
        const spinDegrees = 360 * 5 + Math.floor(Math.random() * 360);
        
        Animated.timing(rotateAnim, {
            toValue: spinDegrees,
            duration: 3000,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start(() => {
            const finalDeg = spinDegrees % 360;
            const index = finalDeg < 180 ? 0 : 1; // Half-half for 2 options
            
            // 触觉反馈表示结束
            try {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (e) {
                Vibration.vibrate(150);
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
            colors={['#1a2a6c', '#b21f1f', '#fdbb2d']}
            style={styles.container}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        >
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <MaterialCommunityIcons name="close" size={24} color="#fff" />
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
                        <View style={[styles.half, styles.leftHalf]}>
                            <Text style={styles.optionText}>CALL</Text>
                        </View>
                        <View style={[styles.half, styles.rightHalf]}>
                            <Text style={styles.optionText}>FOLD</Text>
                        </View>
                        <View style={styles.wheelCenter}>
                            <MaterialCommunityIcons name="cards-playing-outline" size={30} color="#fff" />
                        </View>
                    </Animated.View>

                    <View style={styles.arrowContainer}>
                        <Ionicons name="caret-up" size={40} color="#fff" />
                    </View>
                </View>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity 
                        style={[styles.button, styles.spinButton]} 
                        onPress={spinWheel} 
                        disabled={spinning}
                        activeOpacity={0.8}
                    >
                        <MaterialCommunityIcons name="rotate-360" size={20} color="#fff" />
                        <Text style={styles.buttonText}>{spinning ? '转动中...' : '开始旋转'}</Text>
                    </TouchableOpacity>
                </View>

                {showResult && (
                    <Animated.View 
                        style={[
                            styles.resultContainer,
                            { transform: [{ scale: scaleAnim }] }
                        ]}
                    >
                        <LinearGradient
                            colors={['#4c669f', '#3b5998', '#192f6a']}
                            style={styles.resultGradient}
                        >
                            <Text style={styles.decisionResult}>决策结果</Text>
                            <Text style={styles.decisionText}>{decision}</Text>
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
        padding: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        textShadowColor: 'rgba(0, 0, 0, 0.4)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 4,
        marginBottom: 20,
    },
    wheelContainer: {
        alignItems: 'center',
        marginVertical: 20,
    },
    wheel: {
        width: 250,
        height: 250,
        borderRadius: 125,
        overflow: 'hidden',
        borderWidth: 5,
        borderColor: '#ddd',
        backgroundColor: '#fff',
        flexDirection: 'row',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        position: 'relative',
    },
    half: {
        width: '50%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    leftHalf: {
        backgroundColor: '#4caf50',
    },
    rightHalf: {
        backgroundColor: '#f44336',
    },
    segment: {
        backgroundColor: '#4caf50',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 80,
    },
    optionText: {
        fontSize: 22,
        color: '#fff',
        fontWeight: 'bold',
        textShadowColor: 'rgba(0, 0, 0, 0.4)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    wheelCenter: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 60,
        height: 60,
        marginLeft: -30,
        marginTop: -30,
        borderRadius: 30,
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
    },
    arrowContainer: {
        position: 'absolute',
        top: -25,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
    closeButton: {
        position: 'absolute',
        top: 20,
        right: 20,
        zIndex: 10,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 20,
        padding: 8,
    },
    buttonContainer: {
        width: '100%',
        alignItems: 'center',
        marginTop: 30,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 25,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
    spinButton: {
        backgroundColor: '#3a7bd5',
        minWidth: 180,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
        marginLeft: 8,
    },
    resultContainer: {
        marginTop: 20,
        width: '80%',
        borderRadius: 15,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    resultGradient: {
        paddingVertical: 20,
        paddingHorizontal: 15,
        alignItems: 'center',
    },
    decisionResult: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 5,
    },
    decisionText: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#fff',
        textShadowColor: 'rgba(0, 0, 0, 0.4)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 4,
    }
});