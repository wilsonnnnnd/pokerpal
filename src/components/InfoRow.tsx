import React from 'react';
import { View, Text, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette } from '@/constants';

type InfoRowProps = {
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    text: string;
    label?: string;  // 新增label属性
    textColor?: string;
    labelColor?: string; // 新增label颜色属性
    iconColor?: string;  // 更改color为iconColor使命名更明确
    iconSize?: number;
    textStyle?: TextStyle;
    labelStyle?: TextStyle; // 新增label样式属性
    style?: ViewStyle;
    iconContainerStyle?: ViewStyle; // 新增icon容器样式
};

export const InfoRow: React.FC<InfoRowProps> = ({
    icon,
    text,
    label,
    textColor = Palette.valueText,
    labelColor = Palette.valueLabel,
    iconColor = Palette.valueText,
    iconSize = 20,
    textStyle,
    labelStyle,
    style,
    iconContainerStyle,
}) => {
    return (
        <View style={[styles.row, style]}>
            <View style={[styles.iconContainer, iconContainerStyle]}>
                <MaterialCommunityIcons name={icon} size={iconSize} color={iconColor} />
            </View>
            <View style={styles.textContainer}>
                {label && (
                    <Text style={[styles.label, { color: labelColor }, labelStyle]}>
                        {label}
                    </Text>
                )}
                <Text style={[styles.text, { color: textColor }, textStyle]}>
                    {text}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 6,
        paddingHorizontal: 12,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Palette.lightBackground,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    text: {
        fontSize: 16,
        fontWeight: '500',
    },
    label: {
        fontSize: 12,
        fontWeight: '400',
        marginBottom: 2,
    },
});