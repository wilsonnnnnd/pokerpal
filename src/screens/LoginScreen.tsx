import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Toast from 'react-native-toast-message';
import { db } from '@/firebase/config';
import { signInWithCredential, signInAnonymously } from '@/services/localAuth';
import storage from '@/services/storageService';
import { doc, setDoc,  } from 'firebase/firestore';
import { userDoc, userByEmailDoc, CURRENT_USER_KEY } from '@/constants/namingVar';
import { useNavigation } from '@react-navigation/native';
import { Palette as color } from '@/constants';
import { Spacing, Radius, FontSize } from '@/constants/designTokens';

// iOS-only configuration: use the iOS client id
GoogleSignin.configure({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
});

export default function LoginScreen() {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // optional: check if already signed in
    }, []);

    const saveUserProfile = async (user: { uid: string; email?: string | null; displayName?: string | null; photoURL?: string | null; isAnonymous?: boolean }) => {
        try {
            const uid = user.uid;
            const userRef = doc(db, userDoc, uid);
            // check if user doc exists
            try {
                const existing = await (await import('firebase/firestore')).getDoc(userRef);
                const now = new Date().toISOString();
                if (existing.exists()) {
                    // only update the updated timestamp
                    await setDoc(userRef, { updated: now }, { merge: true });
                } else {
                    const data: any = {
                        nickname: user.displayName ?? (user.isAnonymous ? 'Guest' : ''),
                        email: user.email ?? '',
                        photoURL: user.photoURL ?? '',
                        isActive: true,
                        role: user.isAnonymous ? 'guest' : 'player',
                        updated: now,
                    };

                    await setDoc(userRef, {
                        ...data,
                        created: now,
                    }, { merge: true });

                    if (user.email) {
                        const key = String(user.email).toLowerCase().trim();
                        await setDoc(doc(db, userByEmailDoc, key), {
                            uid,
                            nickname: data.nickname,
                            photoURL: data.photoURL,
                            registered: true,
                            lastLinkedAt: new Date().toISOString(),
                        }, { merge: true });
                    }
                }
            } catch (e) {
                // fallback: if getDoc fails for some reason, attempt to write full profile
                const now = new Date().toISOString();
                const data: any = {
                    nickname: user.displayName ?? (user.isAnonymous ? 'Guest' : ''),
                    email: user.email ?? '',
                    photoURL: user.photoURL ?? '',
                    isActive: true,
                    role: user.isAnonymous ? 'guest' : 'player',
                    updated: now,
                };

                await setDoc(userRef, {
                    ...data,
                    created: now,
                }, { merge: true });
            }
        } catch (error) {
            console.error('saveUserProfile error', error);
        }
    };

    const onGoogleSignIn = async () => {
        setLoading(true);
        try {
            // iOS-only: ensure ios client id is provided
            const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';
            if (!iosClientId) {
                Toast.show({ type: 'error', text1: '登录未配置', text2: '未检测到 iOS Google Client ID，构建时请设置 EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID' });
                setLoading(false);
                return;
            }

            // On iOS we can directly call signIn() and use idToken
            const userInfo = await GoogleSignin.signIn();
            let idToken: string | null = (userInfo as any)?.idToken ?? null;
            if (!idToken) {
                const tokens = await GoogleSignin.getTokens();
                idToken = (tokens as any)?.idToken ?? null;
            }
            if (!idToken) throw new Error('未获得 idToken');

            // GoogleSignin typings vary; use any to access token/email/displayName
            // Build a small credential object consumed by our localAuth shim
            const gi: any = userInfo as any;
            // Extract common profile fields returned by GoogleSignin
            const profileId = gi?.user?.id ?? gi?.id ?? null;
            const profileName = gi?.user?.name ?? gi?.user?.givenName ?? gi?.name ?? null;
            const profilePhoto = gi?.user?.photo ?? gi?.user?.photoUrl ?? gi?.photo ?? null;
            const profileEmail = gi?.user?.email ?? gi?.email ?? null;

            const googleCredential: any = {
                idToken,
                displayName: profileName,
                email: profileEmail,
                photoURL: profilePhoto,
                googleId: profileId,
            };

            const userCred = await signInWithCredential(googleCredential);
            const u = userCred.user;
            // Pass profile data to Firestore profile updater
            await saveUserProfile({ uid: u.uid, email: googleCredential.email ?? u.email, displayName: googleCredential.displayName ?? u.displayName, photoURL: googleCredential.photoURL ?? u.photoURL, isAnonymous: u.isAnonymous });

                // localAuth now persists the current user; verify persistence for debugging
                try {
                    const persisted = await storage.getLocal(CURRENT_USER_KEY);
                } catch (e) {
                    console.warn('Login: failed to read persisted user', e);
                }

            Toast.show({ type: 'success', text1: '登录成功', text2: `欢迎 ${u.displayName ?? '玩家'}` });
            // Let App's auth subscription switch the navigator. As a fallback try navigate.
            try {
                // @ts-ignore
                navigation.navigate('Home');
            } catch (e) {
                // ignore
            }
        } catch (error: any) {
            // Native SDK may throw platform-specific errors that are not descriptive in JS
            console.error('Google sign in error', error);
            const message = error?.message || (error?.toString ? error.toString() : '未知错误');
            // Suggest common fixes when native crashes or invalid configuration
            let hint = '';
            if (message.includes('invalid_client') || message.includes('misconfigured')) {
                hint = ' 请检查 Firebase/Google 客户端 ID 配置与 bundle id/package name 是否一致。';
            } else if (message.includes('DEVELOPER_ERROR') || message.includes('10')) {
                hint = ' Android 需要在 Firebase 控制台配置正确的 SHA-1。';
            }
            Toast.show({ type: 'error', text1: '登录失败', text2: message + hint });
        } finally {
            setLoading(false);
        }
    };

    const onGuest = async () => {
        setLoading(true);
        try {
            const cred = await signInAnonymously();
            const u = cred.user;
            await saveUserProfile({ uid: u.uid, isAnonymous: u.isAnonymous });

            // Persist current user locally
                // localAuth persists the anonymous user; verify persistence
                try {
                    const persisted = await storage.getLocal(CURRENT_USER_KEY);
                } catch (e) {
                    console.warn('Login: failed to read persisted guest user', e);
                }

            Toast.show({ type: 'success', text1: '已以访客身份登录' });
            // Let App's auth subscription switch the navigator. As a fallback try navigate.
            try {
                // @ts-ignore
                navigation.navigate('Home');
            } catch (e) {
                // ignore
            }
        } catch (error: any) {
            console.error('Anonymous sign-in error', error);
            Toast.show({ type: 'error', text1: '访客登录失败', text2: error?.message ?? String(error) });
        } finally {
            setLoading(false);
        }
    };

    return (
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
                    {/* Google Login Button */}
                    <TouchableOpacity 
                        style={[styles.primaryButton, styles.googleBtn]} 
                        onPress={onGoogleSignIn} 
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={[color.primary, color.highLighter]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.buttonGradient}
                        >
                            {loading ? (
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
                        onPress={onGuest} 
                        disabled={loading}
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
    // Legacy styles for compatibility
    googleBtn: {},
    guestBtn: {},
});
