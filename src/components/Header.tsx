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

    const defaultBackButton = (
        <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
    );

    return (
        <View style={[styles.header, { backgroundColor: color.card, paddingTop: insets.top, height: 56 + (Platform.OS === 'ios' ? insets.top : 0) }]}>
            <StatusBar barStyle="dark-content" backgroundColor={color.card} animated />
            <View style={styles.left}>{shouldShowBack ? defaultBackButton : left}</View>
            <Text style={styles.title}>{titles[route.name] || '页面'}</Text>
            <View style={styles.right}>{right}</View>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    left: { flex: 1 },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
        textAlign: 'center',
    },
    right: { flex: 1, alignItems: 'flex-end' },
});
