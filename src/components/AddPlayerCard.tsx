import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Palette as color } from '@/constants';
import { useGameStore } from '@/stores/useGameStore';
import { logInfo } from '@/utils/useLogger';
import QRCode from 'react-native-qrcode-svg';
import { generateSecureId } from '@/utils/getSecureNumber';
import { startPlayerSyncListener, stopPlayerSyncListener } from '@/hooks/useSyncNewPlayersToStore';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { userByEmailDoc } from '@/constants/namingDb';

interface AddPlayerCardProps {
    onConfirm: () => void;
    onCancel: () => void;
}

const fetchUsersByEmail = async () => {
    const querySnapshot = await getDocs(collection(db, userByEmailDoc));
    const users = querySnapshot.docs.map((doc) => ({
        email: doc.id,
        uid: doc.data().uid || '',
        nickname: doc.data().nickname,
        ...doc.data(),
    }));
    console.log('Fetched users:', users);
    return users;
};

export const AddPlayerCard = ({ onConfirm: onAdd, onCancel }: AddPlayerCardProps) => {
    const [nickname, setNickname] = useState('');
    const [email, setEmail] = useState('');
    const [isFocused, setIsFocused] = useState({ nickname: false, email: false });
    const [showQRCode, setShowQRCode] = useState(false);
    const addPlayer = usePlayerStore((state) => state.addPlayer);
    const getGame = useGameStore((state) => state.getGame);
    const gameId = useGameStore((state) => state.gameId);
    const token = useGameStore((state) => state.token);
    const [registeredUsers, setRegisteredUsers] = useState<{ email: string, uid: string, nickname: string }[]>([]);
    const [selectedEmails, setSelectedEmails] = useState<string[]>([]);


    useEffect(() => {
        if (showQRCode && gameId) {
            // 开始监听
            startPlayerSyncListener(gameId, getGame().baseChipAmount, true, logInfo);
        }

        // 清理函数，组件卸载或者依赖变化时执行
        return () => {
            stopPlayerSyncListener(logInfo);
        };
    }, [showQRCode, gameId]);

    useEffect(() => {
        const loadUsers = async () => {
            const users = await fetchUsersByEmail();
            setRegisteredUsers(users);
        };
        loadUsers();
    }, []);

    const toggleSelect = (email: string) => {
        setSelectedEmails((prev) =>
            prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
        );
    };


    const handleAdd = () => {
        if (!nickname.trim()) {
            Alert.alert('提示', '请输入玩家昵称');
            return;
        }

        const newPlayer = {
            id: generateSecureId('player'),
            playerId: generateSecureId('player'),
            nickname,
            email: email.trim().toLowerCase(),
            joinAt: new Date().toISOString(),
            photoURL: undefined,
            buyInChipsList: [],
            buyInCount: 1,
            totalBuyInChips: getGame().baseChipAmount,
            totalBuyInCash: getGame().baseCashAmount,
            finalized: false,
            isActive: true,
            isSyncing: false,
        };


        logInfo('Player', `添加玩家: ${nickname}` + (email ? `(${email})` : '') + `, 加入时间: ${newPlayer.joinAt}`);

        addPlayer(newPlayer);
        setNickname('');
        setEmail('');
        stopPlayerSyncListener(logInfo);
        onAdd();

    };


    const handleCancel = () => {
        stopPlayerSyncListener(logInfo);
        onCancel();
    };

    const handleQRCode = () => {
        if (!gameId || !token) return '';
        return `https://hdpoker.xyz/join/${gameId}?token=${token}`;
    };

    const handleCopyLink = () => {
        const link = handleQRCode();
        if (link) {
            Clipboard.setStringAsync(link); // expo 版本
            Toast.show({
                type: 'success',
                text1: '已复制',
                text2: '加入链接已复制到剪贴板',
                position: 'bottom',
            });
        }
    };


    const handleAddSelectedPlayers = () => {
        const baseChipAmount = getGame().baseChipAmount;
        selectedEmails.forEach(email => {
            const user = registeredUsers.find(u => u.email === email);
            if (!user) return;

            const newPlayer = {
                id: user.uid,
                playerId: user.uid,
                nickname: user.nickname,
                email,
                joinAt: new Date().toISOString(),
                photoURL: undefined,
                buyInChipsList: [],
                buyInCount: 1,
                totalBuyInChips: baseChipAmount,
                totalBuyInCash: getGame().baseCashAmount,
                finalized: false,
                isActive: true,
                isSyncing: false,
            };


            addPlayer(newPlayer);
        });

        Toast.show({
            type: 'success',
            text1: '已添加玩家',
            text2: `${selectedEmails.length} 个用户已添加到游戏`,
            position: 'bottom',
        });

        setSelectedEmails([]);
        onAdd();
    };




    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
                    <Text style={styles.closeButtonText}>×</Text>
                </TouchableOpacity>
                <Text style={styles.title}>
                    {showQRCode ? '扫码加入游戏' : '添加玩家'}
                </Text>
                <PrimaryButton
                    title="添加所选玩家"
                    onPress={handleAddSelectedPlayers}
                />


                {registeredUsers.map((user) => (
                    <TouchableOpacity
                        key={user.email}
                        onPress={() => toggleSelect(user.email)}
                        style={{
                            padding: 12,
                            backgroundColor: selectedEmails.includes(user.email) ? '#e0f7fa' : '#fff',
                            borderBottomWidth: 1,
                            borderColor: '#eee',
                        }}
                    >
                        <Text>{user.email}</Text>
                        <Text style={{ fontSize: 12, color: '#666' }}>UID: {user.uid}</Text>
                    </TouchableOpacity>
                ))}

                {showQRCode ? (
                    <>
                        {/* 替换为你生成二维码的组件 */}
                        <View style={{ alignItems: 'center', marginVertical: 20 }}>
                            <Text style={{ fontSize: 16, color: '#555' }}>扫描下方二维码加入游戏：</Text>
                            <View style={{ marginTop: 16 }}>
                                <QRCode
                                    value={handleQRCode()}
                                    size={200}
                                />
                                <TouchableOpacity onPress={handleCopyLink}>
                                    <Text style={styles.copyableLink}>
                                        加入链接: {handleQRCode()}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </>
                ) : (
                    <>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>昵称</Text>
                            <TextInput
                                style={[styles.input, isFocused.nickname && styles.inputFocused]}
                                placeholder="输入玩家昵称"
                                placeholderTextColor={"#A0A0A0"}
                                value={nickname}
                                onChangeText={setNickname}
                                onFocus={() => setIsFocused(prev => ({ ...prev, nickname: true }))}
                                onBlur={() => setIsFocused(prev => ({ ...prev, nickname: false }))}
                            />
                        </View>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>邮箱 <Text style={styles.optional}>(选填)</Text></Text>
                            <TextInput
                                style={[styles.input, isFocused.email && styles.inputFocused]}
                                placeholder="输入玩家邮箱"
                                placeholderTextColor={"#A0A0A0"}
                                value={email}
                                keyboardType="email-address"
                                onChangeText={setEmail}
                                onFocus={() => setIsFocused(prev => ({ ...prev, email: true }))}
                                onBlur={() => setIsFocused(prev => ({ ...prev, email: false }))}
                            />
                        </View>
                    </>
                )}

                <View style={styles.buttonGroup}>
                    <PrimaryButton
                        title={showQRCode ? '返回添加' : '扫码加入'}
                        onPress={() => setShowQRCode(prev => !prev)}
                        style={styles.cancelButton}
                        textStyle={styles.cancelButtonText}
                    />
                    {!showQRCode && (
                        <PrimaryButton
                            title="添加"
                            onPress={handleAdd}
                            style={styles.addButton}
                            textStyle={styles.addButtonText}
                        />
                    )}
                </View>
            </View>

        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333333',
        marginBottom: 24,
        textAlign: 'center',
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333333',
        marginBottom: 8,
    },
    optional: {
        fontSize: 14,
        color: '#888888',
        fontWeight: 'normal',
    },
    input: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        backgroundColor: '#F9F9F9',
        color: '#333333',
    },
    inputFocused: {
        borderColor: color.info || '#007AFF',
        backgroundColor: '#FFFFFF',
        shadowColor: color.info || '#007AFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    copyableLink: {
        fontSize: 14,
        color: '#3498db', // 类似链接蓝色
        marginTop: 10,
        textDecorationLine: 'underline',
    },
    buttonGroup: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 32,
    },
    cancelButton: {
        flex: 1,
        marginRight: 10,
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    closeButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 10,
        backgroundColor: '#eee',
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
        elevation: 3,
    },
    closeButtonText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },

    cancelButtonText: {
        color: '#666666',
        fontWeight: '600',
    },
    addButton: {
        flex: 1,
        marginLeft: 10,
        backgroundColor: color.confirm || '#007AFF',
        borderRadius: 12,
        shadowColor: color.confirm || '#007AFF',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    addButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
});