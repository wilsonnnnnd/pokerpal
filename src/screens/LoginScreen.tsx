import React, { useState, useEffect } from 'react'
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, Image, StatusBar, SafeAreaView, Dimensions
} from 'react-native'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '@/firebase/config'
import { useAuthStore } from '@/stores/useAuthStore'
import Toast from 'react-native-toast-message'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../../App'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { Palette } from '@/constants'
import { PrimaryButton } from '@/components/PrimaryButton'
import styles from '@/assets/styles'

const { width } = Dimensions.get('window')

type HomeScreenNav = NativeStackNavigationProp<RootStackParamList, 'Home'>

const LoginScreen = () => {
    const navigation = useNavigation<HomeScreenNav>()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [nickname, setNickname] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showPassword, setShowPassword] = useState(false)

    const [logoClickCount, setLogoClickCount] = useState(0)
    const [adminPassword, setAdminPassword] = useState('')
    const [adminVerified, setAdminVerified] = useState(false)

    const user = useAuthStore((state) => state.user)

    const handleLogin = async () => {
        if (!email || !password) {
            setError('请输入电子邮箱和密码')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const userDocRef = doc(db, 'users-by-email', email)
            const userDoc = await getDoc(userDocRef)

            if (!userDoc.exists()) {
                setError('该账户不存在')
                return
            }

            const userData = userDoc.data()
            if (userData.role !== 'admin') {
                setError('权限不足，仅限管理员登录')
                return
            }

            const userCredential = await signInWithEmailAndPassword(auth, email, password)
            console.log('✅ 登录成功:', userCredential.user.email)
            navigation.replace('Home')
        } catch (err: any) {
            if (err.code === 'auth/wrong-password') {
                setError('密码错误，请重试')
            } else if (err.code === 'auth/invalid-email') {
                setError('邮箱格式无效')
            } else if (err.code === 'auth/too-many-requests') {
                setError('登录尝试次数过多，请稍后再试')
            } else {
                setError(err.message)
            }
        } finally {
            setLoading(false)
        }
    }

    const handleAdminRegister = async () => {
        if (!email || !password || !nickname) {
            setError('请填写昵称、邮箱和密码')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password)
            const uid = userCredential.user.uid

            await setDoc(doc(db, 'users-by-email', email), {
                uid,
                nickname,
                registered: true,
                role: 'admin'
            })

            Toast.show({ type: 'success', text1: '管理员账户已创建' })
            navigation.replace('Home')
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (user) {
            Toast.show({
                type: 'success',
                text1: '登录成功',
                text2: `欢迎回来，${user.email}`,
                position: 'top',
                visibilityTime: 2000,
            })
        }
    }, [user])

    const toggleShowPassword = () => setShowPassword(!showPassword)

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#f7f9fc" />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoidingView}
            >
                <View style={styles.logoContainer}>
                    <View style={styles.logoPlaceholder}>
                        <TouchableOpacity
                            onPress={() => {
                                const newCount = logoClickCount + 1
                                setLogoClickCount(newCount)
                                if (newCount >= 7) {
                                    Toast.show({
                                        type: 'info',
                                        text1: '请输入管理员密码以启用注册',
                                        position: 'top'
                                    })
                                }
                            }}
                            style={{
                                width: 60,
                                height: 60,
                                borderRadius: 20,
                                backgroundColor: Palette.background,
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                        >
                            <Image
                                source={require('@/assets/PokerPal.png')}
                                style={{ width: 60, height: 60, borderRadius: 20 }}
                                resizeMode="contain"
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.formContainer}>
                    <Text style={styles.title}>欢迎回来</Text>
                    <Text style={styles.subtitle}>请登录您的账户继续</Text>
                    {logoClickCount >= 7 && !adminVerified && (
                        <View style={{ marginBottom: 20 }}>
                            <View style={styles.inputContainer}>
                                <Ionicons name="key-outline" size={20} color="#7986CB" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="请输入管理员密码"
                                    placeholderTextColor="#9E9E9E"
                                    secureTextEntry
                                    value={adminPassword}
                                    onChangeText={setAdminPassword}
                                />
                            </View>
                            <PrimaryButton
                                title="验证管理员"
                                onPress={() => {
                                    if (adminPassword === '0000') {
                                        setAdminVerified(true)
                                        Toast.show({ type: 'success', text1: '验证成功，请继续注册' })
                                    } else {
                                        Toast.show({ type: 'error', text1: '密码错误' })
                                    }
                                }}
                                style={{ marginTop: 10 }}
                            />
                        </View>
                    )}

                    {!adminVerified && (
                        <>
                            <View style={styles.inputContainer}>

                                <Ionicons name="mail-outline" size={20} color="#7986CB" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="电子邮箱"
                                    placeholderTextColor="#9E9E9E"
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Ionicons name="lock-closed-outline" size={20} color="#7986CB" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="密码"
                                    placeholderTextColor="#9E9E9E"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                />
                                <TouchableOpacity onPress={toggleShowPassword} style={styles.eyeIcon}>
                                    <Ionicons
                                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                                        size={20}
                                        color="#9E9E9E"
                                    />
                                </TouchableOpacity>
                            </View>
                        </>
                    )}

                    {adminVerified && (
                        <>
                            <View style={styles.inputContainer}>
                                <Ionicons name="person-outline" size={20} color="#7986CB" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="昵称"
                                    placeholderTextColor="#9E9E9E"
                                    value={nickname}
                                    onChangeText={setNickname}
                                />
                            </View>
                            <View style={styles.inputContainer}>
                                <Ionicons name="mail-outline" size={20} color="#7986CB" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="电子邮箱"
                                    placeholderTextColor="#9E9E9E"
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                />
                            </View>
                            <View style={styles.inputContainer}>
                                <Ionicons name="lock-closed-outline" size={20} color="#7986CB" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="密码"
                                    placeholderTextColor="#9E9E9E"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                />
                            </View>
                        </>
                    )}
                    {error && (
                        <View style={styles.errorContainer}>
                            <Ionicons name="alert-circle-outline" size={18} color="#FF5252" />
                            <Text style={styles.error}>{error}</Text>
                        </View>
                    )}

                    {!adminVerified ? (
                        <PrimaryButton
                            title={loading ? '加载中...' : '登录'}
                            onPress={handleLogin}
                            style={styles.loginButton}
                            disabled={loading}
                            loading={loading}
                        />
                    ) : (
                        <PrimaryButton
                            title={loading ? '注册中...' : '注册管理员'}
                            onPress={handleAdminRegister}
                            style={styles.loginButton}
                            disabled={loading}
                            loading={loading}
                        />
                    )}
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}

export default LoginScreen
