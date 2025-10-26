import React from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette as color } from '@/constants';
import { GameHistorystyles as styles } from '@/assets/styles';
import { BasePageProps } from '@/types';
import simpleT from '@/i18n/simpleT';

/**
 * 通用加载状态组件
 */
export const LoadingStateView: React.FC<{
    title?: string;
    subtitle?: string;
    icon?: string;
}> = ({ title, subtitle, icon = 'loading' }) => {
    const t = title ?? simpleT('loading_title');
    const s = subtitle ?? simpleT('loading_subtitle');
    return (
        <LinearGradient
            colors={[color.background, color.lightBackground]}
            style={styles.loadingContainer}
        >
            <View style={styles.loadingContent}>
                <ActivityIndicator size="large" color={color.primary} />
                <Text style={styles.loadingText}>{t}</Text>
                <Text style={styles.loadingSubText}>{s}</Text>
            </View>
        </LinearGradient>
    );
};

/**
 * 通用错误状态组件
 */
export const ErrorStateView: React.FC<{
    error: string;
    onRetry?: () => void;
    title?: string;
    icon?: string;
}> = ({ error, onRetry, title, icon = 'alert-circle' }) => {
    const t = title ?? simpleT('error_occurred_title');
    return (
        <LinearGradient
            colors={[color.background, color.lightBackground]}
            style={styles.emptyContainer}
        >
            <View style={styles.emptyIconContainer}>
                <MaterialCommunityIcons name={icon as any} size={64} color={color.error} />
            </View>
            <Text style={styles.emptyText}>{t}</Text>
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
                        <Text style={styles.emptyActionText}>{simpleT('retry')}</Text>
                    </LinearGradient>
                </TouchableOpacity>
            )}
        </LinearGradient>
    );
};

/**
 * 权限检查加载状态
 */
export const PermissionLoadingView: React.FC = () => (
    <LoadingStateView 
        title={simpleT('checking_permissions_title')}
        subtitle={simpleT('loading_subtitle')}
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
}> = ({ onNavigateHome, title, subtitle }) => {
    const t = title ?? simpleT('permission_denied_title');
    const s = subtitle ?? simpleT('permission_denied_subtitle');
    return (
        <LinearGradient
            colors={[color.background, color.lightBackground]}
            style={styles.emptyContainer}
        >
            <View style={styles.emptyIconContainer}>
                <MaterialCommunityIcons name="shield-lock" size={64} color={color.mutedText} />
            </View>
            <Text style={styles.emptyText}>{t}</Text>
            <Text style={styles.emptySubText}>{s}</Text>
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
                        <Text style={styles.emptyActionText}>{simpleT('return_home')}</Text>
                    </LinearGradient>
                </TouchableOpacity>
            )}
        </LinearGradient>
    );
};

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
    emptyTitle,
    emptySubtitle,
    emptyActionText,
    onEmptyAction,
    onRetry,
    onNavigateHome,
    children
}) => {
    const emptyT = emptyTitle ?? simpleT('no_data');
    const emptySub = emptySubtitle ?? undefined;
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
                title={emptyT}
                subtitle={emptySub}
                actionText={emptyActionText}
                onAction={onEmptyAction}
            />
        );
    }

    // 正常渲染内容
    return <>{children}</>;
};