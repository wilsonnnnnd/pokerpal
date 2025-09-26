import React from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useHeaderSlot } from '@/stores/useHeaderSlotStore';
import { useRoute, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette as color } from '@/constants';
import { Spacing, Radius, FontSize } from '@/constants/designTokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// 导出可重用的头部按钮组件
export const HeaderButton = ({ 
    onPress, 
    iconName, 
    iconSize = 24,
    children 
}: { 
    onPress: () => void;
    iconName?: string;
    iconSize?: number;
    children?: React.ReactNode;
}) => (
    <TouchableOpacity 
        onPress={onPress}
        style={styles.headerButton}
        activeOpacity={0.7}
    >
        <LinearGradient
            colors={['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.1)']}
            style={styles.headerButtonGradient}
        >
            {iconName ? (
                <MaterialCommunityIcons 
                    name={iconName as any} 
                    size={iconSize} 
                    color={color.lightText} 
                />
            ) : children}
        </LinearGradient>
    </TouchableOpacity>
);

const titles: Record<string, { title: string; icon?: string }> = {
    Home: { title: '主页', icon: 'home' },
    GameSetup: { title: '游戏设置', icon: 'cog' },
    AddPlayer: { title: '添加玩家', icon: 'account-plus' },
    GamePlay: { title: '游戏进行中', icon: 'cards-playing-outline' },
    GameHistory: { title: '游戏记录', icon: 'history' },
    GameDetail: { title: '游戏详情', icon: 'information' },
    GamePlayerRank: { title: '玩家排名', icon: 'trophy' },
};

export const Header = () => {
    const { title, right, left } = useHeaderSlot();
    const route = useRoute();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();

    const shouldShowBack = route.name !== 'Home' && !left;
    const routeInfo = (titles as any)[(route as any).name];
    const fallbackTitle = title || routeInfo?.title || (route as any).name || '页面';
    const titleIcon = routeInfo?.icon;

    return (
        <LinearGradient
            colors={[color.primary, color.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
                styles.headerContainer,
                {
                    paddingTop: insets.top,
                    height: insets.top + 60,
                },
            ]}
        >
            <StatusBar
                barStyle="light-content"
                backgroundColor="transparent"
                translucent={Platform.OS === 'android'}
                animated
            />

            {/* 头部内容容器 */}
            <View style={styles.headerContent}>
                {/* 左侧按钮区域 */}
                <View style={styles.sideBox}>
                    {shouldShowBack ? (
                        <TouchableOpacity 
                            onPress={() => navigation.goBack()}
                            style={styles.backButton}
                            activeOpacity={0.7}
                        >
                            <LinearGradient
                                colors={['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.1)']}
                                style={styles.buttonGradient}
                            >
                                <MaterialCommunityIcons 
                                    name="arrow-left" 
                                    size={24} 
                                    color={color.lightText} 
                                />
                            </LinearGradient>
                        </TouchableOpacity>
                    ) : (
                        left
                    )}
                </View>

                {/* 中间标题区域 */}
                <View style={styles.centerBox}>
                    <View style={styles.titleContainer}>
                        {/* 标题图标 */}
                        {titleIcon && !title && (
                            <MaterialCommunityIcons 
                                name={titleIcon as any} 
                                size={22} 
                                color={color.lightText}
                                style={styles.titleIcon}
                            />
                        )}
                        
                        {/* 标题文本 */}
                        <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
                            {fallbackTitle}
                        </Text>
                    </View>
                    
                    {/* 标题下方的装饰线 */}
                    <LinearGradient
                        colors={['rgba(255, 255, 255, 0.6)', 'rgba(255, 255, 255, 0.2)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.titleUnderline}
                    />
                </View>

                {/* 右侧按钮区域 */}
                <View style={[styles.sideBox, { alignItems: 'flex-end' }]}>
                    {right}
                </View>
            </View>

            {/* 底部阴影装饰 */}
            <LinearGradient
                colors={['rgba(0, 0, 0, 0.1)', 'rgba(0, 0, 0, 0.05)', 'transparent']}
                style={styles.shadowGradient}
            />
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    headerContainer: {
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        zIndex: 1000,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.sm,
        height: 60,
    },
    sideBox: {
        width: 56,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backButton: {
        borderRadius: Radius.round,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    buttonGradient: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: Radius.round,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    centerBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: Spacing.sm,
        position: 'relative',
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleIcon: {
        marginRight: Spacing.xs,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    title: {
        fontSize: FontSize.h2,
        fontWeight: 'bold',
        color: color.lightText,
        textAlign: 'center',
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
        letterSpacing: 0.5,
    },
    titleUnderline: {
        position: 'absolute',
        bottom: -8,
        height: 2,
        width: '60%',
        borderRadius: 1,
    },
    shadowGradient: {
        position: 'absolute',
        bottom: -10,
        left: 0,
        right: 0,
        height: 10,
    },
    rightButtonEnhancement: {
        // 为右侧按钮提供增强样式
        // 如果需要可以添加特定样式
    },
    headerButton: {
        borderRadius: Radius.round,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    headerButtonGradient: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: Radius.round,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    // 保留原有样式以防兼容性问题
    header: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 16,
    },
});
