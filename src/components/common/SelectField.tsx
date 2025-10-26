import React from 'react';
import { View, Text, TouchableOpacity, Animated, Easing } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette as color } from '@/constants';
import { Spacing, Radius, FontSize, Elevation } from '@/constants/designTokens';

type Option = { key: string; label: string };

export default function SelectField({
    value,
    onChange,
    options,
}: {
    value?: string;
    onChange: (k: string) => void;
    options: Option[];
}) {
    const [open, setOpen] = React.useState(false);
    const current = options.find((o) => o.key === value) ?? options[0];
    const anim = React.useRef(new Animated.Value(0)).current; // 0 closed, 1 open

    return (
        <View>
            <TouchableOpacity
                onPress={() => {
                    const next = !open;
                    setOpen(next);
                    Animated.timing(anim, {
                        toValue: next ? 1 : 0,
                        duration: 200,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }).start();
                }}
                style={{
                    backgroundColor: color.lightBackground,
                    padding: Spacing.sm,
                    borderRadius: Radius.sm,
                    borderWidth: 1,
                    borderColor: color.borderColor,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}
            >
                <Text style={{ color: color.valueText, fontSize: FontSize.body }}>{current.label}</Text>
                <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={color.strongGray} />
            </TouchableOpacity>
            <Animated.View pointerEvents={open ? 'auto' : 'none'} style={{
                opacity: anim,
                transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) }],
            }}>
                {open && (
                    <View style={{
                        backgroundColor: color.lightBackground,
                        marginTop: Spacing.xs,
                        borderRadius: Radius.sm,
                        overflow: 'hidden',
                        borderWidth: 1,
                        borderColor: color.borderColor,
                        // use elevation token where possible
                        shadowColor: color.shadowDark,
                        shadowOffset: { width: 0, height: Elevation.card ? 2 : 0 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                        elevation: Elevation.card
                    }}>
                        {options.map((o, i) => {
                            const isSelected = o.key === value;
                            return (
                                <TouchableOpacity
                                    key={o.key}
                                    onPress={() => { onChange(o.key); setOpen(false); Animated.timing(anim, { toValue: 0, duration: 160, easing: Easing.in(Easing.ease), useNativeDriver: true }).start(); }}
                                    style={{
                                        padding: Spacing.md,
                                        borderBottomWidth: i < options.length - 1 ? 1 : 0,
                                        borderBottomColor: color.mediumGray,
                                        backgroundColor: isSelected ? color.lightGray : color.lightBackground,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}
                                >
                                    <Text style={{ color: isSelected ? color.primary : color.title, fontSize: FontSize.body, fontWeight: isSelected ? '600' as any : '400' as any }}>{o.label}</Text>
                                    {isSelected && <MaterialCommunityIcons name={'check'} size={18} color={color.primary} />}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}
            </Animated.View>
        </View>
    );
}
