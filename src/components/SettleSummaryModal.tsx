import React, { useState } from 'react';
import { modalStyles, GamePlaystyles as styles } from "@/assets/styles";
import { Spacing, Radius, FontSize, Elevation } from '@/constants/designTokens';
import { Gradients } from '@/constants/gradients';
import { Player } from "@/types";
import { FlatList, Modal, View, Text, TouchableOpacity, Image, Switch, TextInput, Dimensions } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGameStore } from "@/stores/useGameStore";
import { useSettings } from '@/providers/SettingsProvider';
import { Palette } from '@/constants/color.palette';
import { simpleT } from '@/i18n/simpleT';
import { usePermission } from '@/hooks/usePermission';
import { getCurrencyToCNYRate } from '@/utils/exchangeRateUtils';

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
    
    // 获取屏幕尺寸
    const { height: screenHeight } = Dimensions.get('window');
    const maxModalHeight = screenHeight * 0.9; // 最大高度为屏幕高度的90%
    
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
            // 更新成功后，重新获取当前货币的汇率
            const newRate = await getCurrencyToCNYRate(currentCurrency);
            setCurrentExchangeRate(newRate);
            // 可以添加一个成功提示
        } catch (error) {
            console.error('Failed to update exchange rates:', error);
            // 可以添加一个错误提示
        }
    };
    
    // 检查汇率数据是否有效
    const isExchangeRateValid = (rate: number | undefined): boolean => {
        return rate !== undefined && rate !== null && !isNaN(rate) && rate > 0;
    };
    
    // 处理汇率编辑
    const handleEditRate = async () => {
        try {
            // 使用 exchangeRateUtils 中的方法获取当前货币对CNY的汇率
            const currentRate = await getCurrencyToCNYRate(currentCurrency);
            setTempRate(currentRate.toString());
            setIsEditingRate(true);
        } catch (error) {
            console.error('Failed to get current exchange rate:', error);
            // 如果获取失败，使用默认值
            setTempRate('1');
            setIsEditingRate(true);
        }
    };
    
    // 获取当前货币对CNY的汇率（使用异步方法）
    const [currentExchangeRate, setCurrentExchangeRate] = useState<number>(1);
    
    // 初始化时获取汇率
    React.useEffect(() => {
        const loadExchangeRate = async () => {
            try {
                const rate = await getCurrencyToCNYRate(currentCurrency);
                setCurrentExchangeRate(rate);
            } catch (error) {
                console.error('Failed to load exchange rate:', error);
                setCurrentExchangeRate(1);
            }
        };
        
        loadExchangeRate();
    }, [currentCurrency, exchangeRates]); // 当货币或汇率变化时重新获取
    
    const handleSaveRate = async () => {
        const newRate = parseFloat(tempRate);
        if (!isNaN(newRate) && newRate > 0) {
            try {
                const curr = currentCurrency.toUpperCase();
                
                if (curr === 'CNY' || curr === 'CN') {
                    // CNY 不需要设置汇率
                    setIsEditingRate(false);
                    return;
                }
                
                // 注意：目前只支持直接修改AUD基础的汇率结构
                // 对于其他货币，这里设置的是对CNY的直接汇率覆盖
                // 更完整的实现需要重新计算整个汇率结构
                await setExchangeRate('CNY', newRate);
                
                // 更新本地显示的汇率
                setCurrentExchangeRate(newRate);
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
            <View style={modalStyles.overlay}>
                <LinearGradient
                    colors={['#FFFFFF', '#FFFFFF']}
                    style={modalStyles.modal}
                >
                    {/* Header */}
                    <View style={modalStyles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <MaterialCommunityIcons
                                name="chart-line"
                                size={28}
                                color={Palette.primary}
                                style={{ marginRight: Spacing.sm }}
                            />
                            <Text style={modalStyles.headerTitle}>{simpleT('settlement_summary', language)}</Text>
                        </View>
                        <View style={modalStyles.playersBadge}>
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
                        <View style={modalStyles.currencySection}>
                            {/* 人民币显示开关 */}
                            <View style={modalStyles.currencySwitch}>
                                <View style={modalStyles.currencyLabel}>
                                    <MaterialCommunityIcons
                                        name="currency-cny"
                                        size={16} // 减少图标大小从20到16
                                        color={Palette.primary}
                                        style={{ marginRight: Spacing.xs }}
                                    />
                                    <Text style={modalStyles.currencyLabelText}>
                                        {simpleT('show_rmb', language)}
                                    </Text>
                                </View>
                                <Switch
                                    value={showRMB}
                                    onValueChange={setShowRMB}
                                    trackColor={{ false: Palette.lightGray, true: Palette.primary + '40' }}
                                    thumbColor={showRMB ? Palette.primary : Palette.mediumGray}
                                    ios_backgroundColor={Palette.lightGray}
                                    style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }} // 缩小开关大小
                                />
                            </View>
                            
                            {/* 汇率显示和编辑区域 */}
                            {showRMB && currentCurrency.toUpperCase() !== 'CNY' && (
                                <View style={{
                                    backgroundColor: Palette.lightBackground,
                                    borderRadius: Radius.md,
                                    padding: Spacing.sm,
                                    marginTop: Spacing.sm,
                                    borderWidth: 1,
                                    borderColor: Palette.lightGray,
                                }}>
                                    {/* 汇率标题 */}
                                    <View style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        marginBottom: Spacing.xs,
                                    }}>
                                        <MaterialCommunityIcons
                                            name="swap-horizontal"
                                            size={16}
                                            color={Palette.primary}
                                        />
                                        <Text style={{
                                            fontSize: FontSize.small,
                                            fontWeight: '600',
                                            color: Palette.text,
                                            marginLeft: Spacing.xs,
                                        }}>
                                            汇率设置
                                        </Text>
                                        {!isExchangeRateValid(exchangeRates.CNY) && (
                                            <MaterialCommunityIcons
                                                name="alert-circle-outline"
                                                size={12}
                                                color={Palette.warning}
                                                style={{ marginLeft: Spacing.xs }}
                                            />
                                        )}
                                    </View>

                                    {/* 汇率内容 */}
                                    <View style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                    }}>
                                        {/* 汇率显示/编辑 */}
                                        <View style={{ flex: 1 }}>
                                            {isEditingRate ? (
                                                <View style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    backgroundColor: 'white',
                                                    borderRadius: Radius.sm,
                                                    borderWidth: 1,
                                                    borderColor: Palette.primary,
                                                    paddingHorizontal: Spacing.sm,
                                                    paddingVertical: Spacing.xs,
                                                }}>
                                                    <Text style={{
                                                        fontSize: FontSize.small,
                                                        color: Palette.text,
                                                        fontWeight: '500',
                                                    }}>
                                                        1 {currentCurrency.toUpperCase()} = ¥
                                                    </Text>
                                                    <TextInput
                                                        style={{
                                                            fontSize: FontSize.small,
                                                            color: Palette.text,
                                                            fontWeight: '600',
                                                            minWidth: 60,
                                                            textAlign: 'center',
                                                            marginHorizontal: Spacing.xs,
                                                        }}
                                                        value={tempRate}
                                                        onChangeText={setTempRate}
                                                        keyboardType="numeric"
                                                        autoFocus
                                                        selectTextOnFocus
                                                        placeholder="0.0000"
                                                    />
                                                    <Text style={{
                                                        fontSize: FontSize.small,
                                                        color: Palette.text,
                                                        fontWeight: '500',
                                                    }}>
                                                        CNY
                                                    </Text>
                                                </View>
                                            ) : (
                                                <TouchableOpacity 
                                                    onPress={handleEditRate}
                                                    style={{
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        backgroundColor: 'white',
                                                        borderRadius: Radius.sm,
                                                        borderWidth: 1,
                                                        borderColor: Palette.lightGray,
                                                        paddingHorizontal: Spacing.sm,
                                                        paddingVertical: Spacing.xs,
                                                    }}
                                                    activeOpacity={0.7}
                                                >
                                                    <Text style={{
                                                        fontSize: FontSize.small,
                                                        color: Palette.primary,
                                                        fontWeight: '600',
                                                        flex: 1,
                                                    }}>
                                                        1 {currentCurrency.toUpperCase()} ≈ ¥{currentExchangeRate.toFixed(4)}
                                                    </Text>
                                                    <MaterialCommunityIcons
                                                        name="pencil-outline"
                                                        size={14}
                                                        color={Palette.primary}
                                                    />
                                                </TouchableOpacity>
                                            )}
                                        </View>

                                        {/* 操作按钮 */}
                                        <View style={{
                                            flexDirection: 'row',
                                            marginLeft: Spacing.sm,
                                        }}>
                                            {/* 刷新按钮 */}
                                            <TouchableOpacity
                                                onPress={handleUpdateRates}
                                                disabled={isUpdatingRates}
                                                style={{
                                                    width: 32,
                                                    height: 32,
                                                    borderRadius: 16,
                                                    backgroundColor: isUpdatingRates ? Palette.lightGray : Palette.info,
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    marginLeft: Spacing.xs,
                                                }}
                                                activeOpacity={0.8}
                                            >
                                                <MaterialCommunityIcons 
                                                    name={isUpdatingRates ? "loading" : "refresh"} 
                                                    size={16} 
                                                    color="white" 
                                                />
                                            </TouchableOpacity>

                                            {/* 编辑状态下的确认/取消按钮 */}
                                            {isEditingRate && (
                                                <>
                                                    <TouchableOpacity
                                                        onPress={handleSaveRate}
                                                        style={{
                                                            width: 32,
                                                            height: 32,
                                                            borderRadius: 16,
                                                            backgroundColor: Palette.success,
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            marginLeft: Spacing.xs,
                                                        }}
                                                        activeOpacity={0.8}
                                                    >
                                                        <MaterialCommunityIcons name="check" size={16} color="white" />
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        onPress={handleCancelEdit}
                                                        style={{
                                                            width: 32,
                                                            height: 32,
                                                            borderRadius: 16,
                                                            backgroundColor: Palette.error,
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            marginLeft: Spacing.xs,
                                                        }}
                                                        activeOpacity={0.8}
                                                    >
                                                        <MaterialCommunityIcons name="close" size={16} color="white" />
                                                    </TouchableOpacity>
                                                </>
                                            )}
                                        </View>
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
                        style={modalStyles.flatListContainer}
                        showsVerticalScrollIndicator={true}
                        renderItem={({ item }) => {
                            const chipCount = item.settleChipCount ?? 0;
                            const buyIn = item.totalBuyInChips ?? 0;
                            const chipDiff = chipCount - buyIn;
                            const cashDiff = baseChipAmount === 0 ? 0 : chipDiff / (baseChipAmount / baseCashAmount);
                            const positive = cashDiff >= 0;
                            
                            // 只有host用户且开启了RMB显示才转换货币
                            const shouldShowRMB = isHost && showRMB;
                            
                            return (
                                <View style={modalStyles.playerItem}>
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
                    />

                    {/* 合计信息 - 移动到按钮上方 */}
                    {(() => {
                        const totalChips = players.reduce((s, p) => s + (p.settleChipCount ?? 0), 0);
                        const totalBuyIn = players.reduce((s, p) => s + (p.totalBuyInChips ?? 0), 0);
                        const totalChipDiff = totalChips - totalBuyIn;
                        const totalCashDiff = baseChipAmount === 0 ? 0 : totalChipDiff / (baseChipAmount / baseCashAmount);
                        const positive = totalCashDiff >= 0;
                        const shouldShowRMB = isHost && showRMB;
                        
                        return (
                            <View style={modalStyles.summarySection}>
                                {/* 合计信息 */}
                                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                                    <MaterialCommunityIcons
                                        name="calculator"
                                        size={20} // 减少图标大小
                                        color={Palette.primary}
                                        style={{ marginRight: Spacing.xs }}
                                    />
                                    <View>
                                        <Text style={modalStyles.summaryText}>
                                            {simpleT('total', language)}
                                        </Text>
                                        <Text style={modalStyles.summarySubText}>
                                            {simpleT('difference', language)}: {totalBuyIn - totalChips}
                                        </Text>
                                    </View>
                                </View>

                                {/* 总盈亏 */}
                                <View style={{ alignItems: 'flex-end' }}>
                                    <View style={[modalStyles.totalAmountContainer, {
                                        backgroundColor: positive ? Palette.success : Palette.error,
                                    }]}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <MaterialCommunityIcons
                                                name={positive ? "trending-up" : "trending-down"}
                                                size={14} // 减少图标大小
                                                color="white"
                                            />
                                            <Text style={modalStyles.totalAmountText}>
                                                {positive ? '+' : '-'}{shouldShowRMB ? formatAsRMB(Math.abs(totalCashDiff), currentCurrency) : formatCurrency(Math.abs(totalCashDiff), currentCurrency)}
                                            </Text>
                                        </View>
                                    </View>
                                    {shouldShowRMB && currentCurrency.toUpperCase() !== 'CNY' && currentCurrency.toUpperCase() !== 'CN' && (
                                        <Text style={{
                                            fontSize: FontSize.small - 2,
                                            color: Palette.mutedText,
                                            marginTop: 2,
                                            textAlign: 'right',
                                        }}>
                                            {simpleT('original', language)}: {positive ? '+' : '-'}{formatCurrency(Math.abs(totalCashDiff), currentCurrency)}
                                        </Text>
                                    )}
                                </View>
                            </View>
                        );
                    })()}

                    {/* Actions */}
                    <View style={modalStyles.buttonsContainer}>
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
