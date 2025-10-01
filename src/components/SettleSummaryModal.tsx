import React, { useEffect, useState } from 'react';
import { GamePlaystyles as styles } from "@/assets/styles";
import { Spacing, Radius, FontSize, Elevation } from '@/constants/designTokens';
import { Gradients } from '@/constants/gradients';
import { Player } from "@/types";
import { FlatList, Modal, View, Text, TouchableOpacity, Image, Switch, TextInput } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PrimaryButton } from "./PrimaryButton";
import { useGameStore } from "@/stores/useGameStore";
import { useSettings } from '@/providers/SettingsProvider';
import { Palette } from '@/constants/color.palette';
import { getCurrencySymbol } from '@/constants/currency';
import { simpleT } from '@/i18n/simpleT';
import { usePermission } from '@/hooks/usePermission';

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
    const { currency, formatCurrency, exchangeRates, formatAsRMB, language, setExchangeRate, updateExchangeRates, isUpdatingRates } = useSettings();
    const { isHost } = usePermission();
    const baseChipAmount = useGameStore.getState().baseChipAmount;
    const baseCashAmount = useGameStore.getState().baseCashAmount;
    
    // 货币切换状态
    const [showRMB, setShowRMB] = useState(false);
    // 手动修改汇率状态
    const [isEditingRate, setIsEditingRate] = useState(false);
    const [tempRate, setTempRate] = useState('');
    const currentCurrency = (global as any).__pokerpal_settings?.currency ?? currency ?? 'AUD';
    
    // 处理汇率更新
    const handleUpdateRates = async () => {
        try {
            await updateExchangeRates();
            // 可以添加一个成功提示
        } catch (error) {
            console.error('Failed to update exchange rates:', error);
            // 可以添加一个错误提示
        }
    };
    
    // 处理汇率编辑
    const handleEditRate = () => {
        setTempRate((exchangeRates.CNY ?? 4.7).toString());
        setIsEditingRate(true);
    };
    
    const handleSaveRate = async () => {
        const newRate = parseFloat(tempRate);
        if (!isNaN(newRate) && newRate > 0) {
            try {
                await setExchangeRate('CNY', newRate);
                setIsEditingRate(false);
            } catch (error) {
                console.error('Failed to update exchange rate:', error);
            }
        }
    };
    
    const handleCancelEdit = () => {
        setIsEditingRate(false);
        setTempRate('');
    };
    
    return (
        <Modal
            transparent
            animationType="fade"
        >
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
                            }]}>{simpleT('settlement_summary', language)}</Text>
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
                                {players.length} {simpleT('players', language)}
                            </Text>
                        </View>
                    </View>

                    {/* 货币切换开关 - 只有host用户可见 */}
                    {isHost && (
                        <View style={{
                            marginBottom: Spacing.md,
                            padding: Spacing.md,
                            backgroundColor: Palette.lightBackground,
                            borderRadius: Radius.md,
                            borderWidth: 1,
                            borderColor: Palette.borderColor,
                        }}>
                            {/* 人民币显示开关 */}
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: Spacing.sm,
                            }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <MaterialCommunityIcons
                                        name="currency-cny"
                                        size={20}
                                        color={Palette.primary}
                                        style={{ marginRight: Spacing.xs }}
                                    />
                                    <Text style={{
                                        fontSize: FontSize.body,
                                        fontWeight: '600',
                                        color: Palette.valueText,
                                    }}>
                                        {simpleT('show_rmb', language)}
                                    </Text>
                                </View>
                                <Switch
                                    value={showRMB}
                                    onValueChange={setShowRMB}
                                    trackColor={{ false: Palette.lightGray, true: Palette.primary + '40' }}
                                    thumbColor={showRMB ? Palette.primary : Palette.mediumGray}
                                    ios_backgroundColor={Palette.lightGray}
                                />
                            </View>
                            
                            {/* 汇率显示和编辑 - 只在显示RMB时出现 */}
                            {showRMB && currentCurrency.toUpperCase() !== 'CNY' && currentCurrency.toUpperCase() !== 'CN' && (
                                <View style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    paddingTop: Spacing.sm,
                                    borderTopWidth: 1,
                                    borderTopColor: Palette.borderColor,
                                }}>
                                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={{
                                            fontSize: FontSize.small,
                                            color: Palette.text,
                                            marginRight: Spacing.xs,
                                        }}>
                                            汇率:
                                        </Text>
                                        {isEditingRate ? (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                                <Text style={{ fontSize: FontSize.small, color: Palette.text }}>
                                                    1 {currentCurrency.toUpperCase()} = ¥
                                                </Text>
                                                <TextInput
                                                    style={{
                                                        borderWidth: 1,
                                                        borderColor: Palette.primary,
                                                        borderRadius: Radius.sm,
                                                        paddingHorizontal: Spacing.xs,
                                                        paddingVertical: 2,
                                                        fontSize: FontSize.small,
                                                        color: Palette.text,
                                                        backgroundColor: Palette.background,
                                                        minWidth: 60,
                                                        marginHorizontal: 4,
                                                    }}
                                                    value={tempRate}
                                                    onChangeText={setTempRate}
                                                    keyboardType="numeric"
                                                    autoFocus
                                                />
                                                <Text style={{ fontSize: FontSize.small, color: Palette.text }}>
                                                    CNY
                                                </Text>
                                            </View>
                                        ) : (
                                            <TouchableOpacity 
                                                onPress={handleEditRate}
                                                style={{ flexDirection: 'row', alignItems: 'center' }}
                                            >
                                                <Text style={{
                                                    fontSize: FontSize.small,
                                                    color: Palette.primary,
                                                    fontWeight: '500',
                                                }}>
                                                    1 {currentCurrency.toUpperCase()} ≈ ¥{(exchangeRates.CNY ?? 4.7).toFixed(4)} CNY
                                                </Text>
                                                <MaterialCommunityIcons
                                                    name="pencil"
                                                    size={14}
                                                    color={Palette.primary}
                                                    style={{ marginLeft: Spacing.xs }}
                                                />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                    
                                    <View style={{ flexDirection: 'row', marginLeft: Spacing.sm }}>
                                        <TouchableOpacity
                                            onPress={handleUpdateRates}
                                            disabled={isUpdatingRates}
                                            style={{
                                                backgroundColor: isUpdatingRates ? Palette.lightGray : Palette.primary,
                                                paddingHorizontal: Spacing.xs,
                                                paddingVertical: 4,
                                                borderRadius: Radius.sm,
                                                marginRight: Spacing.xs,
                                                opacity: isUpdatingRates ? 0.6 : 1,
                                            }}
                                        >
                                            <MaterialCommunityIcons 
                                                name={isUpdatingRates ? "loading" : "refresh"} 
                                                size={16} 
                                                color="white" 
                                            />
                                        </TouchableOpacity>
                                        {isEditingRate && (
                                            <>
                                                <TouchableOpacity
                                                    onPress={handleSaveRate}
                                                    style={{
                                                        backgroundColor: Palette.success,
                                                        paddingHorizontal: Spacing.xs,
                                                        paddingVertical: 4,
                                                        borderRadius: Radius.sm,
                                                        marginRight: Spacing.xs,
                                                    }}
                                                >
                                                    <MaterialCommunityIcons name="check" size={16} color="white" />
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={handleCancelEdit}
                                                    style={{
                                                        backgroundColor: Palette.error,
                                                        paddingHorizontal: Spacing.xs,
                                                        paddingVertical: 4,
                                                        borderRadius: Radius.sm,
                                                    }}
                                                >
                                                    <MaterialCommunityIcons name="close" size={16} color="white" />
                                                </TouchableOpacity>
                                            </>
                                        )}
                                    </View>
                                </View>
                            )}
                        </View>
                    )}

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
                            
                            // 只有host用户且开启了RMB显示才转换货币
                            const shouldShowRMB = isHost && showRMB;
                            
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
                                                {simpleT('buy_in', language)}: {buyIn} → {simpleT('settlement', language)}: {chipCount}
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
                                                {positive ? '+' : '-'}{shouldShowRMB ? formatAsRMB(Math.abs(cashDiff), currentCurrency) : formatCurrency(Math.abs(cashDiff), currentCurrency)}
                                            </Text>
                                        </View>
                                        {shouldShowRMB && currentCurrency.toUpperCase() !== 'CNY' && currentCurrency.toUpperCase() !== 'CN' && (
                                            <Text style={{
                                                fontSize: FontSize.small - 2,
                                                color: Palette.mutedText,
                                                marginTop: 2,
                                            }}>
                                                {simpleT('original', language)}: {positive ? '+' : '-'}{formatCurrency(Math.abs(cashDiff), currentCurrency)}
                                            </Text>
                                        )}
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
                            
                            // 只有host用户且开启了RMB显示才转换货币
                            const shouldShowRMB = isHost && showRMB;
                            
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
                                                {simpleT('total', language)}
                                            </Text>
                                            <Text style={{
                                                fontSize: FontSize.small,
                                                color: Palette.text,
                                                marginTop: 2,
                                            }}>
                                                {simpleT('difference', language)}: {totalBuyIn - totalChips}
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
                                                    {positive ? '+' : '-'}{shouldShowRMB ? formatAsRMB(Math.abs(totalCashDiff), currentCurrency) : formatCurrency(Math.abs(totalCashDiff), currentCurrency)}
                                                </Text>
                                            </View>
                                        </View>
                                        {shouldShowRMB && currentCurrency.toUpperCase() !== 'CNY' && currentCurrency.toUpperCase() !== 'CN' && (
                                            <Text style={{
                                                fontSize: FontSize.small - 2,
                                                color: Palette.mutedText,
                                                marginTop: 4,
                                                textAlign: 'right',
                                            }}>
                                                {simpleT('original', language)}: {positive ? '+' : '-'}{formatCurrency(Math.abs(totalCashDiff), currentCurrency)}
                                            </Text>
                                        )}
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
                                    {simpleT('cancel', language)}
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
                                    {isLoading ? simpleT('saving', language) : simpleT('confirm_save', language)}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </LinearGradient>
            </View>
        </Modal>
    );
}
