import React from 'react';
import { ViewStyle, StyleProp } from 'react-native';

import { Gradients } from '@/constants';
import { LinearGradient } from 'expo-linear-gradient';

type GradientCardProps = {
    children: React.ReactNode;
    index?: number; // 用于选择渐变色（默认第一个）
    style?: StyleProp<ViewStyle>;
};

export const GradientCard = ({ children, index = 0, style }: GradientCardProps) => {
    const [from, to] = Gradients[index % Gradients.length];

    return (
        <LinearGradient
            colors={[from, to]}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[{
                borderRadius: 16,
                padding: 16,
                marginVertical: 8,
            }, style]}
        >
            {children}
        </LinearGradient>
    );
};
