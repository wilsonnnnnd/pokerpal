import React from 'react';
import { View, Text, TextInput, StyleSheet, Platform, KeyboardTypeOptions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette } from '@/constants';

interface InputFieldProps {
    label: string;
    fieldName: string;
    value: string;
    placeholder: string;
    icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
    error?: string;
    keyboardType?: KeyboardTypeOptions;
    onChangeText: (field: string, value: string) => void;
    onFocus?: () => void;
    onBlur?: () => void;
    onSubmitEditing?: () => void;
    returnKeyType?: 'done' | 'go' | 'next' | 'search' | 'send' | 'default';
    inputRef?: React.RefObject<TextInput | null>;
}

export const InputField: React.FC<InputFieldProps> = ({
    label,
    fieldName,
    value,
    placeholder,
    icon,
    error,
    keyboardType,
    onChangeText,
    onFocus,
    onBlur,
    onSubmitEditing,
    returnKeyType = 'done',
    inputRef,
}) => {
    return (
        <View style={styles.inputContainer}>
            <Text style={styles.label}>{label}</Text>
            <View style={[styles.inputWrapper, error && styles.inputWrapperError]}>
                <MaterialCommunityIcons name={icon} size={20} color={Palette.valueLabel} style={styles.inputIcon} />
                <TextInput
                    ref={inputRef}
                    style={styles.input}
                    keyboardType={keyboardType || (Platform.OS === 'ios' ? 'number-pad' : 'numeric')}
                    value={value}
                    onChangeText={(text) => onChangeText(fieldName, text)}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    onSubmitEditing={onSubmitEditing}
                    returnKeyType={returnKeyType}
                    placeholder={placeholder}
                    placeholderTextColor={Palette.mutedText}
                    maxLength={10}
                />
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    inputContainer: {
        marginBottom: 16,
    },
    label: {
        fontSize: 16,
        marginBottom: 8,
        fontWeight: '500',
        color: Palette.strongGray,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Palette.borderColor || Palette.mediumGray,
        borderRadius: 12,
        backgroundColor: Palette.lightGray,
        paddingHorizontal: 12,
    },
    inputWrapperError: {
        borderColor: Palette.error,
        backgroundColor: '#ffebee',
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
        color: Palette.valueText,
    },
    errorText: {
        color: Palette.error,
        fontSize: 12,
        marginTop: 4,
        marginLeft: 4,
    },
});
