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
import { ButtonStyles } from '@/assets/styles';

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
                return ButtonStyles.outlinedButton;
            case 'text':
                return ButtonStyles.textButton;
            case 'filled':
            default:
                return ButtonStyles.filledButton;
        }
    };

    const getVariantTextStyle = () => {
        switch (variant) {
            case 'outlined':
            case 'text':
                return ButtonStyles.darkText;
            case 'filled':
            default:
                return ButtonStyles.lightText;
        }
    };

    const getSizeStyle = () => {
        switch (size) {
            case 'small':
                return ButtonStyles.smallButton;
            case 'large':
                return ButtonStyles.largeButton;
            case 'medium':
            default:
                return ButtonStyles.mediumButton;
        }
    };

    const getSizeTextStyle = () => {
        switch (size) {
            case 'small':
                return ButtonStyles.smallText;
            case 'large':
                return ButtonStyles.largeText;
            case 'medium':
            default:
                return ButtonStyles.mediumText;
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
                    iconPosition === 'left' ? ButtonStyles.iconLeft : ButtonStyles.iconRight
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
                ButtonStyles.button,
                getVariantStyle(),
                getSizeStyle(),
                rounded && ButtonStyles.rounded,
                fullWidth && ButtonStyles.fullWidth,
                disabled && ButtonStyles.disabledButton,
                pressed && !disabled && ButtonStyles.buttonPressed,
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
                    <ActivityIndicator size="small" color={loadingColor || (variant === 'filled' ? color.lightText : color.primary)} style={ButtonStyles.loader} />
            ) : (
                <View style={ButtonStyles.contentContainer}>
                    {iconPosition === 'left' && renderIcon()}
                    <Text
                        style={[
                            ButtonStyles.buttonText,
                            getVariantTextStyle(),
                            getSizeTextStyle(),
                            disabled && ButtonStyles.disabledText,
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
