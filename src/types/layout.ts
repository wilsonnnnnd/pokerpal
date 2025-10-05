import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ReactNode } from "react";
import { StyleProp, TextStyle, ViewStyle } from "react-native";

// ===== 统一状态管理类型 =====

/**
 * 基础加载状态
 */
export interface LoadingState {
    loading: boolean;
    refreshing?: boolean;
    error?: string | null;
}

/**
 * 权限相关状态
 */
export interface PermissionState {
    isHost: boolean;
    permLoading: boolean;
    hasPermission?: boolean;
}

/**
 * 用户认证状态
 */
export interface AuthState {
    user: {
        uid: string;
        email?: string | null;
        displayName?: string | null;
        photoURL?: string | null;
        isAnonymous?: boolean;
        profile?: any;
    } | null;
    persistedUser?: any | null;
    authLoading: boolean;
}

/**
 * 数据分页状态
 */
export interface PaginationState {
    hasNextPage: boolean;
    isLoadingMore: boolean;
    totalCount?: number;
    currentPage?: number;
}

/**
 * 通用页面状态组合
 */
export interface PageState extends LoadingState {
    initialized: boolean;
}

/**
 * 带权限的页面状态
 */
export interface PermissionPageState extends PageState, PermissionState {}

/**
 * 带认证的页面状态
 */
export interface AuthPageState extends PageState, AuthState {}

/**
 * 带分页的页面状态
 */
export interface PaginatedPageState extends PageState, PaginationState {}

/**
 * 完整的页面状态（包含所有状态类型）
 */
export interface FullPageState extends PageState, PermissionState, AuthState, PaginationState {}

/**
 * 状态操作接口
 */
export interface StateActions {
    setLoading: (loading: boolean) => void;
    setRefreshing: (refreshing: boolean) => void;
    setError: (error: string | null) => void;
    reset: () => void;
}

/**
 * 页面组件的通用Props
 */
export interface BasePageProps {
    loading?: boolean;
    error?: string | null;
    onRetry?: () => void;
    onRefresh?: () => void;
}

// ===== 现有的组件类型 =====

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
