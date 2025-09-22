import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
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

    return (
        <View>
            <TouchableOpacity
                onPress={() => setOpen((s) => !s)}
                style={{
                    backgroundColor: color.lightBackground,
                    padding: Spacing.md,
                    borderRadius: Radius.sm,
                    borderWidth: 1,
                    borderColor: color.borderColor
                }}
            >
                <Text style={{ color: color.valueText, fontSize: FontSize.body }}>{current.label}</Text>
            </TouchableOpacity>
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
                    {options.map((o) => (
                        <TouchableOpacity
                            key={o.key}
                            onPress={() => { onChange(o.key); setOpen(false); }}
                            style={{
                                padding: Spacing.md,
                                borderBottomWidth: 1,
                                borderBottomColor: color.mediumGray
                            }}
                        >
                            <Text style={{ color: color.valueText, fontSize: FontSize.body }}>{o.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
}
