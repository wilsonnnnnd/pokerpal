import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, StyleSheet, StatusBar, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import { Palette as color } from '@/constants';
import { Spacing, Radius, FontSize } from '@/constants/designTokens';
import AuthService from '@/services/authService';
import { usePageState } from '@/hooks/usePageState';
import { PageStateView } from '@/components/PageState';
import { EmailConflictError } from '@/types';

export default function LoginScreen() {
    const navigation = useNavigation();
    const pageState = usePageState();
    const [isAppleSupported, setIsAppleSupported] = useState(false);

    useEffect(() => {
        // Check if Apple Sign-In is available
        const checkAppleSupport = async () => {
            if (Platform.OS === 'ios') {
                    try {
                        const isSupported = await AppleAuthentication.isAvailableAsync();
                        setIsAppleSupported(isSupported);
                    } catch (error) {
                        console.error('Apple authentication not available', error);
                        setIsAppleSupported(false);
                    }
                }
        };
        checkAppleSupport();
    }, []);

    const handleAuthSuccess = (userProfile: any) => {
        Toast.show({ 
            type: 'success', 
            text1: '登录成功', 
            text2: `欢迎 ${userProfile.displayName ?? '玩家'}` 
        });
        
        // 不需要手动导航，App.tsx 会监听认证状态变化并自动切换到 MainNavigator
        // 移除手动导航逻辑，让认证状态自动处理导航
    };

    const handleEmailConflict = (conflictError: EmailConflictError) => {
        const { email, existingProvider, currentProvider } = conflictError;
        
        // 提供商显示名称映射
        const getProviderName = (provider: string) => {
            switch (provider) {
                case 'google.com': return 'Google';
                case 'apple.com': return 'Apple';
                default: return provider;
            }
        };

        const existingProviderName = getProviderName(existingProvider);
        const currentProviderName = getProviderName(currentProvider);

        Alert.alert(
            '账号冲突',
            `该邮箱 ${email} 已使用 ${existingProviderName} 登录注册。\n\n请使用 ${existingProviderName} 登录继续。`,
            [
                {
                    text: '取消',
                    style: 'cancel'
                },
                {
                    text: `使用 ${existingProviderName} 登录`,
                    onPress: () => {
                            console.info(`User chose to sign in with existing provider: ${existingProvider}`);
                            if (existingProvider === 'google.com') {
                                onGoogleSignIn();
                            } else if (existingProvider === 'apple.com') {
                                onAppleSignIn();
                        }
                    }
                }
            ]
        );
    };

    const handleAuthError = (error: any, method: string) => {
        console.error(`${method} sign in error`, error);
        
        // 安全地提取错误消息
        let message = '';
        if (typeof error === 'string') {
            message = error;
        } else if (error && typeof error === 'object') {
            message = error.message || error.toString() || '未知错误';
        } else {
            message = String(error || '未知错误');
        }
        
        let hint = '';

        // Helper to detect user-cancelled messages (various providers and languages)
        const isUserCancelled = (msg: string) => {
            if (!msg) return false;
            const m = msg.toLowerCase();
            return m.includes('取消') || m.includes('cancel') || m.includes('user cancelled') || m.includes('user canceled') || m.includes('canceled by user');
        };

        // If user explicitly cancelled the auth flow, show an info toast instead of an error
        if (isUserCancelled(message)) {
            Toast.show({ type: 'info', text1: `${method} 登录已取消` });
            return;
        }

        if (method === 'Google') {
            if (message.includes('invalid_client') || message.includes('misconfigured')) {
                hint = ' 请检查 Firebase/Google 客户端 ID 配置与 bundle id/package name 是否一致。';
            } else if (message.includes('DEVELOPER_ERROR') || message.includes('10')) {
                hint = ' Android 需要在 Firebase 控制台配置正确的 SHA-1。';
            }
        } else if (method === 'Apple') {
            if (message.includes('网络连接失败')) {
                hint = ' 请检查网络连接是否正常。';
            } else if (message.includes('Apple 服务器响应无效')) {
                hint = ' Apple 服务暂时不可用，请稍后重试。';
            } else if (message.includes('The authorization attempt failed for an unknown reason')) {
                hint = ' 可能是设备或网络问题，请确保已登录 Apple ID 并重试。';
            }
        }

        Toast.show({ 
            type: 'error', 
            text1: `${method}登录失败`, 
            text2: message + hint 
        });
    };

    const onGoogleSignIn = async () => {
        pageState.setLoading(true);
        try {
            const result = await AuthService.signInWithGoogle();
            
            if (result.success && result.user) {
                handleAuthSuccess(result.user);
            } else if (result.conflictError) {
                handleEmailConflict(result.conflictError);
            } else {
                handleAuthError(new Error(result.error || '登录失败'), 'Google');
            }
        } catch (error) {
            handleAuthError(error, 'Google');
        } finally {
            pageState.setLoading(false);
        }
    };

    const onAppleSignIn = async () => {
        pageState.setLoading(true);
        try {
            const result = await AuthService.signInWithApple();

            if (result.success && result.user) {
                handleAuthSuccess(result.user);
            } else if (result.conflictError) {
                handleEmailConflict(result.conflictError);
            } else {
                handleAuthError(result.error || '登录失败', 'Apple');
            }
        } catch (error) {
            handleAuthError(error, 'Apple');
        } finally {
            pageState.setLoading(false);
        }
    };

    const onAnonymousSignIn = async () => {
        pageState.setLoading(true);
        try {
            const result = await AuthService.signInAnonymously();
            if (result.success && result.user) {
                Toast.show({ type: 'success', text1: '已以访客身份登录' });
                // 不需要手动导航，认证状态变化会自动切换导航器
            } else {
                handleAuthError(new Error(result.error || '访客登录失败'), '访客');
            }
        } catch (error) {
            handleAuthError(error, '访客');
        } finally {
            pageState.setLoading(false);
        }
    };

    return (
        <PageStateView 
            loading={pageState.loading} 
            error={pageState.error}
        >
            <LinearGradient
                colors={[color.background, color.lightBackground]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.container}
            >
                <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

                {/* Hero Section */}
                <View style={styles.heroSection}>
                    <View style={styles.logoContainer}>
                        <View style={styles.logoWrapper}>
                            <Image source={require('../../src/assets/PokerPal.png')} style={styles.logo} />
                        </View>
                    </View>
                    <Text style={styles.title}>欢迎使用 PokerPal</Text>
                    <Text style={styles.subtitle}>德州扑克筹码管理专家</Text>
                </View>

                {/* Login Actions */}
                <View style={styles.actionsSection}>
                    <View style={styles.loginCard}>
                        {/* Apple Sign-In Button (iOS only) */}
                        {isAppleSupported && (
                            <TouchableOpacity
                                style={[styles.primaryButton, styles.appleBtn]}
                                onPress={onAppleSignIn}
                                disabled={pageState.loading}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={['#000000', '#333333']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.buttonGradient}
                                >
                                    {pageState.loading ? (
                                        <ActivityIndicator color={color.lightText} size="small" />
                                    ) : (
                                        <>
                                            <MaterialCommunityIcons
                                                name="apple"
                                                size={20}
                                                color={color.lightText}
                                                style={styles.buttonIcon}
                                            />
                                            <Text style={styles.primaryButtonText}>使用 Apple 登录</Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        )}

                        {/* Google Login Button */}
                        <TouchableOpacity
                            style={[styles.primaryButton, styles.googleBtn]}
                            onPress={onGoogleSignIn}
                            disabled={pageState.loading}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={[color.primary, color.highLighter]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.buttonGradient}
                            >
                                {pageState.loading ? (
                                    <ActivityIndicator color={color.lightText} size="small" />
                                ) : (
                                    <>
                                        <MaterialCommunityIcons
                                            name="google"
                                            size={20}
                                            color={color.lightText}
                                            style={styles.buttonIcon}
                                        />
                                        <Text style={styles.primaryButtonText}>使用 Google 登录</Text>
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Guest Login Button */}
                        <TouchableOpacity
                            style={[styles.secondaryButton, styles.guestBtn]}
                            onPress={onAnonymousSignIn}
                            disabled={pageState.loading}
                            activeOpacity={0.8}
                        >
                            <MaterialCommunityIcons
                                name="account-outline"
                                size={20}
                                color={color.primary}
                                style={styles.buttonIcon}
                            />
                            <Text style={styles.secondaryButtonText}>以访客身份继续</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Info Note */}
                    <View style={styles.noteSection}>
                        <MaterialCommunityIcons
                            name="information-outline"
                            size={16}
                            color={color.mutedText}
                            style={styles.infoIcon}
                        />
                        <Text style={styles.note}>
                            无需输入密码，授权后将保存昵称与头像以便统计与邀请。
                        </Text>
                    </View>
                </View>
            </LinearGradient>
        </PageStateView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 60,
    },
    heroSection: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.xl,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: Spacing.xxl,
    },
    logoWrapper: {
        padding: Spacing.lg,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: Radius.round,
        shadowColor: color.shadowLight,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
        marginBottom: Spacing.lg,
    },
    logo: {
        width: 120,
        height: 120,
        resizeMode: 'contain',
    },
    title: {
        fontSize: FontSize.h1,
        fontWeight: '800',
        color: color.title,
        textAlign: 'center',
        marginBottom: Spacing.sm,
    },
    subtitle: {
        fontSize: FontSize.body,
        color: color.mutedText,
        textAlign: 'center',
        fontWeight: '500',
    },
    actionsSection: {
        paddingHorizontal: Spacing.xl,
        paddingBottom: Spacing.xxl,
    },
    loginCard: {
        backgroundColor: color.lightBackground,
        borderRadius: Radius.lg,
        padding: Spacing.lg,
        shadowColor: color.shadowLight,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
        marginBottom: Spacing.lg,
    },
    primaryButton: {
        borderRadius: Radius.md,
        marginBottom: Spacing.md,
        overflow: 'hidden',
    },
    buttonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing.xl,
    },
    buttonIcon: {
        marginRight: Spacing.sm,
    },
    primaryButtonText: {
        color: color.lightText,
        fontSize: FontSize.body,
        fontWeight: '700',
    },
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing.xl,
        borderRadius: Radius.md,
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: color.primary,
    },
    secondaryButtonText: {
        color: color.primary,
        fontSize: FontSize.body,
        fontWeight: '600',
    },
    noteSection: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: color.lightGray,
        borderRadius: Radius.md,
        padding: Spacing.md,
    },
    infoIcon: {
        marginRight: Spacing.sm,
        marginTop: 2,
    },
    note: {
        flex: 1,
        color: color.text,
        fontSize: FontSize.small,
        lineHeight: 18,
    },
    // Style for Apple login button
    appleBtn: {},
    // Legacy styles for compatibility
    googleBtn: {},
    guestBtn: {},
});
