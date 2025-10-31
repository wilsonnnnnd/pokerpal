import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette as color } from '@/constants';
import { Spacing, FontSize } from '@/constants/designTokens';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import simpleT from '@/i18n/simpleT';
import { useLogger } from '@/utils/useLogger';

type Props = {
    title?: string;
    message?: string;
    buttonTitle?: string;
    onPress?: () => void;
    secondaryButtonTitle?: string;
    secondaryOnPress?: () => void;
    style?: any;
};

export const GuestPlaceholder: React.FC<Props> = ({
    title,
    message,
    buttonTitle,
    onPress,
    secondaryButtonTitle,
    secondaryOnPress,
    style,
}) => {
    const tTitle = title ?? simpleT('profile_guest_mode_title');
    const tMessage = message ?? simpleT('profile_guest_mode_msg');
    const tButton = buttonTitle ?? simpleT('return_home');
    const tSecondary = secondaryButtonTitle;

    const { log } = useLogger();
    useEffect(() => {
        // Log that placeholder was shown
        try {
            log('GuestPlaceholder', 'shown');
        } catch (e) {
            // ignore
        }
    }, []);

    const handlePrimary = () => {
        try { log('GuestPlaceholder', 'primary_clicked'); } catch (e) {}
        if (onPress) onPress();
    };

    const handleSecondary = () => {
        try { log('GuestPlaceholder', 'secondary_clicked'); } catch (e) {}
        if (secondaryOnPress) secondaryOnPress();
    };

    return (
        <View style={[{ justifyContent: 'center', alignItems: 'center', padding: Spacing.xl }, style]}>
            {/* close button removed by request */}

            <MaterialCommunityIcons
                name="account-off"
                size={80}
                color={color.mutedText}
                style={{ marginBottom: Spacing.lg }}
            />
            <Text style={{
                fontSize: FontSize.h2,
                fontWeight: '700',
                color: color.title,
                textAlign: 'center',
                marginBottom: Spacing.md,
            }}>{tTitle}</Text>

            <Text style={{
                fontSize: FontSize.body,
                color: color.mutedText,
                textAlign: 'center',
                marginBottom: Spacing.xl,
                lineHeight: 24,
            }}>{tMessage}</Text>

            {(tSecondary && secondaryOnPress) ? (
                <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                    <TouchableOpacity onPress={handleSecondary} style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: color.lightGray }}>
                        <Text style={{ color: color.mutedText }}>{tSecondary}</Text>
                    </TouchableOpacity>
                    <View style={{ width: Spacing.sm }} />
                    <View style={{ flex: 1 }}>
                        <PrimaryButton title={tButton} onPress={handlePrimary} />
                    </View>
                </View>
            ) : (
                <PrimaryButton title={tButton} onPress={handlePrimary} />
            )}
        </View>
    );
};

export default GuestPlaceholder;
