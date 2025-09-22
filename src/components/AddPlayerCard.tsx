import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    Alert,
    TouchableOpacity,
    ScrollView,
    Image,
    ActivityIndicator
} from 'react-native';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Palette as color } from '@/constants';
import { useGameStore } from '@/stores/useGameStore';
import { logInfo, logSuccess } from '@/utils/useLogger';
import QRCode from 'react-native-qrcode-svg';
import { generateSecureId } from '@/utils/getSecureNumber';
import { startPlayerSyncListener, stopPlayerSyncListener } from '@/hooks/useSyncNewPlayersToStore';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';
import { collection, getDocs,Timestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { userByEmailDoc } from '@/constants/namingVar';
import { Ionicons } from '@expo/vector-icons';

interface AddPlayerCardProps {
    onConfirm: () => void;
    onCancel: () => void;
}

const Tab = {
    SCAN: 'scan',
    SELECT: 'select',
    MANUAL: 'manual'
};

const fetchUsersByEmail = async () => {
    const querySnapshot = await getDocs(collection(db, userByEmailDoc));
    const users = querySnapshot.docs.map((doc) => ({
        email: doc.id,
        uid: doc.data().uid || '',
        nickname: doc.data().nickname,
        photoURL: doc.data().photoURL,
        ...doc.data(),
    }));
    return users;
};

export const AddPlayerCard = ({ onConfirm: onAdd, onCancel }: AddPlayerCardProps) => {
    const [activeTab, setActiveTab] = useState(Tab.MANUAL);
    const [nickname, setNickname] = useState('');
    const [email, setEmail] = useState('');
    const [isFocused, setIsFocused] = useState({ nickname: false, email: false });
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);

    const addPlayer = usePlayerStore((state) => state.addPlayer);
    const players = usePlayerStore((state) => state.players); // Get current players from store
    const getGame = useGameStore((state) => state.getGame);
    const gameId = useGameStore((state) => state.gameId);
    const token = useGameStore((state) => state.token);

    const [registeredUsers, setRegisteredUsers] = useState<{ email: string, uid: string, nickname: string, photoURL?: string }[]>([]);
    const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (activeTab === Tab.SCAN && gameId) {
            // 开始监听
            startPlayerSyncListener(gameId, getGame().baseChipAmount, true, logInfo);
        }

        // 清理函数，组件卸载或者依赖变化时执行
        return () => {
            logSuccess('停止玩家同步监听', 'AddPlayerCard');
            stopPlayerSyncListener(logInfo);
        };
    }, [activeTab, gameId]);

    useEffect(() => {
        const loadUsers = async () => {
            setIsLoadingUsers(true);
            try {
                const users = await fetchUsersByEmail();
                setRegisteredUsers(users);
            } catch (error) {
                console.error('Error loading users:', error);
            } finally {
                setIsLoadingUsers(false);
            }
        };
        loadUsers();
    }, []);

    // Get the emails of existing players to filter them out
    const existingPlayerEmails = players.map(player => (player.email ?? '').toLowerCase()).filter(email => email);

    // Filter users: exclude those already added and match the search term
    const filteredUsers = registeredUsers.filter(user => 
        // Filter out existing players by email
        !existingPlayerEmails.includes(user.email.toLowerCase()) && 
        // Match search term
        (user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.nickname.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const toggleSelect = (email: string) => {
        setSelectedEmails((prev) =>
            prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
        );
    };

    const handleManualAdd = () => {
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

    const getQRCodeLink = () => {
        if (!gameId || !token) return '';
        return `https://hdpoker.xyz/join/${gameId}?token=${encodeURIComponent(token)}`;
    };

    const handleCopyLink = () => {
        const link = getQRCodeLink();
        if (link) {
            Clipboard.setStringAsync(link);
            Toast.show({
                type: 'success',
                text1: '已复制',
                text2: '加入链接已复制到剪贴板',
                position: 'bottom',
            });
        }
    };

    const handleAddSelectedPlayers = () => {
        if (selectedEmails.length === 0) {
            Alert.alert('提示', '请选择至少一名玩家');
            return;
        }


        selectedEmails.forEach(email => {
            const user = registeredUsers.find(u => u.email === email);
            if (!user) return;

            const newPlayer = {
                id: user.uid,
                playerId: user.uid,
                nickname: user.nickname,
                email,
                joinAt: new Date().toISOString(),
                photoURL: user.photoURL,
                buyInChipsList: [],
                buyInCount: 1,
                totalBuyInChips: getGame().baseChipAmount,
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

    const renderTabContent = () => {
        switch (activeTab) {
            case Tab.SCAN:
                return (
                    <View style={styles.tabContent}>
                        <View style={styles.qrContainer}>
                            <Text style={styles.qrTitle}>扫描二维码加入游戏</Text>
                            <View style={styles.qrWrapper}>
                                <QRCode value={getQRCodeLink()} size={200} backgroundColor={color.lightBackground} />
                            </View>
                            <TouchableOpacity
                                onPress={handleCopyLink}
                                style={styles.copyLinkButton}
                            >
                                <Ionicons name="copy-outline" size={20} color={color.lightText} />
                                <Text style={styles.copyLinkText}>复制邀请链接</Text>
                            </TouchableOpacity>

                            <Text style={styles.qrHelper}>
                                玩家扫描二维码后可直接加入游戏
                            </Text>
                        </View>
                    </View>
                );

            case Tab.SELECT:
                return (
                    <View style={styles.tabContent}>
                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={20} color={color.text} style={styles.searchIcon} />
                                <TextInput
                                style={styles.searchInput}
                                placeholder="搜索玩家（昵称或邮箱）"
                                value={searchTerm}
                                onChangeText={setSearchTerm}
                            />
                            {searchTerm ? (
                                <TouchableOpacity onPress={() => setSearchTerm('')} style={styles.clearSearch}>
                                    <Ionicons name="close-circle" size={18} color={color.mutedText} />
                                </TouchableOpacity>
                            ) : null}
                        </View>

                        {isLoadingUsers ? (
                            <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="large" color={color.info} />
                                <Text style={styles.loadingText}>正在加载玩家列表...</Text>
                            </View>
                        ) : filteredUsers.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="people" size={50} color={color.weakGray} />
                                <Text style={styles.emptyText}>
                                    {searchTerm ? '没有找到匹配的玩家' : existingPlayerEmails.length > 0 ? '没有更多可添加的玩家' : '暂无已注册玩家'}
                                </Text>
                                {existingPlayerEmails.length > 0 && !searchTerm && (
                                    <Text style={styles.emptySubText}>
                                        所有已注册的玩家都已添加到游戏中
                                    </Text>
                                )}
                            </View>
                        ) : (
                            <ScrollView style={styles.userList}>
                                {filteredUsers.map((user) => (
                                    <TouchableOpacity
                                        key={user.email}
                                        onPress={() => toggleSelect(user.email)}
                                        style={[
                                            styles.userItem,
                                            selectedEmails.includes(user.email) && styles.selectedUserItem
                                        ]}
                                    >
                                        <View style={styles.userItemContent}>
                                            <View style={styles.userAvatar}>
                                                {user.photoURL ? (
                                                    <Image
                                                        source={{ uri: user.photoURL }}
                                                        style={styles.avatarImage}
                                                    />
                                                ) : (
                                                    <Text style={styles.avatarText}>
                                                        {user.nickname?.charAt(0)?.toUpperCase() || 'U'}
                                                    </Text>
                                                )}
                                            </View>
                                            <View style={styles.userInfo}>
                                                <Text style={styles.userNickname}>{user.nickname}</Text>
                                                <Text style={styles.userEmail}>{user.email}</Text>
                                            </View>
                                            {selectedEmails.includes(user.email) && (
                                                <View style={styles.checkmark}>
                                                    <Ionicons name="checkmark-circle" size={24} color={color.info} />
                                                </View>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}

                        <PrimaryButton
                            title={`添加选中的玩家 (${selectedEmails.length})`}
                            onPress={handleAddSelectedPlayers}
                            style={[
                                styles.addSelectedButton,
                                selectedEmails.length === 0 && styles.disabledButton
                            ]}
                            textStyle={styles.addSelectedButtonText}
                            disabled={selectedEmails.length === 0}
                        />
                    </View>
                );

            case Tab.MANUAL:
                return (
                    <View style={styles.tabContent}>
                        <View style={styles.manualAddContainer}>
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>玩家昵称</Text>
                                <TextInput
                                        style={[styles.input, isFocused.nickname && styles.inputFocused]}
                                        placeholder="输入玩家昵称"
                                        placeholderTextColor={color.mutedText}
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
                                    placeholderTextColor={color.mutedText}
                                    value={email}
                                    keyboardType="email-address"
                                    onChangeText={setEmail}
                                    onFocus={() => setIsFocused(prev => ({ ...prev, email: true }))}
                                    onBlur={() => setIsFocused(prev => ({ ...prev, email: false }))}
                                    autoCapitalize="none"
                                />
                            </View>

                            <PrimaryButton
                                title="添加玩家"
                                onPress={handleManualAdd}
                                style={styles.addButton}
                                textStyle={styles.addButtonText}
                            />
                        </View>
                    </View>
                );

            default:
                return null;
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color={color.text} />
                </TouchableOpacity>

                <Text style={styles.title}>添加玩家</Text>

                {/* 选项卡导航 */}
                <View style={styles.tabBar}>
                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === Tab.MANUAL && styles.activeTabButton]}
                        onPress={() => setActiveTab(Tab.MANUAL)}
                    >
                        <Ionicons name="create-outline" size={22} color={activeTab === Tab.MANUAL ? color.info : color.text} />
                        <Text style={[styles.tabText, activeTab === Tab.MANUAL && styles.activeTabText]}>
                            手动添加
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === Tab.SELECT && styles.activeTabButton]}
                        onPress={() => setActiveTab(Tab.SELECT)}
                    >
                        <Ionicons name="people" size={22} color={activeTab === Tab.SELECT ? color.info : color.text} />
                        <Text style={[styles.tabText, activeTab === Tab.SELECT && styles.activeTabText]}>
                            选择玩家
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === Tab.SCAN && styles.activeTabButton]}
                        onPress={() => setActiveTab(Tab.SCAN)}
                    >
                        <Ionicons name="qr-code" size={22} color={activeTab === Tab.SCAN ? color.info : color.text} />
                        <Text style={[styles.tabText, activeTab === Tab.SCAN && styles.activeTabText]}>
                            扫码加入
                        </Text>
                    </TouchableOpacity>
                </View>

                {renderTabContent()}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
    },
    card: {
        backgroundColor: color.lightBackground,
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
        maxHeight: 600, // 限制最大高度，避免在小屏幕上显示不全
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: color.title,
        marginBottom: 20,
        textAlign: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 10,
        padding: 4,
    },

    // 选项卡相关样式
    tabBar: {
        flexDirection: 'row',
        marginBottom: 20,
        borderRadius: 12,
        backgroundColor: color.lightGray,
        padding: 4,
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 8,
        borderRadius: 10,
    },
    activeTabButton: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    tabText: {
        fontSize: 8,
        fontWeight: '500',
        color: color.text,
        marginLeft: 6,
    },
    activeTabText: {
        color: color.info || '#007AFF',
    },
    tabContent: {
        minHeight: 300,
    },

    // 手动添加相关样式
    manualAddContainer: {
        marginTop: 10,
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '500',
        color: color.title,
        marginBottom: 8,
    },
    optional: {
        fontSize: 14,
        color: color.weakGray,
        fontWeight: 'normal',
    },
    input: {
        borderWidth: 1,
        borderColor: color.borderColor || color.mediumGray,
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        backgroundColor: color.lightGray,
        color: color.title,
    },
    inputFocused: {
        borderColor: color.info,
        backgroundColor: color.lightBackground,
        shadowColor: color.info,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    addButton: {
        marginTop: 10,
        backgroundColor: color.confirm,
        borderRadius: 12,
        shadowColor: color.confirm,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    addButtonText: {
        color: color.lightText,
        fontWeight: '600',
    },

    // 选择玩家相关样式
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: color.lightGray,
        borderRadius: 12,
        paddingHorizontal: 12,
        marginBottom: 16,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        paddingVertical: 12,
    },
    clearSearch: {
        padding: 4,
    },
    userList: {
        maxHeight: 300,
    },
    userItem: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderColor: color.mediumGray,
    },
    selectedUserItem: {
        backgroundColor: color.info,
    },
    userItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: color.mediumGray,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    avatarText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: color.text,
    },
    userInfo: {
        flex: 1,
    },
    userNickname: {
        fontSize: 16,
        fontWeight: '500',
        color: color.title,
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        color: color.text,
    },
    checkmark: {
        marginLeft: 8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    loadingText: {
        marginTop: 12,
        color: color.text,
        fontSize: 14,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        marginTop: 12,
        color: color.text,
        fontSize: 15,
        textAlign: 'center',
    },
    emptySubText: {
        marginTop: 8,
        color: color.mutedText,
        fontSize: 13,
        textAlign: 'center',
    },
    addSelectedButton: {
        marginTop: 20,
        backgroundColor: color.confirm,
        borderRadius: 12,
    },
    addSelectedButtonText: {
        color: color.lightText,
        fontWeight: '600',
    },
    disabledButton: {
        backgroundColor: color.mediumGray,
        opacity: 0.7,
    },

    // 扫码加入相关样式
    qrContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
    },
    qrTitle: {
        fontSize: 16,
        color: color.title,
        fontWeight: '500',
        marginBottom: 20,
    },
    qrWrapper: {
    padding: 15,
    backgroundColor: color.lightBackground,
        borderRadius: 12,
    shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        marginBottom: 20,
    },
    copyLinkButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: color.info,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        marginTop: 10,
    },
    copyLinkText: {
        color: color.lightText,
        fontWeight: '500',
        marginLeft: 6,
    },
    qrHelper: {
        fontSize: 14,
        color: color.text,
        textAlign: 'center',
        marginTop: 20,
        lineHeight: 20,
    },
});