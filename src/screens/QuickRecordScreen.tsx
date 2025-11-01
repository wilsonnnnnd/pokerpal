import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { Header } from '@/components/Header';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { InputField } from '@/components/common/InputField';
import simpleT from '@/i18n/simpleT';
import usePermission from '@/hooks/usePermission';
import localGameService from '@/services/localGameService';

// QuickRecordScreen: 简洁的单用户快速记录页面
export const QuickRecordScreen: React.FC = () => {
    const { authUser, isHost, loading } = usePermission();
    const [smallBlind, setSmallBlind] = useState('1');
    const [bigBlind, setBigBlind] = useState('2');
    const [buyIn, setBuyIn] = useState('0');
    const [settleDiff, setSettleDiff] = useState('0');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const onSaveLocal = async () => {
        // 强制要求已登录且非匿名用户才能保存
        if (!authUser || authUser.isAnonymous) {
            Alert.alert(simpleT('profile_guest_mode_title'), simpleT('profile_guest_mode_msg'));
            return;
        }

        setSaving(true);
        try {
            const playerId = authUser.uid; // 仅使用 authUser.uid
            const players = [
                {
                    playerId,
                    buyIn: Number(buyIn) || 0,
                    chips: undefined,
                    isSB: false,
                    isBB: false,
                }
            ];

            // localGameService.createGame 接受 GamePlayerEntry[]
            await localGameService.createGame({ players, initialBuyIn: Number(buyIn || 0), meta: { notes, sb: Number(smallBlind), bb: Number(bigBlind) } });
            Alert.alert(simpleT('save_success_title'), simpleT('save_success_msg'));
        } catch (err) {
            Alert.alert(simpleT('save_fail_title'), simpleT('save_fail_msg'));
        } finally {
            setSaving(false);
        }
    };

    // UI: 简洁表单，使用现有 InputField 与 PrimaryButton 保持样式一致
    return (
        <View style={styles.container}>
            <Header />
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <Text style={styles.title}>{simpleT('buyin_label')}</Text>

                <InputField
                    label={simpleT('small_blind_label')}
                    fieldName="sb"
                    value={smallBlind}
                    placeholder="1"
                    icon="currency-usd"
                    onChangeText={(f, v) => setSmallBlind(v)}
                />

                <InputField
                    label={simpleT('big_blind_label')}
                    fieldName="bb"
                    value={bigBlind}
                    placeholder="2"
                    icon="currency-usd"
                    onChangeText={(f, v) => setBigBlind(v)}
                />

                <InputField
                    label={simpleT('buyin_label')}
                    fieldName="buyin"
                    value={buyIn}
                    placeholder="0"
                    icon="bank"
                    onChangeText={(f, v) => setBuyIn(v)}
                />

                <InputField
                    label={simpleT('settle_label')}
                    fieldName="settle"
                    value={settleDiff}
                    placeholder="0"
                    icon="calculator"
                    onChangeText={(f, v) => setSettleDiff(v)}
                />

                <InputField
                    label={simpleT('click_to_edit')}
                    fieldName="notes"
                    value={notes}
                    placeholder={simpleT('click_to_edit')}
                    icon="note"
                    onChangeText={(f, v) => setNotes(v)}
                />

                <View style={styles.buttonRow}>
                    <PrimaryButton title={simpleT('save')} onPress={onSaveLocal} loading={saving} />
                    {/* 若为 host，可显示“同步到云端”按钮（后续实现） */}
                </View>

                {(!loading && !isHost) && (
                    <Text style={styles.helperText}>{simpleT('permission_denied_subtitle')}</Text>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    content: { padding: 16, paddingTop: 24 },
    title: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
    buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
    helperText: { marginTop: 12, color: '#666' }
});

export default QuickRecordScreen;
