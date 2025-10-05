import React from 'react';
import { ViewStyle, StyleProp } from 'react-native';

import { Gradients } from '@/constants';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientCardProps } from '@/types';


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
