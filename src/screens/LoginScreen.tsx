import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Toast from 'react-native-toast-message';
import { db } from '@/firebase/config';
import { signInWithCredential, signInAnonymously } from '@/services/localAuth';
import storage from '@/services/storageService';
import { doc, setDoc,  } from 'firebase/firestore';
import { userDoc, userByEmailDoc } from '@/constants/namingDb';
import { useNavigation } from '@react-navigation/native';
import { Palette as color } from '@/constants';

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
            const data: any = {
                nickname: user.displayName ?? (user.isAnonymous ? 'Guest' : ''),
                email: user.email ?? '',
                photoURL: user.photoURL ?? '',
                isActive: true,
                role: user.isAnonymous ? 'guest' : 'player',
                updated: new Date().toISOString(),
            };

            await setDoc(doc(db, userDoc, uid), {
                ...data,
                created: new Date().toISOString(),
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
            // Try to read idToken from signIn response (some versions include it). If not present, fallback to getTokens()
            // Use `as any` to avoid TypeScript type mismatch for different lib versions
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let idToken: string | null = (userInfo as any)?.idToken ?? null;
            if (!idToken) {
                // fallback: request tokens (safe on iOS)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const tokens = await GoogleSignin.getTokens();
                idToken = (tokens as any)?.idToken ?? null;
            }
            if (!idToken) throw new Error('未获得 idToken');

            // GoogleSignin typings vary; use any to access token/email/displayName
            const gi: any = userInfo as any;
            const googleCredential = { idToken, displayName: gi?.user?.name ?? gi?.user?.givenName ?? gi?.user?.name ?? gi?.givenName ?? gi?.name, email: gi?.user?.email ?? gi?.email };
            const userCred = await signInWithCredential(googleCredential);

            const u = userCred.user;
            await saveUserProfile({ uid: u.uid, email: u.email, displayName: u.displayName, photoURL: u.photoURL, isAnonymous: u.isAnonymous });

            // Persist current user locally so the app can restore session
            try {
                await storage.setLocal('@pokerpal:currentUser', {
                    uid: u.uid,
                    email: u.email ?? null,
                    displayName: u.displayName ?? null,
                    photoURL: u.photoURL ?? null,
                    isAnonymous: u.isAnonymous ?? false,
                });
            } catch (err) {
                console.warn('Failed to persist user locally', err);
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
            try {
                await storage.setLocal('@pokerpal:currentUser', {
                    uid: u.uid,
                    email: u.email ?? null,
                    displayName: u.displayName ?? null,
                    photoURL: u.photoURL ?? null,
                    isAnonymous: u.isAnonymous ?? true,
                });
            } catch (err) {
                console.warn('Failed to persist guest user locally', err);
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
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={color.background} />
            <Image source={require('../../src/assets/PokerPal.png')} style={styles.logo} />
            <Text style={styles.title}>欢迎使用 PokerPal</Text>

            <TouchableOpacity style={[styles.googleBtn, { backgroundColor: color.info }]} onPress={onGoogleSignIn} disabled={loading}>
                {loading ? <ActivityIndicator color={color.lightText} /> : <Text style={[styles.googleText, { color: color.lightText }]}>使用 Google 登录</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={[styles.guestBtn, { backgroundColor: color.lightGray }]} onPress={onGuest} disabled={loading}>
                <Text style={[styles.guestText, { color: color.title }]}>以访客身份继续</Text>
            </TouchableOpacity>

            <Text style={styles.note}>无需输入密码，授权后将保存昵称与头像以便统计与邀请。</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
    logo: { width: 140, height: 140, marginBottom: 20, resizeMode: 'contain' },
    title: { fontSize: 20, marginBottom: 24, color: color.title },
    googleBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, width: '100%', alignItems: 'center', marginBottom: 12 },
    googleText: { fontWeight: '600' },
    guestBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, width: '100%', alignItems: 'center' },
    guestText: { fontWeight: '600' },
    note: { marginTop: 16, color: color.text, fontSize: 12, textAlign: 'center' },
});
