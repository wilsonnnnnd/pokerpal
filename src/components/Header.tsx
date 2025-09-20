import React from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, Platform } from 'react-native';
import { useHeaderSlot } from '@/stores/useHeaderSlotStore';
import { useRoute, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette as color } from '@/constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const titles: Record<string, string> = {
    Home: '主页',
    GameSetup: '游戏设置',
    AddPlayer: '添加玩家',
    GamePlay: '游戏进行中',
    GameHistory: '游戏记录',
    GameDetail: '游戏详情',
    GamePlayerRank: '玩家排名',
};

export const Header = () => {
    const { title, right, left } = useHeaderSlot();
    const route = useRoute();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();

    const shouldShowBack = route.name !== 'Home' && !left;
    const fallbackTitle =
        title || (titles as any)[(route as any).name] || (route as any).name || '页面';

    return (
        <View
            style={[
                styles.header,
                {
                    paddingTop: insets.top,               // 顶部安全区
                    height: insets.top + 56,              // 总高度 = 安全区 + 标准栏高
                    backgroundColor: color.card,
                },
            ]}
        >
            <StatusBar
                barStyle="dark-content"
                backgroundColor={color.card}           // Android 与 header 同色
                translucent={false}
                animated
            />

            {/* 左侧固定宽度区域 */}
            <View style={styles.sideBox}>
                {shouldShowBack ? (
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <MaterialCommunityIcons name="arrow-left" size={24} color={color.title} />
                    </TouchableOpacity>
                ) : (
                    left
                )}
            </View>

            {/* 中间标题区域，flex:1 居中，不受两侧影响 */}
            <View style={styles.centerBox}>
                <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
                    {fallbackTitle}
                </Text>
            </View>

            {/* 右侧固定宽度区域 */}
            <View style={[styles.sideBox, { alignItems: 'flex-end' }]}>{right}</View>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'flex-end', // 让内容靠在安全区下沿
        paddingHorizontal: 16,
    },
    sideBox: {
        width: 56,              // 固定宽度，确保中间“视觉居中”
        height: 56,
        justifyContent: 'center',
    },
    centerBox: {
        flex: 1,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: color.title,
        textAlign: 'center',
    },
});
