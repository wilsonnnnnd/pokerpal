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
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { Palette as color } from '@/constants';
import simpleT from '@/i18n/simpleT';
import { useGameStore } from '@/stores/useGameStore';
import { logInfo } from '@/utils/useLogger';
import Avatar from '@/components/common/Avatar';
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
    const [currentUser, setCurrentUser] = useState<{ email?: string; isAnonymous?: boolean } | null>(null);

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
                
                if (currentUser && !currentUser.isAnonymous && currentUser.email) {
                    // 使用 hostname 方式获取用户
                    users = await fetchUsersByHostname(currentUser.email);
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
            Alert.alert(simpleT('addplayer_alert_title'), simpleT('addplayer_enter_nickname_msg'));
            return;
        }

        const newPlayer = {
            id: generateSecureId('player'),
            playerId: generateSecureId('player'),
            nickname,
            email: email.trim().toLowerCase(),
            joinAt: new Date().toISOString(),
            photoURL: undefined,
            buyInChipsList: [getGame().baseChipAmount],
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
                text1: simpleT('addplayer_copy_success_title'),
                text2: simpleT('addplayer_copy_success_msg'),
                position: 'bottom',
            });
        }
    };

    const handleAddSelectedPlayers = () => {
        if (selectedEmails.length === 0) {
            Alert.alert(simpleT('addplayer_alert_title'), simpleT('addplayer_select_at_least_one_msg'));
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
            text1: simpleT('addplayer_add_selected_success_title'),
            text2: simpleT('addplayer_add_selected_success_msg', undefined, { count: selectedEmails.length }),
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
                            <Text style={AddPlayerCardStyles.qrTitle}>{simpleT('addplayer_qr_title')}</Text>
                            <View style={AddPlayerCardStyles.qrWrapper}>
                                <QRCode value={getQRCodeLink()} size={200} backgroundColor={color.lightBackground} />
                            </View>
                            <TouchableOpacity
                                onPress={handleCopyLink}
                                style={AddPlayerCardStyles.copyLinkButton}
                            >
                                <Ionicons name="copy-outline" size={20} color={color.lightText} />
                                <Text style={AddPlayerCardStyles.copyLinkText}>{simpleT('addplayer_copy_link')}</Text>
                            </TouchableOpacity>

                            <Text style={AddPlayerCardStyles.qrHelper}>
                                {simpleT('addplayer_qr_helper')}
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
                                placeholder={simpleT('addplayer_search_placeholder')}
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
                                <Text style={AddPlayerCardStyles.loadingText}>{simpleT('addplayer_loading_players')}</Text>
                            </View>
                        ) : filteredUsers.length === 0 ? (
                            <View style={AddPlayerCardStyles.emptyContainer}>
                                <Ionicons name="people" size={50} color={color.weakGray} />
                                    <Text style={AddPlayerCardStyles.emptyText}>
                                    {searchTerm ? simpleT('addplayer_no_match') : existingPlayerEmails.length > 0 ? simpleT('addplayer_no_more') : simpleT('addplayer_no_registered')}
                                </Text>
                                {existingPlayerEmails.length > 0 && !searchTerm && (
                                        <Text style={AddPlayerCardStyles.emptySubText}>
                                        {simpleT('addplayer_all_added_subtext')}
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
                                            <Avatar
                                                uri={user.photoURL}
                                                name={user.nickname}
                                                size={40}
                                                style={AddPlayerCardStyles.userAvatar}
                                                imageStyle={AddPlayerCardStyles.avatarImage}
                                                textStyle={AddPlayerCardStyles.avatarText}
                                                accessibilityLabel={user.photoURL ? `${user.nickname}的头像照片` : `${user.nickname}的头像`}
                                            />
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
                            title={simpleT('addplayer_add_selected_title', undefined, { count: selectedEmails.length })}
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
                                    <Text style={AddPlayerCardStyles.label}>{simpleT('addplayer_manual_label_nickname')}</Text>
                                <TextInput
                                    style={[AddPlayerCardStyles.input, isFocused.nickname && AddPlayerCardStyles.inputFocused]}
                                    placeholder={simpleT('addplayer_manual_placeholder_nickname')}
                                    placeholderTextColor={color.mutedText}
                                    value={nickname}
                                    onChangeText={setNickname}
                                    onFocus={() => setIsFocused(prev => ({ ...prev, nickname: true }))}
                                    onBlur={() => setIsFocused(prev => ({ ...prev, nickname: false }))}
                                />
                            </View>

                            <View style={AddPlayerCardStyles.inputContainer}>
                                <Text style={AddPlayerCardStyles.label}>{simpleT('addplayer_manual_label_email')} <Text style={AddPlayerCardStyles.optional}>{simpleT('addplayer_optional')}</Text></Text>
                                <TextInput
                                    style={[AddPlayerCardStyles.input, isFocused.email && AddPlayerCardStyles.inputFocused]}
                                    placeholder={simpleT('addplayer_manual_placeholder_email')}
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
                                title={simpleT('addplayer_add_button')}
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

                <Text style={AddPlayerCardStyles.title}>{simpleT('addplayer_title')}</Text>

                {/* 选项卡导航：非房主只显示手动添加 */}

                <View style={AddPlayerCardStyles.tabBar}>
                    <TouchableOpacity
                        style={[AddPlayerCardStyles.tabButton, activeTab === AddPlayerTab.MANUAL && AddPlayerCardStyles.activeTabButton]}
                        onPress={() => setActiveTab(AddPlayerTab.MANUAL)}
                    >
                        <Ionicons name="create-outline" size={22} color={activeTab === AddPlayerTab.MANUAL ? color.info : color.text} />
                        <Text style={[AddPlayerCardStyles.tabText, activeTab === AddPlayerTab.MANUAL && AddPlayerCardStyles.activeTabText]}>{simpleT('addplayer_tab_manual')}</Text>
                    </TouchableOpacity>
                    {isHost ? (
                        <>
                            <TouchableOpacity
                                style={[AddPlayerCardStyles.tabButton, activeTab === AddPlayerTab.SELECT && AddPlayerCardStyles.activeTabButton]}
                                onPress={() => setActiveTab(AddPlayerTab.SELECT)}
                            >
                                <Ionicons name="people" size={22} color={activeTab === AddPlayerTab.SELECT ? color.info : color.text} />
                                <Text style={[AddPlayerCardStyles.tabText, activeTab === AddPlayerTab.SELECT && AddPlayerCardStyles.activeTabText]}>{simpleT('addplayer_tab_select')}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[AddPlayerCardStyles.tabButton, activeTab === AddPlayerTab.SCAN && AddPlayerCardStyles.activeTabButton]}
                                onPress={() => setActiveTab(AddPlayerTab.SCAN)}
                            >
                                <Ionicons name="qr-code" size={22} color={activeTab === AddPlayerTab.SCAN ? color.info : color.text} />
                                <Text style={[AddPlayerCardStyles.tabText, activeTab === AddPlayerTab.SCAN && AddPlayerCardStyles.activeTabText]}>{simpleT('addplayer_tab_scan')}</Text>
                            </TouchableOpacity>
                        </>
                    ) : null}
                </View>


                {renderTabContent()}
            </View>
        </View>
    );
};

