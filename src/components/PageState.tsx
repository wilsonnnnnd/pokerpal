import React from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette as color } from '@/constants';
import { GameHistorystyles as styles } from '@/assets/styles';
import { BasePageProps } from '@/types';

/**
 * 通用加载状态组件
 */
export const LoadingStateView: React.FC<{
    title?: string;
    subtitle?: string;
    icon?: string;
}> = ({ 
    title = '加载中...', 
    subtitle = '请稍候',
    icon = 'loading'
}) => (
    <LinearGradient
        colors={[color.background, color.lightBackground]}
        style={styles.loadingContainer}
    >
        <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color={color.primary} />
            <Text style={styles.loadingText}>{title}</Text>
            <Text style={styles.loadingSubText}>{subtitle}</Text>
        </View>
    </LinearGradient>
);

/**
 * 通用错误状态组件
 */
export const ErrorStateView: React.FC<{
    error: string;
    onRetry?: () => void;
    title?: string;
    icon?: string;
}> = ({ 
    error, 
    onRetry,
    title = '出现错误',
    icon = 'alert-circle'
}) => (
    <LinearGradient
        colors={[color.background, color.lightBackground]}
        style={styles.emptyContainer}
    >
        <View style={styles.emptyIconContainer}>
            <MaterialCommunityIcons name={icon as any} size={64} color={color.error} />
        </View>
        <Text style={styles.emptyText}>{title}</Text>
        <Text style={styles.emptySubText}>{error}</Text>
        {onRetry && (
            <TouchableOpacity 
                style={styles.emptyAction}
                onPress={onRetry}
                activeOpacity={0.7}
            >
                <LinearGradient
                    colors={[color.primary, color.highLighter]}
                    style={styles.emptyActionGradient}
                >
                    <MaterialCommunityIcons name="refresh" size={20} color={color.lightText} />
                    <Text style={styles.emptyActionText}>重试</Text>
                </LinearGradient>
            </TouchableOpacity>
        )}
    </LinearGradient>
);

/**
 * 权限检查加载状态
 */
export const PermissionLoadingView: React.FC = () => (
    <LoadingStateView 
        title="正在检查权限..."
        subtitle="请稍候"
        icon="shield-check"
    />
);

/**
 * 权限被拒绝状态
 */
export const PermissionDeniedView: React.FC<{
    onNavigateHome?: () => void;
    title?: string;
    subtitle?: string;
}> = ({ 
    onNavigateHome,
    title = '权限受限',
    subtitle = '此功能仅对房主开放，请使用房主账号登录'
}) => (
    <LinearGradient
        colors={[color.background, color.lightBackground]}
        style={styles.emptyContainer}
    >
        <View style={styles.emptyIconContainer}>
            <MaterialCommunityIcons name="shield-lock" size={64} color={color.mutedText} />
        </View>
        <Text style={styles.emptyText}>{title}</Text>
        <Text style={styles.emptySubText}>{subtitle}</Text>
        {onNavigateHome && (
            <TouchableOpacity 
                style={styles.emptyAction}
                onPress={onNavigateHome}
                activeOpacity={0.7}
            >
                <LinearGradient
                    colors={[color.mutedText, color.strongGray]}
                    style={styles.emptyActionGradient}
                >
                    <MaterialCommunityIcons name="home" size={20} color={color.lightText} />
                    <Text style={styles.emptyActionText}>返回首页</Text>
                </LinearGradient>
            </TouchableOpacity>
        )}
    </LinearGradient>
);

/**
 * 空数据状态组件
 */
export const EmptyStateView: React.FC<{
    title: string;
    subtitle?: string;
    icon?: string;
    actionText?: string;
    onAction?: () => void;
}> = ({ 
    title, 
    subtitle, 
    icon = 'inbox',
    actionText,
    onAction
}) => (
    <LinearGradient
        colors={['rgba(255, 255, 255, 0.8)', 'rgba(248, 250, 251, 0.8)']}
        style={styles.emptyContainer}
    >
        <View style={styles.emptyIconContainer}>
            <MaterialCommunityIcons name={icon as any} size={64} color={color.mutedText} />
        </View>
        <Text style={styles.emptyText}>{title}</Text>
        {subtitle && <Text style={styles.emptySubText}>{subtitle}</Text>}
        {onAction && actionText && (
            <TouchableOpacity 
                style={styles.emptyAction}
                onPress={onAction}
                activeOpacity={0.7}
            >
                <LinearGradient
                    colors={[color.primary, color.highLighter]}
                    style={styles.emptyActionGradient}
                >
                    <MaterialCommunityIcons name="plus" size={20} color={color.lightText} />
                    <Text style={styles.emptyActionText}>{actionText}</Text>
                </LinearGradient>
            </TouchableOpacity>
        )}
    </LinearGradient>
);

/**
 * 通用页面状态组件 - 自动根据状态显示对应UI
 */
export const PageStateView: React.FC<BasePageProps & {
    loading?: boolean;
    error?: string | null;
    permLoading?: boolean;
    isHost?: boolean;
    isEmpty?: boolean;
    emptyTitle?: string;
    emptySubtitle?: string;
    emptyActionText?: string;
    onEmptyAction?: () => void;
    onNavigateHome?: () => void;
    children?: React.ReactNode;
}> = ({
    loading,
    error,
    permLoading,
    isHost,
    isEmpty,
    emptyTitle = '暂无数据',
    emptySubtitle,
    emptyActionText,
    onEmptyAction,
    onRetry,
    onNavigateHome,
    children
}) => {
    // 权限检查加载中
    if (permLoading) {
        return <PermissionLoadingView />;
    }

    // 权限被拒绝
    if (isHost === false) {
        return <PermissionDeniedView onNavigateHome={onNavigateHome} />;
    }

    // 页面加载中
    if (loading) {
        return <LoadingStateView />;
    }

    // 错误状态
    if (error) {
        return <ErrorStateView error={error} onRetry={onRetry} />;
    }

    // 空数据状态
    if (isEmpty) {
        return (
            <EmptyStateView
                title={emptyTitle}
                subtitle={emptySubtitle}
                actionText={emptyActionText}
                onAction={onEmptyAction}
            />
        );
    }

    // 正常渲染内容
    return <>{children}</>;
};