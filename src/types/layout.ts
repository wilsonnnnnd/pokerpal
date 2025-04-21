import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ReactNode } from "react";
import { StyleProp, TextStyle, ViewStyle } from "react-native";

export interface HeaderSlotStore {
    title?: string;
    right?: ReactNode;
    left?: ReactNode;
    setHeaderRight: (node: ReactNode) => void;
    setHeaderLeft: (node: ReactNode) => void;
    clearHeader: () => void;
}

export interface PrimaryButtonProps {
    title: string;
    onPress: () => void;
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
    icon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
    iconColor?: string;
    iconSize?: number;
    iconPosition?: 'left' | 'right';
    disabled?: boolean;
    loading?: boolean;
    loadingColor?: string;
    variant?: 'filled' | 'outlined' | 'text';
    size?: 'small' | 'medium' | 'large';
    rounded?: boolean;
    fullWidth?: boolean;
}

export interface MsgPopUpProps {
    title?: string;
    message?: string;
    note?: string;
    isWarning?: boolean;
    isVisible?: boolean;
    onConfirm?: () => void;
    onCancel?: () => void;
}

