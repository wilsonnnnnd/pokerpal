import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing, Vibration } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Palette as color } from '@/constants';
import { Spacing, Radius, FontSize, Elevation } from '@/constants/designTokens';
import { Gradients } from '@/constants/gradients';
import * as Haptics from 'expo-haptics';
import { DecisionWheelStyles } from '@/assets/styles';
import { DecisionWheelProps, OPTIONS } from '@/types';


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
            style={DecisionWheelStyles.container}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        >
            <TouchableOpacity style={DecisionWheelStyles.closeButton} onPress={onClose}>
                <MaterialCommunityIcons name="close" size={24} color={color.lightText} />
            </TouchableOpacity>
            
            <View style={DecisionWheelStyles.content}>
                <Text style={DecisionWheelStyles.title}>德州扑克决策转盘</Text>

                <View style={DecisionWheelStyles.wheelContainer}>
                    <Animated.View 
                        style={[
                            DecisionWheelStyles.wheel, 
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
                            style={[DecisionWheelStyles.half, DecisionWheelStyles.leftHalf]}
                        >
                            <Text style={DecisionWheelStyles.optionText}>CALL</Text>
                        </LinearGradient>
                        <LinearGradient
                            colors={['#f44336', '#d32f2f']}
                            style={[DecisionWheelStyles.half, DecisionWheelStyles.rightHalf]}
                        >
                            <Text style={DecisionWheelStyles.optionText}>FOLD</Text>
                        </LinearGradient>
                        <LinearGradient
                            colors={['#2c3e50', '#34495e']}
                            style={DecisionWheelStyles.wheelCenter}
                        >
                            <MaterialCommunityIcons name="cards-playing-outline" size={30} color={color.lightText} />
                        </LinearGradient>
                    </Animated.View>

                    <View style={DecisionWheelStyles.arrowContainer}>
                        <Ionicons name="caret-up" size={40} color={color.lightText} />
                    </View>
                </View>

                <View style={DecisionWheelStyles.buttonContainer}>
                    <TouchableOpacity 
                        style={[DecisionWheelStyles.button, DecisionWheelStyles.spinButton]} 
                        onPress={spinWheel} 
                        disabled={spinning}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={spinning ? Gradients[5] : ['#2196F3', '#1976D2']}
                            style={DecisionWheelStyles.buttonGradient}
                        >
                            <MaterialCommunityIcons 
                                name={spinning ? "loading" : "rotate-360"} 
                                size={20} 
                                color={color.lightText} 
                            />
                            <Text style={DecisionWheelStyles.buttonText}>
                                {spinning ? '转动中...' : '开始旋转'}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {showResult && (
                    <Animated.View 
                        style={[
                            DecisionWheelStyles.resultContainer,
                            { 
                                transform: [{ scale: scaleAnim }],
                                opacity: fadeAnim,
                            }
                        ]}
                    >
                        <LinearGradient
                            colors={decision === 'CALL' ? ['#E8F5E8', '#D4EDDA'] : ['#F8D7DA', '#F5C6CB']}
                            style={DecisionWheelStyles.resultGradient}
                        >
                            <MaterialCommunityIcons 
                                name={decision === 'CALL' ? "check-circle" : "close-circle"}
                                size={36}
                                color={decision === 'CALL' ? color.success : color.error}
                                style={{ marginBottom: Spacing.sm }}
                            />
                            <Text style={DecisionWheelStyles.decisionResult}>决策结果</Text>
                            <Text style={[
                                DecisionWheelStyles.decisionText,
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
