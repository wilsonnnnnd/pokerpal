import React from 'react';
import {
    Pressable,
    Text,
    StyleSheet,
    ActivityIndicator,
    View
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PrimaryButtonProps } from '@/types';
import { Palette as color } from '@/constants';
import { Button, Spacing, FontSize, Radius } from '@/constants/designTokens';

export const PrimaryButton = ({
    title,
    onPress,
    style,
    textStyle,
    icon,
    iconColor = color.lightText,
    iconSize = 18,
    iconPosition = 'left',
    disabled = false,
    loading = false,
    loadingColor,
    variant = 'filled',
    size = 'medium',
    rounded = false,
    fullWidth = false
}: PrimaryButtonProps) => {

    const getVariantStyle = () => {
        switch (variant) {
            case 'outlined':
                return styles.outlinedButton;
            case 'text':
                return styles.textButton;
            case 'filled':
            default:
                return styles.filledButton;
        }
    };

    const getVariantTextStyle = () => {
        switch (variant) {
            case 'outlined':
            case 'text':
                return styles.darkText;
            case 'filled':
            default:
                return styles.lightText;
        }
    };

    const getSizeStyle = () => {
        switch (size) {
            case 'small':
                return styles.smallButton;
            case 'large':
                return styles.largeButton;
            case 'medium':
            default:
                return styles.mediumButton;
        }
    };

    const getSizeTextStyle = () => {
        switch (size) {
            case 'small':
                return styles.smallText;
            case 'large':
                return styles.largeText;
            case 'medium':
            default:
                return styles.mediumText;
        }
    };

    const renderIcon = () => {
        if (!icon) return null;

        return (
            <MaterialCommunityIcons
                name={icon}
                size={iconSize || (size === 'small' ? 14 : size === 'large' ? 22 : 18)}
                color={iconColor}
                style={[
                    iconPosition === 'left' ? styles.iconLeft : styles.iconRight
                ]}
            />
        );
    };

    // 获取涟漪颜色
    const getRippleColor = () => {
        if (disabled) return 'rgba(0,0,0,0.05)';
        switch (variant) {
            case 'outlined':
            case 'text':
                return color.primary + '22'; // semi-transparent primary
            case 'filled':
            default:
                return 'rgba(255, 255, 255, 0.2)';
        }
    };

    return (
        <Pressable
            style={({pressed}) => [
                styles.button,
                getVariantStyle(),
                getSizeStyle(),
                rounded && styles.rounded,
                fullWidth && styles.fullWidth,
                disabled && styles.disabledButton,
                pressed && !disabled && styles.buttonPressed,
                style
            ]}
            onPress={onPress}
            disabled={disabled || loading}
            android_ripple={{
                color: getRippleColor(),
                borderless: false,
                radius: -1
            }}
        >
            {loading ? (
                    <ActivityIndicator size="small" color={loadingColor || (variant === 'filled' ? color.lightText : color.primary)} style={styles.loader} />
            ) : (
                <View style={styles.contentContainer}>
                    {iconPosition === 'left' && renderIcon()}
                    <Text
                        style={[
                            styles.buttonText,
                            getVariantTextStyle(),
                            getSizeTextStyle(),
                            disabled && styles.disabledText,
                            textStyle
                        ]}
                    >
                        {title}
                    </Text>
                    {iconPosition === 'right' && renderIcon()}
                </View>
            )}
        </Pressable>
    );
};

const styles = StyleSheet.create({
    button: {
        borderRadius: Button.radius,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        overflow: 'hidden', // 确保涟漪效果不会超出按钮边界
    },
    contentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        fontWeight: '600',
        textAlign: 'center',
    },
    iconLeft: {
        marginRight: 8,
    },
    iconRight: {
        marginLeft: 8,
    },
    // 按压效果
    buttonPressed: {
        opacity: 0.85,
        transform: [{scale: 0.98}]
    },
    // 变体样式
    filledButton: {
    backgroundColor: color.primary,
    borderWidth: 0,
    shadowColor: color.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    outlinedButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: color.primary,
    },
    textButton: {
        backgroundColor: 'transparent',
        borderWidth: 0,
        paddingHorizontal: 8,
    },
    // 尺寸样式
    smallButton: {
        paddingVertical: Math.max(6, Button.paddingVertical - 8),
        paddingHorizontal: Spacing.md,
        minHeight: 32,
    },
    mediumButton: {
        paddingVertical: Math.max(8, Button.paddingVertical - 4),
        paddingHorizontal: Spacing.lg,
        minHeight: 40,
    },
    largeButton: {
        paddingVertical: Button.paddingVertical,
        paddingHorizontal: Spacing.xl,
        minHeight: 48,
    },
    // 文字尺寸
    smallText: {
        fontSize: FontSize.small,
    },
    mediumText: {
        fontSize: FontSize.body,
    },
    largeText: {
        fontSize: FontSize.h3,
    },
    // 文字颜色
    lightText: { color: color.lightText },
    darkText: { color: color.primary },
    // 禁用状态
    disabledButton: {
    backgroundColor: color.lightGray,
    borderColor: color.mediumGray,
        opacity: 0.7,
        shadowOpacity: 0,
        elevation: 0,
    },
    disabledText: {
    color: color.mutedText,
    },
    // 圆角样式
    rounded: {
        borderRadius: Radius.round,
    },
    // 满宽样式
    fullWidth: {
        width: '100%',
    },
    // 加载状态
    loader: {
        marginRight: 0,
    }
});