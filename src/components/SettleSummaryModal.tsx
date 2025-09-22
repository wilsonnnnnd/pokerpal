import React, { useEffect, useState } from 'react';
import { GamePlaystyles as styles } from "@/assets/styles";
import { Spacing, Radius, FontSize } from '@/constants/designTokens';
import { Player } from "@/types";
import { FlatList, Modal, View, Text } from "react-native";
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
                <View style={styles.summaryModal}>
                    {/* Header */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm }}>
                        <Text style={styles.summaryTitle}>结算总览</Text>
                        <Text style={{ color: Palette.mutedText, fontSize: FontSize.small }} />
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
                                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md }}>
                                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={{ width: 40, height: 40, borderRadius: Radius.lg, backgroundColor: '#F2F2F2', alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md }}>
                                            <Text style={{ fontWeight: '700', color: '#333' }}>{initials(item.nickname)}</Text>
                                        </View>
                                        <View>
                                            <Text style={{ fontWeight: '600' }}>{item.nickname}</Text>
                                            <Text style={{ fontSize: FontSize.small, color: Palette.mutedText }}>{`买入 ${buyIn} 筹码`}</Text>
                                        </View>
                                    </View>

                                    <View style={{ width: 70, alignItems: 'center' }}>
                                        <Text style={{ fontWeight: '600' }}>{chipCount}</Text>
                                    </View>

                                    <View style={{ width: 110, alignItems: 'flex-end' }}>
                                        <View style={{ paddingVertical: Spacing.xs + 2, paddingHorizontal: Spacing.sm + 2, borderRadius: Radius.md, backgroundColor: positive ? (Palette.success + '20') : (Palette.error + '20') }}>
                                            <Text style={{ color: positive ? Palette.success : Palette.error, fontWeight: '700' }}>{positive ? `+${formatCurrency(cashDiff, currency)}` : `-${formatCurrency(Math.abs(cashDiff), currency)}`}</Text>
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
                            const currency = (global as any).__pokerpal_settings?.currency ?? '';
                            const positive = totalCashDiff >= 0;
                            return (
                                <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: Spacing.md, borderTopWidth: 1, borderColor: '#F0F0F0', marginTop: Spacing.sm }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontWeight: '700' }}>合计</Text>
                                    </View>
                                    <View style={{ width: 70, alignItems: 'center' }}>
                                        <Text style={{ fontWeight: '700' }}>{totalChips}</Text>
                                    </View>
                                    <View style={{ width: 110, alignItems: 'flex-end' }}>
                                        <View style={{ paddingVertical: Spacing.xs + 2, paddingHorizontal: Spacing.md - 2, borderRadius: Radius.md, backgroundColor: positive ? (Palette.success + '20') : (Palette.error + '20') }}>
                                            <Text style={{ color: positive ? Palette.success : Palette.error, fontWeight: '700' }}>{positive ? `+${formatCurrency(totalCashDiff, currency)}` : `-${formatCurrency(Math.abs(totalCashDiff), currency)}`}</Text>
                                        </View>
                                    </View>
                                </View>
                            );
                        }}
                    />

                    {/* Actions */}
                    <View style={[styles.summaryButtonRow, { marginTop: 12 }]}> 
                        <PrimaryButton
                            title="取消"
                            onPress={onCancel}
                            style={styles.summaryCancelButton}
                        />
                        <PrimaryButton
                            title="确认保存"
                            onPress={onConfirm}
                            style={styles.summaryConfirmButton}
                            disabled={isLoading}
                        />
                    </View>
                </View>
            </View>
        </Modal>
    );
}
