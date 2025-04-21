import React from 'react';
import { View, Text, TextInput, StyleSheet, Platform, KeyboardTypeOptions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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
    inputRef?: React.RefObject<TextInput>;
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
    inputRef,
}) => {
    return (
        <View style={styles.inputContainer}>
            <Text style={styles.label}>{label}</Text>
            <View style={[styles.inputWrapper, error && styles.inputWrapperError]}>
                <MaterialCommunityIcons name={icon} size={20} color="#7f8c8d" style={styles.inputIcon} />
                <TextInput
                    ref={inputRef}
                    style={styles.input}
                    keyboardType={keyboardType || (Platform.OS === 'ios' ? 'number-pad' : 'numeric')}
                    value={value}
                    onChangeText={(text) => onChangeText(fieldName, text)}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    placeholder={placeholder}
                    placeholderTextColor="#95a5a6"
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
        color: '#34495e',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 12,
        backgroundColor: '#f9f9f9',
        paddingHorizontal: 12,
    },
    inputWrapperError: {
        borderColor: '#e74c3c',
        backgroundColor: '#ffebee',
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
        color: '#2c3e50',
    },
    errorText: {
        color: '#e74c3c',
        fontSize: 12,
        marginTop: 4,
        marginLeft: 4,
    },
});
