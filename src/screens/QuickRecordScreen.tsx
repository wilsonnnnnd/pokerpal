import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { InputField } from '@/components/common/InputField';
import simpleT from '@/i18n/simpleT';
import usePermission from '@/hooks/usePermission';
import localGameService from '@/services/localGameService';
import storage from '@/services/storageService';
import { SETTINGS_KEY } from '@/constants/namingVar';
import { getCurrencySymbol } from '@/constants/currency';
import { DEFAULT_CURRENCY } from '@/constants/appConfig';
import { v4 as uuidv4 } from 'uuid';
import { saveGameToLocalSql } from '@/firebase/saveGame';
import { appendAction } from '@/services/localDb';
import { BatchBuilder } from '@/firebase/batchBuilder';
import { queuePlayerGameWrite, upsertUserAndCounters, upsertEmailIndex, ensureUserGameHistory, collectGraphWrites, calcRate } from '@/firebase/gameWriters';
import Toast from 'react-native-toast-message';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { userDoc, gameDoc as gamesCollection } from '@/constants/namingVar';
import { Player } from '@/types';
import { useLogger } from '@/utils/useLogger';
import normalizeNumberInput from '@/utils/number';
import { Palette as color } from '@/constants';
import { Spacing, Radius, FontSize } from '@/constants/designTokens';
import { generateSecureId } from '@/utils/getSecureNumber';

const QuickRecordScreen: React.FC = () => {
    const { authUser, isHost, loading } = usePermission();
    // 只有已登录且非匿名用户才允许同步到云端
    const cloudAllowed = Boolean(authUser && !(authUser as any).isAnonymous);
    type HomeNav = NativeStackNavigationProp<RootStackParamList, 'Home'>;
    const navigation = useNavigation<HomeNav>();
    const [smallBlind, setSmallBlind] = useState('1');
    const [bigBlind, setBigBlind] = useState('2');
    const [buyIn, setBuyIn] = useState('0');
    const [settleDiff, setSettleDiff] = useState('0');
    const [notes, setNotes] = useState('');
    const [currencyInfo, setCurrencyInfo] = useState<{ code?: string; symbol?: string }>({});
    const [saving, setSaving] = useState(false);

    const { log } = useLogger();
    // normalizeNumberInput moved to shared util: import above

    // load currency symbol from settings (global or storage)
    React.useEffect(() => {
        (async () => {
            try {
                const g = (global as any).__pokerpal_settings;
                if (g && g.currency) {
                    setCurrencyInfo({ code: g.currency, symbol: getCurrencySymbol(g.currency) });
                    return;
                }
                const s = await storage.getLocal(SETTINGS_KEY);
                if (s && s.currency) {
                    setCurrencyInfo({ code: s.currency, symbol: getCurrencySymbol(s.currency) });
                } else {
                    setCurrencyInfo({ code: DEFAULT_CURRENCY, symbol: getCurrencySymbol(DEFAULT_CURRENCY) });
                }
            } catch (e) {
                setCurrencyInfo({ code: DEFAULT_CURRENCY, symbol: getCurrencySymbol(DEFAULT_CURRENCY) });
            }
        })();
    }, []);

    const onSaveLocal = async () => {
        log('QuickRecord', '开始保存快速记录');
        // 允许访客（匿名）本地保存，但访客不被允许同步到云端。
        // playerId 使用 authUser.uid（如果存在），否则退回到临时本地 id（guest-uuid）以便在本地列表中展示。

        // Validate blinds before saving: must be positive integers and bigBlind >= smallBlind
        const sbRaw = (smallBlind || '').trim();
        const bbRaw = (bigBlind || '').trim();
        const sbNum = parseInt(sbRaw, 10);
        const bbNum = parseInt(bbRaw, 10);
        if (isNaN(sbNum) || isNaN(bbNum) || sbNum <= 0 || bbNum <= 0) {
            Alert.alert(simpleT('quick_record_invalid_blinds_title') || simpleT('input_error'), simpleT('quick_record_invalid_blinds_msg') || simpleT('validation_positive'));
            return;
        }
        if (bbNum < sbNum) {
            Alert.alert(simpleT('quick_record_invalid_blinds_title') || simpleT('input_error'), simpleT('quick_record_blinds_order_msg') || simpleT('validation_bigblind_min'));
            return;
        }
        // normalize inputs to remove leading zeros (e.g. '022' -> '22')
        setSmallBlind(String(sbNum));
        setBigBlind(String(bbNum));

        setSaving(true);
        try {
            const playerId = authUser?.uid ?? generateSecureId('player'); // 若无 authUser，则生成本地 guest id

            // 1) 保持原有 AsyncStorage 列表的本地游戏记录（用于 UI 列表）
            const storagePlayers = [
                {
                    playerId,
                    buyIn: Number(buyIn) || 0,
                    isSB: false,
                    isBB: false,
                }
            ];
            log('QuickRecord', { step: 'local_create_start', players: storagePlayers });
            await localGameService.createGame({ players: storagePlayers, initialBuyIn: Number(buyIn || 0), meta: { notes, sb: Number(smallBlind), bb: Number(bigBlind), settleCashDiff: Number(settleDiff) } });
            log('QuickRecord', 'local createGame 完成');

            // 2) 使用与 GamePlay 相同的本地快照格式写入 sqlite actions（便于后续上传/分析）
            const gameId = generateSecureId('game');
            const now = new Date().toISOString();

            const buyInCash = Number(buyIn) || 0;
            // 解释：用户输入的 settle 字段可能是最终结算值或差额；为了保证内部一致性，我们把输入视为“最终结算金额（相对于现金口径）”
            // 并以此计算 settleCashDiff（profit）用于 wins/losses 计算。
            const inputSettle = Number(settleDiff) || 0;
            const settleCashAmount = inputSettle >= 0 ? inputSettle : buyInCash + inputSettle; // if user entered diff (negative allowed), allow both patterns
            const settleCashDiffComputed = Number((settleCashAmount - buyInCash).toFixed(2));

            // 为兼容性：同时写入 chips 与 cash 字段（将 cash 作为等值的 "chips" 单位，rate=1）
            const snapshotPayload = {
                id: gameId,
                created: now,
                updated: now,
                smallBlind: Number(smallBlind) || 0,
                bigBlind: Number(bigBlind) || 0,
                // 使用单位比例 1:1（现金与筹码一比一），保证 display 上不会再做额外乘法导致混淆
                baseCashAmount: 1,
                baseChipAmount: 1,
                totalBuyInChips: Number(buyInCash),
                totalBuyInCash: Number(buyInCash.toFixed ? buyInCash.toFixed(2) : buyInCash),
                totalEndingChips: Number(settleCashAmount),
                totalEndingCash: Number(settleCashAmount.toFixed ? settleCashAmount.toFixed(2) : settleCashAmount),
                players: [
                    {
                        id: playerId,
                        nickname: authUser?.displayName || '',
                        buyInCount: 1,
                        buyInChipsList: [Number(buyInCash)],
                        totalBuyInChips: Number(buyInCash),
                        totalBuyInCash: Number(buyInCash.toFixed ? buyInCash.toFixed(2) : buyInCash),
                        settleChipCount: Number(settleCashAmount),
                        settleChipDiff: Number((Number(settleCashAmount) - Number(buyInCash)) || 0),
                        settleCashAmount: Number(settleCashAmount.toFixed ? settleCashAmount.toFixed(2) : settleCashAmount),
                        settleCashDiff: settleCashDiffComputed,
                        settleROI: 0,
                    }
                ],
            } as any;

            log('QuickRecord', { step: 'appendAction_start', gameId, snapshot: snapshotPayload });
            const actionId = await appendAction(null, 'finalize_game', snapshotPayload);
            log('QuickRecord', { step: 'appendAction_done', actionId });

            // 额外：尝试使用 BatchBuilder 将记录写入云端（更新用户档案统计 & 写入 /users-by-uid/{uid}/games/{gameId}）
            // 对于有权限的用户（非匿名登录），直接同步云端（无需用户手动切换）。访客/匿名用户不会进行云同步。
            if (cloudAllowed) {
                try {
                    if (db && playerId) {
                    const bb = new BatchBuilder(db, 450);
                    const rate = 1; // QuickRecord 使用 1:1 chips->cash 映射

                    log('QuickRecord', 'cloud batch start');

                    // 构建 Player 对象与 normalized 字段
                    const playerForCloud: any = {
                        id: playerId,
                        nickname: authUser?.displayName || '',
                        email: (authUser as any)?.email ?? undefined,
                        photoURL: (authUser as any)?.photoURL ?? undefined,
                        buyInChipsList: [Number(buyIn) || 0],
                        buyInCount: 1,
                        totalBuyInChips: Number(buyIn) || 0,
                        totalBuyInCash: Number(buyIn) || 0,
                        settleChipCount: Number(settleCashAmount) || 0,
                        settleChipDiff: settleCashDiffComputed,
                        settleCashAmount: Number(settleCashAmount.toFixed ? settleCashAmount.toFixed(2) : settleCashAmount),
                        settleCashDiff: settleCashDiffComputed,
                        settleROI: 0,
                    };

                    // write player snapshot under games/{gameId}/players/{playerId}
                    const { totalBuyInCash } = queuePlayerGameWrite(bb, db, gameId, playerForCloud, rate);

                    // update user counters and email index
                    await upsertUserAndCounters(bb, db, playerForCloud, totalBuyInCash);

                    // ensure per-user game history doc
                    await ensureUserGameHistory(bb, db, playerForCloud, gameId, totalBuyInCash);

                    // collect graph writes (optional)
                    try {
                        await collectGraphWrites(bb, playerForCloud, gameId);
                    } catch (gErr) {
                        // non-fatal
                        console.warn('QuickRecord: collectGraphWrites failed', gErr);
                    }

                        // commit all batched writes
                        await bb.commitAll();
                        log('QuickRecord', 'cloud batch committed');
                    }
                } catch (cloudErr) {
                    log('QuickRecord', { step: 'cloud_error', err: cloudErr });
                    console.warn('QuickRecord: failed to save to cloud via batch builder', cloudErr);
                    Toast.show({ type: 'error', text1: simpleT('cloud_save_failed'), text2: (cloudErr as any)?.message || '' });
                    // 非阻塞：本地保存已完成，云端失败仅告知用户
                }
            } else {
                log('QuickRecord', 'cloudSync skipped for guest/anonymous user');
            }
            log('QuickRecord', '保存完成，触发完成提示');
            Alert.alert(simpleT('save_success_title'), simpleT('save_success_msg'), [
                { text: simpleT('return_home') || 'OK', onPress: () => navigation.navigate('Home') }
            ]);
        } catch (err) {
            log('QuickRecord', { step: 'error', err });
            console.error('QuickRecord save error', err);
            Alert.alert(simpleT('save_fail_title'), simpleT('save_fail_msg'), [
                { text: simpleT('return_home') || 'OK', onPress: () => navigation.navigate('Home') }
            ]);
        } finally {
            setSaving(false);
        }
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header Section with Gradient */}
            <LinearGradient
                colors={[color.primary, color.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerGradient}
            >
                <View style={styles.headerContent}>
                    <Text style={styles.headerSubtitle}>
                        {simpleT('quick_record_tip_cash') || 'Enter buy-in and settle amounts in cash'}
                    </Text>
                </View>
            </LinearGradient>

            {/* Main Content Card */}
            <View style={styles.contentContainer}>
                <View style={styles.inputCard}>
                    <View style={styles.inputSection}>
                        <Text style={styles.sectionTitle}>
                            <MaterialCommunityIcons name="poker-chip" size={16} color={color.primary} />
                            {' '}盲注设置
                        </Text>
                        
                        <View style={styles.blindRow}>
                            <View style={styles.blindInput}>
                                <InputField
                                    label={simpleT('small_blind_label')}
                                    fieldName="sb"
                                    value={smallBlind}
                                    placeholder="1"
                                    icon="currency-usd"
                                    keyboardType="number-pad"
                                    onChangeText={(f, v) => setSmallBlind(normalizeNumberInput(v || '', { integers: true }))}
                                />
                            </View>
                            <View style={styles.blindInput}>
                                <InputField
                                    label={simpleT('big_blind_label')}
                                    fieldName="bb"
                                    value={bigBlind}
                                    placeholder="2"
                                    icon="currency-usd"
                                    keyboardType="number-pad"
                                    onChangeText={(f, v) => setBigBlind(normalizeNumberInput(v || '', { integers: true }))}
                                />
                            </View>
                        </View>
                    </View>

                    <View style={styles.inputSection}>
                        <Text style={styles.sectionTitle}>
                            <MaterialCommunityIcons name="cash" size={16} color={color.primary} />
                            {' '}资金记录
                        </Text>
                        
                        <InputField
                            label={currencyInfo?.symbol ? `${simpleT('buyin_label')} (${currencyInfo.symbol})` : simpleT('buyin_label')}
                            fieldName="buyin"
                            value={buyIn}
                            placeholder={currencyInfo?.symbol ? `0 (${currencyInfo.symbol})` : '0'}
                            icon="bank"
                            onChangeText={(f, v) => setBuyIn(normalizeNumberInput(v || '', { allowDecimal: true }))}
                        />

                        <InputField
                            label={currencyInfo?.symbol ? `${simpleT('settle_label')} (${currencyInfo.symbol})` : simpleT('settle_label')}
                            fieldName="settle"
                            value={settleDiff}
                            placeholder={currencyInfo?.symbol ? `0 (${currencyInfo.symbol})` : '0'}
                            icon="calculator"
                            onChangeText={(f, v) => setSettleDiff(normalizeNumberInput(v || '', { allowDecimal: true, allowNegative: true }))}
                        />
                    </View>

                    {/* Save Button */}
                    <View style={styles.buttonContainer}>
                        <PrimaryButton 
                            title={simpleT('save')} 
                            onPress={onSaveLocal} 
                            loading={saving}
                            style={styles.saveButton}
                        />
                    </View>
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: color.background 
    },
    headerGradient: {
        paddingTop: Spacing.xl,
        paddingBottom: Spacing.xl,
        marginBottom: -Spacing.md, // Overlap with card
    },
    headerContent: {
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
    },
    headerTitle: {
        fontSize: FontSize.h2,
        fontWeight: '700',
        color: color.lightText,
        textAlign: 'center',
        marginBottom: Spacing.xs,
    },
    headerSubtitle: {
        fontSize: FontSize.small,
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
    },
    contentContainer: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.lg,
    },
    inputCard: {
        backgroundColor: color.lightBackground,
        borderRadius: Radius.lg,
        padding: Spacing.lg,
        shadowColor: color.shadowLight,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 2,
        borderWidth: 1,
        borderColor: color.lightGray + '30',
    },
    inputSection: {
        marginBottom: Spacing.lg,
    },
    sectionTitle: {
        fontSize: FontSize.body,
        fontWeight: '700',
        color: color.title,
        marginBottom: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
    },
    blindRow: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    blindInput: {
        flex: 1,
    },
    buttonContainer: {
        marginTop: Spacing.md,
    },
    saveButton: {
        borderRadius: Radius.md,
    },
    // Legacy styles (unused but kept for compatibility)
    content: { 
        padding: 16, 
        paddingTop: 24 
    },
    title: { 
        fontSize: 20, 
        fontWeight: '700', 
        marginBottom: 12, 
        color: color.title 
    },
    buttonRow: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        marginTop: 20 
    },
    helperText: { 
        marginTop: 12, 
        color: color.mutedText 
    }
});

export default QuickRecordScreen;
