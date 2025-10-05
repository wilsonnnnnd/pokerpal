import React from 'react';
import { View, Text, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette } from '@/constants';
import { InfoRowStyles } from '@/assets/styles';
import { InfoRowProps } from '@/types';


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
        <View style={[InfoRowStyles.row, style]}>
            <View style={[InfoRowStyles.iconContainer, iconContainerStyle]}>
                <MaterialCommunityIcons name={icon} size={iconSize} color={iconColor} />
            </View>
            <View style={InfoRowStyles.textContainer}>
                {label && (
                    <Text style={[InfoRowStyles.label, { color: labelColor }, labelStyle]}>
                        {label}
                    </Text>
                )}
                <Text style={[InfoRowStyles.text, { color: textColor }, textStyle]}>
                    {text}
                </Text>
            </View>
        </View>
    );
};
