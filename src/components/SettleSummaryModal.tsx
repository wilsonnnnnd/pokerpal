import React, { useEffect, useState } from 'react';
import { GamePlaystyles as styles } from "@/assets/styles";
import { Player } from "@/types";
import { FlatList, Modal, View, Text } from "react-native";
import { PrimaryButton } from "./PrimaryButton";
import { useGameStore } from "@/stores/useGameStore";
import { Palette } from '@/constants/color.palette';
import storage from '@/services/storageService';

// small helper to render initials
function initials(name?: string) {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatCash(v: number) {
    return Number.isFinite(v) ? v.toFixed(2) : '-';
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
    const baseChipAmount = useGameStore.getState().baseChipAmount;
    const baseCashAmount = useGameStore.getState().baseCashAmount;
    const [currencySymbol, setCurrencySymbol] = useState<string>('');
    const [currencyRate, setCurrencyRate] = useState<number>(1);

    useEffect(() => {
        (async () => {
            try {
                const s = await storage.getLocal('@pokerpal:appSettings');
                if (s) {
                    const code = (s.defaultCurrency || 'AUD').toString().toUpperCase();
                    const rate = Number(s.currencyRate ?? 1) || 1;
                    const symbol = code === 'AUD' ? '$' : code === 'CNY' ? '¥' : '';
                    setCurrencySymbol(symbol);
                }
            } catch (err) {
                // ignore
            }
        })();
    }, []);
    return (
        <Modal transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.summaryModal}>
                    {/* Header */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <Text style={styles.summaryTitle}>结算总览</Text>
                        <Text style={{ color: Palette.mutedText, fontSize: 12 }}>{currencySymbol ? `${currencySymbol}` : ''}</Text>
                    </View>

                    {/* List */}
                    <FlatList
                        data={players}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ paddingVertical: 4 }}
                        renderItem={({ item }) => {
                            const chipCount = item.settleChipCount ?? 0;
                            const buyIn = item.totalBuyInChips ?? 0;
                            const chipDiff = chipCount - buyIn;
                            const cashDiff = baseChipAmount === 0 ? 0 : chipDiff / (baseChipAmount / baseCashAmount);
                            const positive = cashDiff >= 0;
                            return (
                                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
                                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F2F2F2', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                            <Text style={{ fontWeight: '700', color: '#333' }}>{initials(item.nickname)}</Text>
                                        </View>
                                        <View>
                                            <Text style={{ fontWeight: '600' }}>{item.nickname}</Text>
                                            <Text style={{ fontSize: 12, color: Palette.mutedText }}>{`买入 ${buyIn} 筹码`}</Text>
                                        </View>
                                    </View>

                                    <View style={{ width: 70, alignItems: 'center' }}>
                                        <Text style={{ fontWeight: '600' }}>{chipCount}</Text>
                                    </View>

                                    <View style={{ width: 110, alignItems: 'flex-end' }}>
                                        <View style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 18, backgroundColor: positive ? (Palette.success + '20') : (Palette.error + '20') }}>
                                            <Text style={{ color: positive ? Palette.success : Palette.error, fontWeight: '700' }}>{positive ? `+${currencySymbol}${formatCash(cashDiff)}` : `-${currencySymbol}${formatCash(Math.abs(cashDiff))}`}</Text>
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
                            const positive = totalCashDiff >= 0;
                            return (
                                <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderColor: '#F0F0F0', marginTop: 6 }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontWeight: '700' }}>合计</Text>
                                    </View>
                                    <View style={{ width: 70, alignItems: 'center' }}>
                                        <Text style={{ fontWeight: '700' }}>{totalChips}</Text>
                                    </View>
                                    <View style={{ width: 110, alignItems: 'flex-end' }}>
                                        <View style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 18, backgroundColor: positive ? (Palette.success + '20') : (Palette.error + '20') }}>
                                            <Text style={{ color: positive ? Palette.success : Palette.error, fontWeight: '700' }}>{positive ? `+${currencySymbol}${formatCash(totalCashDiff)}` : `-${currencySymbol}${formatCash(Math.abs(totalCashDiff))}`}</Text>
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
