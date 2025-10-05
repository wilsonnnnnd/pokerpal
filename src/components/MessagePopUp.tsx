import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Modal } from 'react-native';
import { PrimaryButton } from '@/components/PrimaryButton';
import { MsgPopUpProps } from '@/types';
import { Palette as color } from '@/constants';
import { MessageStyles } from '@/assets/styles';

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
        <Modal
            visible={isVisible}
            transparent
            animationType="none"
            statusBarTranslucent
        >
            <View style={MessageStyles.overlay}>
                <Animated.View
                    style={[
                        MessageStyles.popup,
                        {
                            opacity: fadeAnim,
                            transform: [{
                                scale: fadeAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0.9, 1]
                                })
                            }]
                        }
                    ]}
                >
                    {/* 标题区域 */}
                    <View style={MessageStyles.titleContainer}>
                        <Text style={[MessageStyles.title, isWarning && MessageStyles.warningTitle]}>{title}</Text>
                    </View>

                    {/* 分隔线 */}
                    <View style={MessageStyles.divider} />

                    {/* 消息区域 */}
                    <View style={MessageStyles.messageContainer}>
                        <Text style={MessageStyles.text}>{message}</Text>
                    </View>

                    {/* 备注区域 - 仅在有note时渲染 */}
                    {note && (
                        <View style={MessageStyles.noteContainer}>
                            <Text style={MessageStyles.note}>
                                <Text style={MessageStyles.noteLabel}>注意: </Text>
                                {note}
                            </Text>
                        </View>
                    )}

                    {/* 按钮区域 */}
                    <View style={MessageStyles.buttonContainer}>
                        <TouchableOpacity
                            style={[MessageStyles.button, MessageStyles.cancelButton]}
                            onPress={handleCancel}
                            activeOpacity={0.7} // 优化点按反馈
                        >
                            <Text style={MessageStyles.cancelButtonText}>取消</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                MessageStyles.button,
                                isWarning ? MessageStyles.warningButton : MessageStyles.confirmButton
                            ]}
                            onPress={handleConfirm}
                            activeOpacity={0.7} // 优化点按反馈
                        >
                            <Text style={[
                                MessageStyles.confirmButtonText,
                                isWarning && MessageStyles.warningButtonText
                            ]}>确认</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};


export default MsgPopUp;