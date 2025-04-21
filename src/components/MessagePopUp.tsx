import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { PrimaryButton } from '@/components/PrimaryButton';
import { MsgPopUpProps } from '@/types';

const MsgPopUp: React.FC<MsgPopUpProps> = ({
    title,
    message,
    note,
    isWarning,
    onConfirm,
    onCancel,
    isVisible = true, // 添加控制可见性的prop
}) => {
    // 使用Animated值来控制动画效果
    const fadeAnim = useRef(new Animated.Value(0)).current;
    
    // 当isVisible改变时运行动画
    useEffect(() => {
        if (isVisible) {
            // 显示动画
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        } else {
            // 隐藏动画
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [isVisible]);

    // 处理确认操作
    const handleConfirm = () => {
        // 直接调用onConfirm回调
        // 不再内部处理可见性状态
        if (onConfirm) {
            onConfirm();
        }
    };

    // 处理取消操作
    const handleCancel = () => {
        // 直接调用onCancel回调
        // 不再内部处理可见性状态
        if (onCancel) {
            onCancel();
        }
    };

    // 如果不可见，则返回null
    if (!isVisible) {
        return null;
    }
    
    return (
        <View style={styles.overlay}>
            <Animated.View 
                style={[
                    styles.popup, 
                    { 
                        opacity: fadeAnim, 
                        transform: [{ scale: fadeAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.9, 1]
                        }) }] 
                    }
                ]}
            >
                {/* 标题区域 */}
                <View style={styles.titleContainer}>
                    <Text style={[styles.title, isWarning && styles.warningTitle]}>{title}</Text>
                </View>
                
                {/* 分隔线 */}
                <View style={styles.divider} />
                
                {/* 消息区域 */}
                <View style={styles.messageContainer}>
                    <Text style={styles.text}>{message}</Text>
                </View>
                
                {/* 备注区域 - 仅在有note时渲染 */}
                {note && (
                    <View style={styles.noteContainer}>
                        <Text style={styles.note}>
                            <Text style={styles.noteLabel}>注意: </Text>
                            {note}
                        </Text>
                    </View>
                )}
                
                {/* 按钮区域 */}
                <View style={styles.buttonContainer}>
                    <TouchableOpacity 
                        style={[styles.button, styles.cancelButton]} 
                        onPress={handleCancel}
                        activeOpacity={0.7} // 优化点按反馈
                    >
                        <Text style={styles.cancelButtonText}>取消</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={[
                            styles.button, 
                            isWarning ? styles.warningButton : styles.confirmButton
                        ]} 
                        onPress={handleConfirm}
                        activeOpacity={0.7} // 优化点按反馈
                    >
                        <Text style={[
                            styles.confirmButtonText,
                            isWarning && styles.warningButtonText
                        ]}>确认</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    popup: {
        backgroundColor: 'white',
        borderRadius: 14, // 增加圆角
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 10, // 增强Android阴影效果
        width: '85%',
        maxWidth: 400,
        overflow: 'hidden',
    },
    titleContainer: {
        paddingVertical: 18,
        paddingHorizontal: 24,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
        color: '#333333',
    },
    warningTitle: {
        color: '#e74c3c',
    },
    divider: {
        height: 1,
        backgroundColor: '#EEEEEE',
        width: '100%',
    },
    messageContainer: {
        paddingVertical: 24,
        paddingHorizontal: 24,
    },
    text: {
        fontSize: 16,
        lineHeight: 24, // 增加行高改善可读性
        textAlign: 'center',
        color: '#555555',
    },
    noteContainer: {
        paddingHorizontal: 24,
        paddingBottom: 20,
    },
    note: {
        fontSize: 14,
        lineHeight: 20, // 增加行高
        textAlign: 'center',
        color: '#666666',
    },
    noteLabel: {
        fontWeight: 'bold',
        color: '#e74c3c',
    },
    buttonContainer: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#EEEEEE',
    },
    button: {
        flex: 1,
        paddingVertical: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#FFFFFF',
        borderRightWidth: 0.5,
        borderRightColor: '#EEEEEE',
    },
    confirmButton: {
        backgroundColor: '#FFFFFF',
        borderLeftWidth: 0.5,
        borderLeftColor: '#EEEEEE',
    },
    warningButton: {
        backgroundColor: '#FFFFFF',
        borderLeftWidth: 0.5,
        borderLeftColor: '#EEEEEE',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#95a5a6',
    },
    confirmButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#007BFF',
    },
    warningButtonText: {
        color: '#e74c3c', // 修复警告按钮文本颜色
    },
});

export default MsgPopUp;