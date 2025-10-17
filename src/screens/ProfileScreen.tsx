import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    TextInput,
    Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Palette as color } from '@/constants';
import { Spacing, Radius, FontSize } from '@/constants/designTokens';
import { HomePagestyles as styles } from '@/assets/styles';
import { onAuthStateChanged, signOut } from '@/services/authService';
import { fetchUserProfile } from '@/firebase/getUserProfile';
import storage from '@/services/storageService';
import { CURRENT_USER_KEY, playerDoc, userByEmailDoc, userDoc } from '@/constants/namingVar';
import { UserProfile } from '@/types';
import Toast from 'react-native-toast-message';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { updateProfile } from 'firebase/auth';
import { getAuth } from 'firebase/auth';
import { usePopup } from '@/components/PopupProvider';

const ProfileScreen = () => {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [user, setUser] = useState<{
        uid: string;
        email?: string | null;
        displayName?: string | null;
        photoURL?: string | null;
        isAnonymous?: boolean;
        profile?: UserProfile;
    } | null>(null);
    const { confirmPopup: showPopup } = usePopup();
    // 编辑状态的数据
    const [editData, setEditData] = useState({
        nickname: '',
        email: '',
    });

    useEffect(() => {
        const unsub = onAuthStateChanged(async (u: any) => {
            if (!u) {
                setUser(null);
                setLoading(false);
                return;
            }

            try {
                const firestoreProfile = await fetchUserProfile(u.uid);

                const userWithProfile = {
                    uid: u.uid,
                    email: firestoreProfile?.email || u.email,
                    displayName: firestoreProfile?.nickname || u.displayName,
                    photoURL: firestoreProfile?.photoURL || u.photoURL,
                    isAnonymous: u.isAnonymous,
                    profile: firestoreProfile ? {
                        ...firestoreProfile,
                        uid: u.uid,
                        displayName: firestoreProfile.nickname,
                    } : undefined
                };

                setUser(userWithProfile);

                // 初始化编辑数据
                setEditData({
                    nickname: firestoreProfile?.nickname || u.displayName || '',
                    email: firestoreProfile?.email || u.email || '',
                });

            } catch (error) {
                console.warn('获取用户档案失败:', error);
                setUser({
                    uid: u.uid,
                    email: u.email,
                    displayName: u.displayName,
                    photoURL: u.photoURL,
                    isAnonymous: u.isAnonymous,
                    profile: undefined
                });

                setEditData({
                    nickname: u.displayName || '',
                    email: u.email || '',
                });
            } finally {
                setLoading(false);
            }
        });

        return () => unsub && unsub();
    }, []);

    const handleSave = async () => {
        if (!user?.uid) {
            Toast.show({
                type: 'error',
                text1: '保存失败',
                text2: '用户信息无效',
            });
            return;
        }

        try {
            const { nickname } = editData;

            // 验证输入 - 仅校验昵称
            if (!nickname.trim()) {
                Toast.show({
                    type: 'error',
                    text1: '保存失败',
                    text2: '昵称不能为空',
                });
                return;
            }

            // 更新 Firestore 用户档案（只更新 nickname）
            const userRef = doc(db, userDoc, user.uid);
            const userEmailRef = user.email ? doc(db, userByEmailDoc, user.email, playerDoc,user.email) : null;
            const updateData: any = {
                nickname: nickname.trim(),
                updatedAt: new Date().toISOString(),
            };

            await updateDoc(userRef, updateData);
            
            // 仅当用户有邮箱时才更新邮箱相关文档
            if (userEmailRef) {
                await updateDoc(userEmailRef, updateData);
            }

            // 更新 Firebase Auth 用户信息（displayName）
            const auth = getAuth();
            const currentUser = auth.currentUser;
            if (currentUser) {
                try {
                    await updateProfile(currentUser, {
                        displayName: nickname.trim(),
                    });
                } catch (authUpdateError) {
                    console.warn('Firebase Auth 更新失败:', authUpdateError);
                    // 不阻塞主流程，Firestore 更新已成功
                }
                    // 提示用户重新登录以刷新会话（使用应用统一弹窗）
                    try {
                        const confirmed = await showPopup({
                            title: '需要重新登录',
                            message: '为了确保所有服务使用新的昵称，建议您重新登录。是否现在退出登录并重新登录？',
                            note: '',
                            isWarning: true,
                        });

                        if (confirmed) {
                            try {
                                await signOut();
                                Toast.show({ type: 'success', text1: '已退出登录' });
                            } catch (e) {
                                Toast.show({ type: 'error', text1: '退出失败' });
                            }
                        }
                    } catch (popupError) {
                        // 如果弹窗失败，回退到简单提示
                        console.warn('showPopup 失败:', popupError);
                    }
            }

            // 更新本地状态（只修改 displayName 和 profile.nickname）
            setUser(prev => prev ? {
                ...prev,
                displayName: nickname.trim(),
                profile: prev.profile ? {
                    ...prev.profile,
                    nickname: nickname.trim(),
                    updatedAt: new Date().toISOString(),
                } : undefined
            } : null);

            // 更新本地存储（只更新 displayName）
            try {
                const storedUser = await storage.getLocal(CURRENT_USER_KEY);
                if (storedUser) {
                    const updatedStoredUser = {
                        ...storedUser,
                        displayName: nickname.trim(),
                    };
                    await storage.setLocal(CURRENT_USER_KEY, updatedStoredUser);
                }
            } catch (storageError) {
                console.warn('本地存储更新失败:', storageError);
                // 不阻塞主流程
            }

            Toast.show({
                type: 'success',
                text1: '档案已更新',
                text2: '您的个人信息已成功保存',
            });
            setEditing(false);
        } catch (error: any) {
            console.error('用户档案更新失败:', error);

            let errorMessage = '无法保存您的个人信息，请稍后再试';

            // 处理特定错误
            if (error?.code === 'permission-denied') {
                errorMessage = '权限不足，无法更新用户信息';
            } else if (error?.message?.includes('network')) {
                errorMessage = '网络连接异常，请检查网络后重试';
            }

            Toast.show({
                type: 'error',
                text1: '更新失败',
                text2: errorMessage,
            });
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            '确认退出',
            '您确定要退出登录吗？',
            [
                { text: '取消', style: 'cancel' },
                {
                    text: '退出',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await signOut();
                            Toast.show({
                                type: 'success',
                                text1: '已退出登录',
                            });
                            // 退出后导航到登录页面
                            (navigation as any).navigate('Login');
                        } catch (error) {
                            Toast.show({
                                type: 'error',
                                text1: '退出失败',
                                text2: '请稍后再试',
                            });
                        }
                    },
                },
            ]
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={color.primary} />
                <Text style={[styles.loadingText, { marginTop: Spacing.md }]}>加载用户信息...</Text>
            </View>
        );
    }

    if (!user || user.isAnonymous) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: Spacing.xl }]}>
                <MaterialCommunityIcons
                    name="account-off"
                    size={80}
                    color={color.mutedText}
                    style={{ marginBottom: Spacing.lg }}
                />
                <Text style={{
                    fontSize: FontSize.h2,
                    fontWeight: '700',
                    color: color.title,
                    textAlign: 'center',
                    marginBottom: Spacing.md,
                }}>
                    访客模式
                </Text>
                <Text style={{
                    fontSize: FontSize.body,
                    color: color.mutedText,
                    textAlign: 'center',
                    marginBottom: Spacing.xl,
                    lineHeight: 24,
                }}>
                    访客用户无法查看个人档案{'\n'}请登录以访问完整功能
                </Text>
                <PrimaryButton
                    title="返回首页"
                    onPress={() => navigation.goBack()}
                />
            </View>
        );
    }

    return (
        <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header Section */}
            <LinearGradient
                colors={[color.primary, color.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                    paddingTop: Spacing.xl,
                    paddingBottom: Spacing.xl,
                    marginBottom: Spacing.lg,
                }}
            >

                {/* Avatar and Basic Info */}
                <View style={{ alignItems: 'center' }}>
                    <View style={{
                        position: 'relative',
                        marginBottom: Spacing.md,
                    }}>
                        {user.photoURL ? (
                            <Image
                                source={{ uri: user.photoURL }}
                                style={{
                                    width: 120,
                                    height: 120,
                                    borderRadius: 60,
                                    borderWidth: 4,
                                    borderColor: color.lightText,
                                }}
                            />
                        ) : (
                            <View style={{
                                width: 120,
                                height: 120,
                                borderRadius: 60,
                                backgroundColor: 'rgba(255,255,255,0.3)',
                                borderWidth: 4,
                                borderColor: color.lightText,
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}>
                                <Text style={{
                                    fontSize: FontSize.h1,
                                    fontWeight: '800',
                                    color: color.lightText,
                                }}>
                                    {(user.displayName || '用户').slice(0, 1)}
                                </Text>
                            </View>
                        )}

                        {editing && (
                            <TouchableOpacity
                                style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    right: 0,
                                    backgroundColor: color.lightText,
                                    borderRadius: Radius.round,
                                    padding: Spacing.xs,
                                }}
                            >
                                <MaterialCommunityIcons name="camera" size={20} color={color.primary} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <Text style={{
                        fontSize: FontSize.h2,
                        fontWeight: '700',
                        color: color.lightText,
                        textAlign: 'center',
                    }}>
                        {user.displayName || '未命名用户'}
                    </Text>

                    <Text style={{
                        fontSize: FontSize.body,
                        color: 'rgba(255,255,255,0.8)',
                        textAlign: 'center',
                        marginTop: Spacing.xs,
                    }}>
                        {user.profile?.role || 'player'}
                    </Text>
                </View>
            </LinearGradient>

            <View style={{ paddingHorizontal: Spacing.lg }}>
                {/* Basic Information Card */}
                <View style={{
                    backgroundColor: color.lightBackground,
                    borderRadius: Radius.lg,
                    padding: Spacing.lg,
                    marginBottom: Spacing.md,
                    shadowColor: color.shadowLight,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 6,
                    elevation: 2,
                    borderWidth: 1,
                    borderColor: color.lightGray + '30',
                }}>
                    <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: Spacing.md,
                    }}>
                        <Text style={{
                            fontSize: FontSize.body,
                            fontWeight: '700',
                            color: color.title,
                        }}>
                            基本信息
                        </Text>

                        {!editing && (
                            <TouchableOpacity
                                onPress={() => setEditing(true)}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    paddingHorizontal: Spacing.sm,
                                    paddingVertical: Spacing.xs,
                                    borderRadius: Radius.sm,
                                    backgroundColor: color.primary + '15',
                                }}
                            >
                                <MaterialCommunityIcons
                                    name="pencil"
                                    size={16}
                                    color={color.primary}
                                    style={{ marginRight: Spacing.xs }}
                                />
                                <Text style={{
                                    fontSize: FontSize.small,
                                    color: color.primary,
                                    fontWeight: '600',
                                }}>
                                    编辑
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Nickname */}
                    <View style={{ marginBottom: Spacing.md }}>
                        <Text style={{
                            fontSize: FontSize.small,
                            fontWeight: '600',
                            color: color.mutedText,
                            marginBottom: Spacing.xs,
                        }}>
                            昵称
                        </Text>
                        <TextInput
                            value={editData.nickname}
                            onChangeText={(text) => setEditData(prev => ({ ...prev, nickname: text }))}
                            style={{
                                borderWidth: 1,
                                borderColor: color.lightGray,
                                borderRadius: Radius.md,
                                padding: Spacing.sm,
                                fontSize: FontSize.body,
                                color: color.text,
                            }}
                            placeholder="请输入昵称"
                            editable={editing}
                        />

                    </View>

                    {/* Email (只读，不能修改) */}
                    <View style={{ marginBottom: Spacing.md }}>
                        <Text style={{
                            fontSize: FontSize.small,
                            fontWeight: '600',
                            color: color.mutedText,
                            marginBottom: Spacing.xs,
                        }}>
                            邮箱
                        </Text>
                        <Text style={{
                            fontSize: FontSize.small,
                            color: color.mutedText,
                            fontFamily: 'monospace',
                        }}>
                            {user.email || '未设置'}
                        </Text>

                    </View>

                    {/* User ID */}
                    <View>
                        <Text style={{
                            fontSize: FontSize.small,
                            fontWeight: '600',
                            color: color.mutedText,
                            marginBottom: Spacing.xs,
                        }}>
                            用户ID
                        </Text>
                        <Text style={{
                            fontSize: FontSize.small,
                            color: color.mutedText,
                            fontFamily: 'monospace',
                        }}>
                            {user.uid}
                        </Text>
                    </View>
                </View>

                {/* Game Statistics Card */}
                {user.profile && (user.profile as any).gamesPlayed !== undefined && (
                    <View style={{
                        backgroundColor: color.lightBackground,
                        borderRadius: Radius.lg,
                        padding: Spacing.lg,
                        marginBottom: Spacing.md,
                        shadowColor: color.shadowLight,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 6,
                        elevation: 2,
                        borderWidth: 1,
                        borderColor: color.lightGray + '30',
                    }}>
                        <Text style={{
                            fontSize: FontSize.body,
                            fontWeight: '700',
                            color: color.title,
                            marginBottom: Spacing.md,
                        }}>
                            游戏统计
                        </Text>

                        <View style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            marginBottom: Spacing.sm,
                        }}>
                            <View style={{ flex: 1, alignItems: 'center' }}>
                                <Text style={{
                                    fontSize: FontSize.h2,
                                    fontWeight: '700',
                                    color: color.primary,
                                }}>
                                    {(user.profile as any).gamesPlayed || 0}
                                </Text>
                                <Text style={{
                                    fontSize: FontSize.small,
                                    color: color.mutedText,
                                }}>
                                    总游戏数
                                </Text>
                            </View>

                            <View style={{ flex: 1, alignItems: 'center' }}>
                                <Text style={{
                                    fontSize: FontSize.h2,
                                    fontWeight: '700',
                                    color: color.confirm,
                                }}>
                                    {(user.profile as any).wins || 0}
                                </Text>
                                <Text style={{
                                    fontSize: FontSize.small,
                                    color: color.mutedText,
                                }}>
                                    胜局
                                </Text>
                            </View>

                            <View style={{ flex: 1, alignItems: 'center' }}>
                                <Text style={{
                                    fontSize: FontSize.h2,
                                    fontWeight: '700',
                                    color: color.error,
                                }}>
                                    {(user.profile as any).losses || 0}
                                </Text>
                                <Text style={{
                                    fontSize: FontSize.small,
                                    color: color.mutedText,
                                }}>
                                    负局
                                </Text>
                            </View>
                        </View>

                        <View style={{
                            borderTopWidth: 1,
                            borderTopColor: color.lightGray + '40',
                            paddingTop: Spacing.md,
                            marginTop: Spacing.md,
                        }}>
                            <View style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                            }}>
                                <View style={{ flex: 1, alignItems: 'center' }}>
                                    <Text style={{
                                        fontSize: FontSize.h3,
                                        fontWeight: '700',
                                        color: (user.profile as any).totalProfit >= 0 ? color.confirm : color.error,
                                    }}>
                                        ${(user.profile as any).totalProfit || 0}
                                    </Text>
                                    <Text style={{
                                        fontSize: FontSize.small,
                                        color: color.mutedText,
                                    }}>
                                        总收益
                                    </Text>
                                </View>

                                <View style={{ flex: 1, alignItems: 'center' }}>
                                    <Text style={{
                                        fontSize: FontSize.h3,
                                        fontWeight: '700',
                                        color: (user.profile as any).averageROI >= 0 ? color.confirm : color.error,
                                    }}>
                                        {(((user.profile as any).averageROI || 0) * 100).toFixed(1)}%
                                    </Text>
                                    <Text style={{
                                        fontSize: FontSize.small,
                                        color: color.mutedText,
                                    }}>
                                        ROI
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                )}

                {/* Action Buttons */}
                {editing && (
                    <View style={{
                        backgroundColor: color.lightBackground,
                        borderRadius: Radius.lg,
                        padding: Spacing.lg,
                        marginBottom: Spacing.md,
                        shadowColor: color.shadowLight,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 6,
                        elevation: 2,
                        borderWidth: 1,
                        borderColor: color.lightGray + '30',
                    }}>
                        <View style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            gap: Spacing.md,
                        }}>
                            <TouchableOpacity
                                onPress={() => {
                                    setEditing(false);
                                    // 重置编辑数据
                                    setEditData({
                                        nickname: user?.displayName || '',
                                        email: user?.email || '',
                                    });
                                }}
                                style={{
                                    flex: 1,
                                    backgroundColor: 'transparent',
                                    borderWidth: 1.5,
                                    borderColor: color.mutedText,
                                    borderRadius: Radius.md,
                                    paddingVertical: Spacing.md,
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={{
                                    color: color.mutedText,
                                    fontWeight: '600',
                                }}>
                                    取消
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleSave}
                                style={{
                                    flex: 1,
                                    backgroundColor: color.primary,
                                    borderRadius: Radius.md,
                                    paddingVertical: Spacing.md,
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={{
                                    color: color.lightText,
                                    fontWeight: '600',
                                }}>
                                    保存
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Logout Button */}
                <View style={{
                    backgroundColor: color.lightBackground,
                    borderRadius: Radius.lg,
                    padding: Spacing.lg,
                    marginBottom: Spacing.xl,
                    shadowColor: color.shadowLight,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 6,
                    elevation: 2,
                    borderWidth: 1,
                    borderColor: color.lightGray + '30',
                }}>
                    <TouchableOpacity
                        onPress={handleLogout}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingVertical: Spacing.md,
                            borderWidth: 1.5,
                            borderColor: color.error + '60',
                            borderRadius: Radius.md,
                        }}
                    >
                        <MaterialCommunityIcons
                            name="logout"
                            size={20}
                            color={color.error}
                            style={{ marginRight: Spacing.sm }}
                        />
                        <Text style={{
                            color: color.error,
                            fontSize: FontSize.body,
                            fontWeight: '600',
                        }}>
                            退出登录
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
};

export default ProfileScreen;
