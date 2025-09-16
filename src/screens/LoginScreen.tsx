import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Toast from 'react-native-toast-message';
import { auth, db } from '@/firebase/config';
import { signInWithCredential, GoogleAuthProvider, signInAnonymously } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { userDoc, userByEmailDoc } from '@/constants/namingDb';
import { useNavigation } from '@react-navigation/native';
import { Palette as color } from '@/constants';

GoogleSignin.configure({
    // NOTE: Ensure you set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in env for web client id
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
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
                updated: serverTimestamp(),
            };

            await setDoc(doc(db, userDoc, uid), {
                ...data,
                created: serverTimestamp(),
            }, { merge: true });

            if (user.email) {
                const key = String(user.email).toLowerCase().trim();
                await setDoc(doc(db, userByEmailDoc, key), {
                    uid,
                    nickname: data.nickname,
                    photoURL: data.photoURL,
                    registered: true,
                    lastLinkedAt: serverTimestamp(),
                }, { merge: true });
            }
        } catch (error) {
            console.error('saveUserProfile error', error);
        }
    };

    const onGoogleSignIn = async () => {
        setLoading(true);
        try {
            // Guard: ensure client IDs are provided in built app; missing IDs often crash the native Google SDK
            const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
            const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';
            if (!webClientId && !iosClientId) {
                Toast.show({ type: 'error', text1: '登录未配置', text2: '未检测到 Google Client ID，构建时请设置 EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID / EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID' });
                setLoading(false);
                return;
            }
            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
            const userInfo = await GoogleSignin.signIn();
            // getTokens returns idToken/accessToken with correct typing
            const tokens = await GoogleSignin.getTokens();

            // Create a Firebase credential with the token
            const googleCredential = GoogleAuthProvider.credential(tokens.idToken);
            const userCred = await signInWithCredential(auth as any, googleCredential);

            const u = userCred.user;
            await saveUserProfile({ uid: u.uid, email: u.email, displayName: u.displayName, photoURL: u.photoURL, isAnonymous: u.isAnonymous });

            Toast.show({ type: 'success', text1: '登录成功', text2: `欢迎 ${u.displayName ?? '玩家'}` });
            // Navigate to Home
            // @ts-ignore
            navigation.navigate('Home');
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
            const cred = await signInAnonymously(auth as any);
            const u = cred.user;
            await saveUserProfile({ uid: u.uid, isAnonymous: u.isAnonymous });
            Toast.show({ type: 'success', text1: '已以访客身份登录' });
            // @ts-ignore
            navigation.navigate('Home');
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
