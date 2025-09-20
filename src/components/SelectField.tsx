import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Palette as color } from '@/constants';

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
                    padding: 12,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: color.borderColor
                }}
            >
                <Text style={{ color: color.valueText, fontSize: 16 }}>{current.label}</Text>
            </TouchableOpacity>
            {open && (
                <View style={{
                    backgroundColor: color.lightBackground,
                    marginTop: 6,
                    borderRadius: 8,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: color.borderColor,
                    shadowColor: color.shadowDark,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3
                }}>
                    {options.map((o) => (
                        <TouchableOpacity
                            key={o.key}
                            onPress={() => { onChange(o.key); setOpen(false); }}
                            style={{
                                padding: 12,
                                borderBottomWidth: 1,
                                borderBottomColor: color.mediumGray
                            }}
                        >
                            <Text style={{ color: color.valueText, fontSize: 16 }}>{o.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
}
