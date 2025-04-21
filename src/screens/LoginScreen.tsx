import React, { useState } from 'react'
import { View, StyleSheet, TextInput, Button, Text, Alert } from 'react-native'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase/config'
import { useNavigation } from '@react-navigation/native'
import { useAuthStore } from '../stores'

const LoginScreen = () => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const navigation = useNavigation()
    const login = useAuthStore((state) => state.login)

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('请输入邮箱和密码')
            return
        }

        setLoading(true)
        try {
            const result = await signInWithEmailAndPassword(auth, email, password)
            const { uid, email: userEmail } = result.user
            login({ uid, email: userEmail || '' })

            Alert.alert('登录成功', `欢迎回来！`)
            navigation.navigate('Home')
        } catch (error: any) {
            Alert.alert('登录失败', error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>PokerPal 登录</Text>

            <TextInput
                style={styles.input}
                placeholder="邮箱"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
            />

            <TextInput
                style={styles.input}
                placeholder="密码"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />

            <Button title={loading ? '登录中...' : '登录'} onPress={handleLogin} disabled={loading} />
        </View>
    )
}

export default LoginScreen

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 24,
        textAlign: 'center',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
    },
})
