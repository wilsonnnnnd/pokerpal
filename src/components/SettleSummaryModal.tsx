import React, { useEffect, useState } from 'react';
import { GamePlaystyles as styles } from "@/assets/styles";
import { Spacing, Radius, FontSize, Elevation } from '@/constants/designTokens';
import { Gradients } from '@/constants/gradients';
import { Player } from "@/types";
import { FlatList, Modal, View, Text, TouchableOpacity, Image } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PrimaryButton } from "./PrimaryButton";
import { useGameStore } from "@/stores/useGameStore";
import { useSettings } from '@/providers/SettingsProvider';
import { Palette } from '@/constants/color.palette';
// no currency settings anymore

// small helper to render initials
function initials(name?: string) {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}


// 结算总览弹窗
export function SettleSummaryModal({
    players,
    onConfirm,
    onCancel,
    isLoading = false,
}: {
    players: Player[];
    onConfirm: () => void;
    onCancel: () => void;
    isLoading?: boolean;
}) {
    const { currency, formatCurrency } = useSettings();
    const baseChipAmount = useGameStore.getState().baseChipAmount;
    const baseCashAmount = useGameStore.getState().baseCashAmount;
    // currency removed: show numeric cash differences
    return (
        <Modal transparent animationType="fade">
            <View style={styles.overlay}>
                <LinearGradient
                    colors={['#FFFFFF', '#FFFFFF']}
                    style={[styles.summaryModal, {
                        borderRadius: Radius.lg,
                        elevation: Elevation.overlay,
                        shadowColor: Palette.shadowDark,
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.25,
                        shadowRadius: 16,
                    }]}
                >
                    {/* Header */}
                    <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: Spacing.lg,
                        paddingBottom: Spacing.md,
                        borderBottomWidth: 1,
                        borderBottomColor: Palette.mediumGray,
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <MaterialCommunityIcons 
                                name="chart-line" 
                                size={28} 
                                color={Palette.primary} 
                                style={{ marginRight: Spacing.sm }}
                            />
                            <Text style={[styles.summaryTitle, {
                                fontSize: FontSize.h2,
                                fontWeight: '700',
                                color: Palette.valueText,
                            }]}>结算总览</Text>
                        </View>
                        <View style={{
                            backgroundColor: Palette.info + '20',
                            paddingHorizontal: Spacing.sm,
                            paddingVertical: Spacing.xs,
                            borderRadius: Radius.sm,
                        }}>
                            <Text style={{
                                color: Palette.info,
                                fontSize: FontSize.small,
                                fontWeight: '600',
                            }}>
                                {players.length} 位玩家
                            </Text>
                        </View>
                    </View>

                    {/* List */}
                    <FlatList
                        data={players}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ paddingVertical: Spacing.xs }}
                        renderItem={({ item }) => {
                            const chipCount = item.settleChipCount ?? 0;
                            const buyIn = item.totalBuyInChips ?? 0;
                            const chipDiff = chipCount - buyIn;
                            const cashDiff = baseChipAmount === 0 ? 0 : chipDiff / (baseChipAmount / baseCashAmount);
                            const positive = cashDiff >= 0;
                            const currency = (global as any).__pokerpal_settings?.currency ?? 'AUD';
                            return (
                                <View style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    paddingVertical: Spacing.md,
                                    paddingHorizontal: Spacing.md,
                                    marginVertical: Spacing.xs,
                                    backgroundColor: Palette.lightGray,
                                    borderRadius: Radius.md,
                                    elevation: 1,
                                    shadowColor: Palette.shadowLight,
                                    shadowOffset: { width: 0, height: 1 },
                                    shadowOpacity: 0.1,
                                    shadowRadius: 2,
                                }}>
                                    {/* 玩家信息 */}
                                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                                        {item.photoURL ? (
                                            <View style={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: Radius.lg,
                                                marginRight: Spacing.md,
                                                overflow: 'hidden',
                                                borderWidth: 2,
                                                borderColor: positive ? Palette.success : Palette.error,
                                            }}>
                                                <Image
                                                    source={{ uri: item.photoURL }}
                                                    style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        resizeMode: 'cover',
                                                    }}
                                                    onError={() => {
                                                        // 如果头像加载失败，可以在这里处理回退逻辑
                                                        console.log('头像加载失败:', item.photoURL);
                                                    }}
                                                />
                                            </View>
                                        ) : (
                                            <LinearGradient
                                                colors={positive ? ['#4CAF50', '#45a049'] : ['#f44336', '#d32f2f']}
                                                style={{
                                                    width: 40,
                                                    height: 40,
                                                    borderRadius: Radius.lg,
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    marginRight: Spacing.md,
                                                }}
                                            >
                                                <Text style={{ 
                                                    fontWeight: '700', 
                                                    color: 'white',
                                                    fontSize: FontSize.small,
                                                }}>
                                                    {initials(item.nickname)}
                                                </Text>
                                            </LinearGradient>
                                        )}
                                        <View style={{ flex: 1 }}>
                                            <Text style={{
                                                fontWeight: '600',
                                                fontSize: FontSize.body,
                                                color: Palette.valueText,
                                            }}>
                                                {item.nickname}
                                            </Text>
                                            <Text style={{
                                                fontSize: FontSize.small,
                                                color: Palette.mutedText,
                                                marginTop: 2,
                                            }}>
                                                买入: {buyIn} → 结算: {chipCount}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* 盈亏显示 */}
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <View style={{
                                            paddingVertical: Spacing.xs,
                                            paddingHorizontal: Spacing.sm,
                                            borderRadius: Radius.sm,
                                            backgroundColor: positive ? Palette.success + '20' : Palette.error + '20',
                                            borderWidth: 1,
                                            borderColor: positive ? Palette.success + '40' : Palette.error + '40',
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                        }}>
                                            <MaterialCommunityIcons 
                                                name={positive ? "trending-up" : "trending-down"} 
                                                size={14} 
                                                color={positive ? Palette.success : Palette.error} 
                                            />
                                            <Text style={{
                                                color: positive ? Palette.success : Palette.error,
                                                fontWeight: '700',
                                                fontSize: FontSize.small,
                                                marginLeft: 4,
                                            }}>
                                                {positive ? `+${formatCurrency(cashDiff, currency)}` : `-${formatCurrency(Math.abs(cashDiff), currency)}`}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            );
                        }}
                        ListFooterComponent={() => {
                            const totalChips = players.reduce((s, p) => s + (p.settleChipCount ?? 0), 0);
                            const totalBuyIn = players.reduce((s, p) => s + (p.totalBuyInChips ?? 0), 0);
                            const totalChipDiff = totalChips - totalBuyIn;
                            const totalCashDiff = baseChipAmount === 0 ? 0 : totalChipDiff / (baseChipAmount / baseCashAmount);
                            const currency = (global as any).__pokerpal_settings?.currency ?? 'AUD';
                            const positive = totalCashDiff >= 0;
                            return (
                                <View style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    paddingVertical: Spacing.lg,
                                    paddingHorizontal: Spacing.md,
                                    marginTop: Spacing.md,
                                    borderTopWidth: 2,
                                    borderTopColor: Palette.mediumGray,
                                    backgroundColor: Palette.lightGray,
                                    borderRadius: Radius.md,
                                }}>
                                    {/* 合计信息 */}
                                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                                        <MaterialCommunityIcons 
                                            name="calculator" 
                                            size={24} 
                                            color={Palette.primary} 
                                            style={{ marginRight: Spacing.sm }}
                                        />
                                        <View>
                                            <Text style={{
                                                fontWeight: '700',
                                                fontSize: FontSize.h3,
                                                color: Palette.valueText,
                                            }}>
                                                合计
                                            </Text>
                                            <Text style={{
                                                fontSize: FontSize.small,
                                                color: Palette.text,
                                                marginTop: 2,
                                            }}>
                                                差额: {totalBuyIn - totalChips}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* 总盈亏 */}
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <View style={{
                                            paddingVertical: Spacing.sm,
                                            paddingHorizontal: Spacing.md,
                                            borderRadius: Radius.sm,
                                            backgroundColor: positive ? Palette.success : Palette.error,
                                            elevation: 2,
                                            shadowColor: Palette.shadowDark,
                                            shadowOffset: { width: 0, height: 1 },
                                            shadowOpacity: 0.2,
                                            shadowRadius: 2,
                                        }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <MaterialCommunityIcons 
                                                    name={positive ? "trending-up" : "trending-down"} 
                                                    size={18} 
                                                    color="white" 
                                                />
                                                <Text style={{
                                                    color: 'white',
                                                    fontWeight: '700',
                                                    fontSize: FontSize.body,
                                                    marginLeft: 4,
                                                }}>
                                                    {positive ? `+${formatCurrency(totalCashDiff, currency)}` : `-${formatCurrency(Math.abs(totalCashDiff), currency)}`}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            );
                        }}
                    />

                    {/* Actions */}
                    <View style={[styles.summaryButtonRow, { 
                        marginTop: Spacing.xl,
                        paddingTop: Spacing.lg,
                        borderTopWidth: 1,
                        borderTopColor: Palette.mediumGray,
                    }]}> 
                        <TouchableOpacity
                            style={{
                                flex: 1,
                                marginRight: Spacing.sm,
                                borderRadius: Radius.md,
                                overflow: 'hidden',
                                elevation: 2,
                            }}
                            onPress={onCancel}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={Gradients[5]}
                                style={{
                                    paddingVertical: Spacing.lg,
                                    alignItems: 'center',
                                    flexDirection: 'row',
                                    justifyContent: 'center',
                                }}
                            >
                                <MaterialCommunityIcons name="close" size={20} color={Palette.strongGray} />
                                <Text style={{
                                    fontWeight: '600',
                                    fontSize: FontSize.body,
                                    color: Palette.strongGray,
                                    marginLeft: Spacing.xs,
                                }}>
                                    取消
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={{
                                flex: 1,
                                marginLeft: Spacing.sm,
                                borderRadius: Radius.md,
                                overflow: 'hidden',
                                elevation: 2,
                                opacity: isLoading ? 0.6 : 1,
                            }}
                            onPress={onConfirm}
                            disabled={isLoading}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={['#4CAF50', '#45a049']}
                                style={{
                                    paddingVertical: Spacing.lg,
                                    alignItems: 'center',
                                    flexDirection: 'row',
                                    justifyContent: 'center',
                                }}
                            >
                                <MaterialCommunityIcons 
                                    name={isLoading ? "loading" : "check-circle"} 
                                    size={20} 
                                    color="white" 
                                />
                                <Text style={{
                                    fontWeight: '600',
                                    fontSize: FontSize.body,
                                    color: 'white',
                                    marginLeft: Spacing.xs,
                                }}>
                                    {isLoading ? '保存中...' : '确认保存'}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </LinearGradient>
            </View>
        </Modal>
    );
}
