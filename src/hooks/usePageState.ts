import { useState, useCallback } from 'react';
import { 
    LoadingState, 
    PermissionState, 
    AuthState, 
    PaginationState, 
    PageState,
    PermissionPageState,
    AuthPageState,
    PaginatedPageState,
    FullPageState 
} from '@/types';

/**
 * 基础页面状态管理Hook
 */
export function usePageState(): PageState & {
    setLoading: (loading: boolean) => void;
    setRefreshing: (refreshing: boolean) => void;
    setError: (error: string | null) => void;
    setInitialized: (initialized: boolean) => void;
    reset: () => void;
} {
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [initialized, setInitialized] = useState(false);

    const reset = useCallback(() => {
        setLoading(false);
        setRefreshing(false);
        setError(null);
        setInitialized(false);
    }, []);

    return {
        loading,
        refreshing,
        error,
        initialized,
        setLoading,
        setRefreshing,
        setError,
        setInitialized,
        reset,
    };
}

/**
 * 带权限的页面状态管理Hook
 */
export function usePermissionPageState(): PermissionPageState & {
    setLoading: (loading: boolean) => void;
    setRefreshing: (refreshing: boolean) => void;
    setError: (error: string | null) => void;
    setInitialized: (initialized: boolean) => void;
    setIsHost: (isHost: boolean) => void;
    setPermLoading: (permLoading: boolean) => void;
    setHasPermission: (hasPermission: boolean) => void;
    reset: () => void;
} {
    const pageState = usePageState();
    const [isHost, setIsHost] = useState(false);
    const [permLoading, setPermLoading] = useState(true);
    const [hasPermission, setHasPermission] = useState(false);

    const reset = useCallback(() => {
        pageState.reset();
        setIsHost(false);
        setPermLoading(true);
        setHasPermission(false);
    }, [pageState]);

    return {
        ...pageState,
        isHost,
        permLoading,
        hasPermission,
        setIsHost,
        setPermLoading,
        setHasPermission,
        reset,
    };
}

/**
 * 带认证的页面状态管理Hook
 */
export function useAuthPageState(): AuthPageState & {
    setLoading: (loading: boolean) => void;
    setRefreshing: (refreshing: boolean) => void;
    setError: (error: string | null) => void;
    setInitialized: (initialized: boolean) => void;
    setUser: (user: AuthState['user']) => void;
    setPersistedUser: (persistedUser: any) => void;
    setAuthLoading: (authLoading: boolean) => void;
    reset: () => void;
} {
    const pageState = usePageState();
    const [user, setUser] = useState<AuthState['user']>(null);
    const [persistedUser, setPersistedUser] = useState<any>(null);
    const [authLoading, setAuthLoading] = useState(true);

    const reset = useCallback(() => {
        pageState.reset();
        setUser(null);
        setPersistedUser(null);
        setAuthLoading(true);
    }, [pageState]);

    return {
        ...pageState,
        user,
        persistedUser,
        authLoading,
        setUser,
        setPersistedUser,
        setAuthLoading,
        reset,
    };
}

/**
 * 带分页的页面状态管理Hook
 */
export function usePaginatedPageState(): PaginatedPageState & {
    setLoading: (loading: boolean) => void;
    setRefreshing: (refreshing: boolean) => void;
    setError: (error: string | null) => void;
    setInitialized: (initialized: boolean) => void;
    setHasNextPage: (hasNextPage: boolean) => void;
    setIsLoadingMore: (isLoadingMore: boolean) => void;
    setTotalCount: (totalCount: number) => void;
    setCurrentPage: (currentPage: number) => void;
    reset: () => void;
} {
    const pageState = usePageState();
    const [hasNextPage, setHasNextPage] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [totalCount, setTotalCount] = useState<number | undefined>(undefined);
    const [currentPage, setCurrentPage] = useState<number | undefined>(undefined);

    const reset = useCallback(() => {
        pageState.reset();
        setHasNextPage(true);
        setIsLoadingMore(false);
        setTotalCount(undefined);
        setCurrentPage(undefined);
    }, [pageState]);

    return {
        ...pageState,
        hasNextPage,
        isLoadingMore,
        totalCount,
        currentPage,
        setHasNextPage,
        setIsLoadingMore,
        setTotalCount,
        setCurrentPage,
        reset,
    };
}

/**
 * 完整的页面状态管理Hook（包含所有状态类型）
 */
export function useFullPageState(): FullPageState & {
    setLoading: (loading: boolean) => void;
    setRefreshing: (refreshing: boolean) => void;
    setError: (error: string | null) => void;
    setInitialized: (initialized: boolean) => void;
    setIsHost: (isHost: boolean) => void;
    setPermLoading: (permLoading: boolean) => void;
    setHasPermission: (hasPermission: boolean) => void;
    setUser: (user: AuthState['user']) => void;
    setPersistedUser: (persistedUser: any) => void;
    setAuthLoading: (authLoading: boolean) => void;
    setHasNextPage: (hasNextPage: boolean) => void;
    setIsLoadingMore: (isLoadingMore: boolean) => void;
    setTotalCount: (totalCount: number) => void;
    setCurrentPage: (currentPage: number) => void;
    reset: () => void;
} {
    const pageState = usePageState();
    const [isHost, setIsHost] = useState(false);
    const [permLoading, setPermLoading] = useState(true);
    const [hasPermission, setHasPermission] = useState(false);
    const [user, setUser] = useState<AuthState['user']>(null);
    const [persistedUser, setPersistedUser] = useState<any>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [hasNextPage, setHasNextPage] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [totalCount, setTotalCount] = useState<number | undefined>(undefined);
    const [currentPage, setCurrentPage] = useState<number | undefined>(undefined);

    const reset = useCallback(() => {
        pageState.reset();
        setIsHost(false);
        setPermLoading(true);
        setHasPermission(false);
        setUser(null);
        setPersistedUser(null);
        setAuthLoading(true);
        setHasNextPage(true);
        setIsLoadingMore(false);
        setTotalCount(undefined);
        setCurrentPage(undefined);
    }, [pageState]);

    return {
        ...pageState,
        isHost,
        permLoading,
        hasPermission,
        user,
        persistedUser,
        authLoading,
        hasNextPage,
        isLoadingMore,
        totalCount,
        currentPage,
        setIsHost,
        setPermLoading,
        setHasPermission,
        setUser,
        setPersistedUser,
        setAuthLoading,
        setHasNextPage,
        setIsLoadingMore,
        setTotalCount,
        setCurrentPage,
        reset,
    };
}
