import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { PrimaryButton } from '@/components/PrimaryButton';
import { MsgPopUpProps } from '@/types';
import { Palette as color } from '@/constants';

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
        backgroundColor: color.overlayDark,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    popup: {
    backgroundColor: color.lightBackground,
    borderRadius: 14, // 增加圆角
    shadowColor: color.shadowDark,
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
        color: color.title,
    },
    warningTitle: { color: color.error },
    divider: { height: 1, backgroundColor: color.mediumGray, width: '100%' },
    messageContainer: {
        paddingVertical: 24,
        paddingHorizontal: 24,
    },
    text: { fontSize: 16, lineHeight: 24, textAlign: 'center', color: color.strongGray },
    noteContainer: {
        paddingHorizontal: 24,
        paddingBottom: 20,
    },
    note: { fontSize: 14, lineHeight: 20, textAlign: 'center', color: color.text },
    noteLabel: { fontWeight: 'bold', color: color.error },
    buttonContainer: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: color.mediumGray },
    button: {
        flex: 1,
        paddingVertical: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelButton: { backgroundColor: color.lightBackground, borderRightWidth: 0.5, borderRightColor: color.mediumGray },
    confirmButton: { backgroundColor: color.lightBackground, borderLeftWidth: 0.5, borderLeftColor: color.mediumGray },
    warningButton: { backgroundColor: color.lightBackground, borderLeftWidth: 0.5, borderLeftColor: color.mediumGray },
    cancelButtonText: { fontSize: 16, fontWeight: '600', color: color.mutedText },
    confirmButtonText: { fontSize: 16, fontWeight: '600', color: color.confirm },
    warningButtonText: { color: color.cancel },
});

export default MsgPopUp;