import React from 'react';
import { View, Image, Text, StyleSheet, ViewStyle, ImageStyle, TextStyle } from 'react-native';
import { Palette as color } from '@/constants';

type AvatarProps = {
    uri?: string | null;
    name?: string;
    size?: number;
    rounded?: boolean;
    backgroundColor?: string;
    showStatus?: boolean;
    status?: 'online' | 'offline';
    style?: ViewStyle;
    imageStyle?: ImageStyle;
    textStyle?: TextStyle;
    accessibilityLabel?: string;
};

export default function Avatar({
    uri,
    name,
    size = 48,
    rounded = true,
    backgroundColor,
    showStatus = false,
    status = 'online',
    style,
    imageStyle,
    textStyle,
    accessibilityLabel,
}: AvatarProps) {
    const initials = (name && name.charAt(0).toUpperCase()) || 'U';
    const bg = backgroundColor || color.strongGray;

    return (
        <View style={[{ width: size, height: size }, style]} accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
            {uri ? (
                <Image
                    source={{ uri }}
                    style={[{ width: size, height: size, borderRadius: rounded ? size / 2 : 4 }, imageStyle]}
                />
            ) : (
                <View style={[styles.fallback, { width: size * 0.9, height: size * 0.9, borderRadius: rounded ? size / 2 : 4, backgroundColor: bg }]}>
                    <Text style={[styles.fallbackText, { fontSize: Math.max(12, Math.floor(size / 2.6)) }, textStyle]}>{initials}</Text>
                </View>
            )}

            {showStatus && (
                <View style={[styles.status, { right: Math.max(2, size * -0.06), bottom: Math.max(2, size * -0.06), backgroundColor: status === 'online' ? color.success : color.error }]} />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    fallback: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    fallbackText: {
        color: '#fff',
        fontWeight: '700',
    },
    status: {
        position: 'absolute',
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#fff',
    },
});
