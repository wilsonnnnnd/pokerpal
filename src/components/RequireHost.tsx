import React from 'react';
import { View, Text } from 'react-native';
import usePermission from '@/hooks/usePermission';

type Props = {
    children: React.ReactNode;
    // 当权限检查仍在进行中时显示的占位内容
    loadingFallback?: React.ReactNode;
    // 当权限检查完成且无权限时显示的内容（默认为 null）
    denyFallback?: React.ReactNode;
};

/**
 * RequireHost
 * - loadingFallback: 权限检查中显示的 UI（例如 spinner）
 * - denyFallback: 无权限时显示的 UI（例如提示并返回首页按钮）
 */
export const RequireHost: React.FC<Props> = ({ children, loadingFallback = null, denyFallback = null }) => {
    const { loading, isHost } = usePermission();

    if (loading) return <>{loadingFallback}</>;

    return <>{isHost ? children : denyFallback}</>;
};

export default RequireHost;
