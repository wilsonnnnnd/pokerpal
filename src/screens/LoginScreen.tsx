import React, { useState, useEffect } from 'react'
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Image,
    StatusBar,
    SafeAreaView,
    Dimensions
} from 'react-native'
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/firebase/config'
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
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showPassword, setShowPassword] = useState(false)
    const user = useAuthStore((state) => state.user)

    const handleLogin = async () => {
        if (!email || !password) {
            setError('请输入电子邮箱和密码')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password)
            const user = userCredential.user
            console.log('✅ 登录成功:', user.email)
        } catch (err: any) {
            // 如果你想自动注册用户，可以取消注释这里 👇
            /*
            if (err.code === 'auth/user-not-found') {
              try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password)
                console.log('✅ 自动注册成功:', userCredential.user.email)
                navigation.replace('Home')
                return
              } catch (signupErr: any) {
                setError(signupErr.message)
              }
            } else {
              setError(err.message)
            }
            */

            // 自定义错误消息，更加用户友好
            if (err.code === 'auth/user-not-found') {
                setError('用户不存在，请检查您的邮箱或注册新账户')
            } else if (err.code === 'auth/wrong-password') {
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
                            onPress={() => {}}
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
                                source={require('../../assets/PokerPal.png')}
                                style={{ width: 60, height: 60, borderRadius: 20 }}
                                resizeMode="contain"
                            />
                            </TouchableOpacity>

                    </View>
                </View>

                <View style={styles.formContainer}>
                    <Text style={styles.title}>欢迎回来</Text>
                    <Text style={styles.subtitle}>请登录您的账户继续</Text>

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

                    {error && (
                        <View style={styles.errorContainer}>
                            <Ionicons name="alert-circle-outline" size={18} color="#FF5252" />
                            <Text style={styles.error}>{error}</Text>
                        </View>
                    )}


                    <PrimaryButton
                        title={loading ? '加载中...' : '登录'}
                        onPress={handleLogin}
                        style={styles.loginButton}
                        disabled={loading}
                        loading={loading}
                    />

                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}

export default LoginScreen

