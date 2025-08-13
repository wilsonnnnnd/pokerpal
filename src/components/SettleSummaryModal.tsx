import { GamePlaystyles as styles } from "@/assets/styles";
import { Player } from "@/types";
import { FlatList, Modal, View, Text } from "react-native";
import { PrimaryButton } from "./PrimaryButton";
import { useGameStore } from "@/stores/useGameStore";

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
    return (
        <Modal transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.summaryModal}>
                    <Text style={styles.summaryTitle}>结算总览</Text>

                    <FlatList
                        data={players}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ paddingVertical: 8 }}
                        renderItem={({ item }) => {
                            const cashDiff = ((item.settleChipCount || 0) - item.totalBuyInChips)/(baseChipAmount/baseCashAmount);
                            return (
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryName}>{item.nickname}</Text>
                                    <Text style={styles.summaryValue}>
                                        筹码: {item.settleChipCount ?? '-'}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.summaryValue,
                                            { color: cashDiff >= 0 ? 'green' : 'red' },
                                        ]}
                                    >
                                        {cashDiff >= 0 ? `+${cashDiff}` : `${cashDiff}`}
                                    </Text>
                                </View>
                            );
                        }}
                    />

                    <View style={styles.summaryButtonRow}>
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
