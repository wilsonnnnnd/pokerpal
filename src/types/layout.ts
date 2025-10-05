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

export type GradientCardProps = {
    children: React.ReactNode;
    index?: number; // 用于选择渐变色（默认第一个）
    style?: StyleProp<ViewStyle>;
};


export type InfoRowProps = {
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    text: string;
    label?: string;  // 新增label属性
    textColor?: string;
    labelColor?: string; // 新增label颜色属性
    iconColor?: string;  // 更改color为iconColor使命名更明确
    iconSize?: number;
    textStyle?: TextStyle;
    labelStyle?: TextStyle; // 新增label样式属性
    style?: ViewStyle;
    iconContainerStyle?: ViewStyle; // 新增icon容器样式
};
