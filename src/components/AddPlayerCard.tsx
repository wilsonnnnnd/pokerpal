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
import { logInfo } from '@/utils/useLogger';
import QRCode from 'react-native-qrcode-svg';
import { generateSecureId } from '@/utils/getSecureNumber';
import { startPlayerSyncListener, stopPlayerSyncListener } from '@/hooks/useSyncNewPlayersToStore';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import usePermission from '@/hooks/usePermission';
import { AddPlayerCardProps, AddPlayerTab } from '@/types';
import { AddPlayerCardStyles } from '@/assets/styles';
import { fetchUsersByHostname } from '@/firebase/fetchUser';
import { onAuthStateChanged } from '@/services/authService';


export const AddPlayerCard = ({ onConfirm: onAdd, onCancel }: AddPlayerCardProps) => {
    const [activeTab, setActiveTab] = useState(AddPlayerTab.MANUAL);
    const [nickname, setNickname] = useState('');
    const [email, setEmail] = useState('');
    const [isFocused, setIsFocused] = useState({ nickname: false, email: false });
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);
    const { isHost } = usePermission();
    const addPlayer = usePlayerStore((state) => state.addPlayer);
    const players = usePlayerStore((state) => state.players); // Get current players from store
    const getGame = useGameStore((state) => state.getGame);
    const gameId = useGameStore((state) => state.gameId);
    const token = useGameStore((state) => state.token);

    const [registeredUsers, setRegisteredUsers] = useState<{ email: string, uid: string, nickname: string, photoURL?: string }[]>([]);
    const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentUser, setCurrentUser] = useState<{ displayName?: string; isAnonymous?: boolean } | null>(null);

    // 监听当前用户状态
    useEffect(() => {
        const unsub = onAuthStateChanged((user: any) => {
            setCurrentUser(user);
        });
        return () => unsub && unsub();
    }, []);

    useEffect(() => {
        if (isHost && activeTab === AddPlayerTab.SCAN && gameId) {
            startPlayerSyncListener(gameId, getGame().baseChipAmount, true);
            // 清理函数
            return () => {
                stopPlayerSyncListener();
            };
        }
        return () => { /* no-op when not scanning */ };
    }, [activeTab, gameId, isHost]);


    useEffect(() => {
        // Only load registered users for hosts
        if (!isHost) {
            setIsLoadingUsers(false);
            return;
        }

        const loadUsers = async () => {
            setIsLoadingUsers(true);
            try {
                let users: { email: string, uid: string, nickname: string, photoURL?: string }[] = [];
                
                if (currentUser && !currentUser.isAnonymous && currentUser.displayName) {
                    // 使用 hostname 方式获取用户
                    users = await fetchUsersByHostname(currentUser.displayName);
                }
                
                setRegisteredUsers(users);
            } catch (error) {
                console.error('Error loading users:', error);
                // 错误时清空数据
                setRegisteredUsers([]);
            } finally {
                setIsLoadingUsers(false);
            }
        };
        loadUsers();
    }, [isHost, currentUser]);

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
        stopPlayerSyncListener();
        onAdd();
    };

    const handleCancel = () => {
        stopPlayerSyncListener();
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
            case AddPlayerTab.SCAN:
                return (
                    <View style={AddPlayerCardStyles.tabContent}>
                        <View style={AddPlayerCardStyles.qrContainer}>
                            <Text style={AddPlayerCardStyles.qrTitle}>扫描二维码加入游戏</Text>
                            <View style={AddPlayerCardStyles.qrWrapper}>
                                <QRCode value={getQRCodeLink()} size={200} backgroundColor={color.lightBackground} />
                            </View>
                            <TouchableOpacity
                                onPress={handleCopyLink}
                                style={AddPlayerCardStyles.copyLinkButton}
                            >
                                <Ionicons name="copy-outline" size={20} color={color.lightText} />
                                <Text style={AddPlayerCardStyles.copyLinkText}>复制邀请链接</Text>
                            </TouchableOpacity>

                            <Text style={AddPlayerCardStyles.qrHelper}>
                                玩家扫描二维码后可直接加入游戏
                            </Text>
                        </View>
                    </View>
                );

            case AddPlayerTab.SELECT:
                return (
                    <View style={AddPlayerCardStyles.tabContent}>
                        <View style={AddPlayerCardStyles.searchContainer}>
                            <Ionicons name="search" size={20} color={color.text} style={AddPlayerCardStyles.searchIcon} />
                            <TextInput
                                style={AddPlayerCardStyles.searchInput}
                                placeholder="搜索玩家（昵称或邮箱）"
                                value={searchTerm}
                                onChangeText={setSearchTerm}
                            />
                            {searchTerm ? (
                                <TouchableOpacity onPress={() => setSearchTerm('')} style={AddPlayerCardStyles.clearSearch}>
                                    <Ionicons name="close-circle" size={18} color={color.mutedText} />
                                </TouchableOpacity>
                            ) : null}
                        </View>

                        {isLoadingUsers ? (
                            <View style={AddPlayerCardStyles.loadingContainer}>
                                <ActivityIndicator size="large" color={color.info} />
                                <Text style={AddPlayerCardStyles.loadingText}>正在加载玩家列表...</Text>
                            </View>
                        ) : filteredUsers.length === 0 ? (
                            <View style={AddPlayerCardStyles.emptyContainer}>
                                <Ionicons name="people" size={50} color={color.weakGray} />
                                <Text style={AddPlayerCardStyles.emptyText}>
                                    {searchTerm ? '没有找到匹配的玩家' : existingPlayerEmails.length > 0 ? '没有更多可添加的玩家' : '暂无已注册玩家'}
                                </Text>
                                {existingPlayerEmails.length > 0 && !searchTerm && (
                                    <Text style={AddPlayerCardStyles.emptySubText}>
                                        所有已注册的玩家都已添加到游戏中
                                    </Text>
                                )}
                            </View>
                        ) : (
                            <ScrollView style={AddPlayerCardStyles.userList}>
                                {filteredUsers.map((user) => (
                                    <TouchableOpacity
                                        key={user.email}
                                        onPress={() => toggleSelect(user.email)}
                                        style={[
                                            AddPlayerCardStyles.userItem,
                                            selectedEmails.includes(user.email) && AddPlayerCardStyles.selectedUserItem
                                        ]}
                                    >
                                        <View style={AddPlayerCardStyles.userItemContent}>
                                            <View style={AddPlayerCardStyles.userAvatar}>
                                                {user.photoURL ? (
                                                    <Image
                                                        source={{ uri: user.photoURL }}
                                                        style={AddPlayerCardStyles.avatarImage}
                                                    />
                                                ) : (
                                                    <Text style={AddPlayerCardStyles.avatarText}>
                                                        {user.nickname?.charAt(0)?.toUpperCase() || 'U'}
                                                    </Text>
                                                )}
                                            </View>
                                            <View style={AddPlayerCardStyles.userInfo}>
                                                <Text style={AddPlayerCardStyles.userNickname}>{user.nickname}</Text>
                                                <Text style={AddPlayerCardStyles.userEmail}>{user.email}</Text>
                                            </View>
                                            {selectedEmails.includes(user.email) && (
                                                <View style={AddPlayerCardStyles.checkmark}>
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
                                AddPlayerCardStyles.addSelectedButton,
                                selectedEmails.length === 0 && AddPlayerCardStyles.disabledButton
                            ]}
                            textStyle={AddPlayerCardStyles.addSelectedButtonText}
                            disabled={selectedEmails.length === 0}
                        />
                    </View>
                );

            case AddPlayerTab.MANUAL:
                return (
                    <View style={AddPlayerCardStyles.tabContent}>
                        <View style={AddPlayerCardStyles.manualAddContainer}>
                            <View style={AddPlayerCardStyles.inputContainer}>
                                <Text style={AddPlayerCardStyles.label}>玩家昵称</Text>
                                <TextInput
                                    style={[AddPlayerCardStyles.input, isFocused.nickname && AddPlayerCardStyles.inputFocused]}
                                    placeholder="输入玩家昵称"
                                    placeholderTextColor={color.mutedText}
                                    value={nickname}
                                    onChangeText={setNickname}
                                    onFocus={() => setIsFocused(prev => ({ ...prev, nickname: true }))}
                                    onBlur={() => setIsFocused(prev => ({ ...prev, nickname: false }))}
                                />
                            </View>

                            <View style={AddPlayerCardStyles.inputContainer}>
                                <Text style={AddPlayerCardStyles.label}>邮箱 <Text style={AddPlayerCardStyles.optional}>(选填)</Text></Text>
                                <TextInput
                                    style={[AddPlayerCardStyles.input, isFocused.email && AddPlayerCardStyles.inputFocused]}
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
                                style={AddPlayerCardStyles.addButton}
                                textStyle={AddPlayerCardStyles.addButtonText}
                            />
                        </View>
                    </View>
                );

            default:
                return null;
        }
    };

    return (
        <View style={AddPlayerCardStyles.container}>
            <View style={AddPlayerCardStyles.card}>
                <TouchableOpacity onPress={handleCancel} style={AddPlayerCardStyles.closeButton}>
                    <Ionicons name="close" size={24} color={color.text} />
                </TouchableOpacity>

                <Text style={AddPlayerCardStyles.title}>添加玩家</Text>

                {/* 选项卡导航：非房主只显示手动添加 */}

                <View style={AddPlayerCardStyles.tabBar}>
                    <TouchableOpacity
                        style={[AddPlayerCardStyles.tabButton, activeTab === AddPlayerTab.MANUAL && AddPlayerCardStyles.activeTabButton]}
                        onPress={() => setActiveTab(AddPlayerTab.MANUAL)}
                    >
                        <Ionicons name="create-outline" size={22} color={activeTab === AddPlayerTab.MANUAL ? color.info : color.text} />
                        <Text style={[AddPlayerCardStyles.tabText, activeTab === AddPlayerTab.MANUAL && AddPlayerCardStyles.activeTabText]}>手动添加</Text>
                    </TouchableOpacity>
                    {isHost ? (
                        <>
                            <TouchableOpacity
                                style={[AddPlayerCardStyles.tabButton, activeTab === AddPlayerTab.SELECT && AddPlayerCardStyles.activeTabButton]}
                                onPress={() => setActiveTab(AddPlayerTab.SELECT)}
                            >
                                <Ionicons name="people" size={22} color={activeTab === AddPlayerTab.SELECT ? color.info : color.text} />
                                <Text style={[AddPlayerCardStyles.tabText, activeTab === AddPlayerTab.SELECT && AddPlayerCardStyles.activeTabText]}>选择玩家</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[AddPlayerCardStyles.tabButton, activeTab === AddPlayerTab.SCAN && AddPlayerCardStyles.activeTabButton]}
                                onPress={() => setActiveTab(AddPlayerTab.SCAN)}
                            >
                                <Ionicons name="qr-code" size={22} color={activeTab === AddPlayerTab.SCAN ? color.info : color.text} />
                                <Text style={[AddPlayerCardStyles.tabText, activeTab === AddPlayerTab.SCAN && AddPlayerCardStyles.activeTabText]}>扫码加入</Text>
                            </TouchableOpacity>
                        </>
                    ) : null}
                </View>


                {renderTabContent()}
            </View>
        </View>
    );
};

