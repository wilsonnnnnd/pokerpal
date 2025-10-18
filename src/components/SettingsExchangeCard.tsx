import React, { useCallback, useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Palette as color } from '@/constants';
import { simpleT } from '@/i18n/simpleT';
import { getExchangeRate } from '@/services/exchangeService';
import { useSettings } from '@/providers/SettingsProvider';

interface Props {
    language: string;
    setLastRateUpdate?: (s: string | null) => void;
    from?: string;
    to?: string;
}

export default function SettingsExchangeCard({ language, setLastRateUpdate, from = 'AUD', to = 'CNY' }: Props) {
    const { latestExchange, isExchangeRatesFresh, isUpdatingRates, updateExchangeRates, setExchangeRate } = useSettings();
    const [rateData, setRateData] = useState<any | null>(null);
    const [loadingRate, setLoadingRate] = useState(false);


    const loadRateFromService = useCallback(async () => {
        setLoadingRate(true);
        try {
            const res = await getExchangeRate(from, to);
            // prefer source reported by backend, fallback to 'service'
            const src = res?.source ?? 'service';
            const data = { from: String(res.from).toUpperCase(), to: String(res.to).toUpperCase(), rate: res.rate, updated: res.updated ?? null, source: src };
            setRateData(data);
            if (setLastRateUpdate) setLastRateUpdate(res.updated ?? null);

            // persist into settings only when provider's model (AUD base) applies
            try {
                const fromUpper = String(from).toUpperCase();
                const toUpper = String(to).toUpperCase();
                if (fromUpper === 'AUD' && res && typeof res.rate === 'number') {
                    await setExchangeRate(toUpper, res.rate);
                }
            } catch (e) {
                // ignore persistence errors
            }
        } catch (e) {
            setRateData({ error: e });
        } finally {
            setLoadingRate(false);
        }
    }, [from, to, setLastRateUpdate, setExchangeRate]);

    // prefer cached value from settings to avoid frequent network calls
    useEffect(() => {
        const key = String(to).toUpperCase();
        const fromUpper = String(from).toUpperCase();

        // provider stores rates with AUD as base: e.g. { CNY: 4.7 } means 1 AUD = 4.7 CNY
        if (fromUpper === 'AUD' && latestExchange && latestExchange.to === key && typeof latestExchange.rate === 'number' && isExchangeRatesFresh()) {
            setRateData({ from: fromUpper, to: key, rate: latestExchange.rate, updated: latestExchange.updated ?? null, source: latestExchange.source ?? null });
            if (setLastRateUpdate) setLastRateUpdate(latestExchange.updated ?? null);
            return;
        }

        // 如果 provider 的 latestExchange 匹配请求的 pair 且未过期，则已在上面返回。
        // 否则直接从后端加载最新汇率并根据结果决定是否持久化到 provider（仅当 from==='AUD' 时）。
        loadRateFromService();

    }, [latestExchange, from, to, isExchangeRatesFresh, setLastRateUpdate, loadRateFromService]);

    const handleManualRefresh = async () => {

        try {
            await updateExchangeRates();
            // after provider updates, the effect above will update rateData from exchangeRates
        } catch (e) {
            // fallback to direct load
        }

    };

    return (
        <View>
            {rateData && !('error' in rateData) ? (
                <View>
                    <Text style={{ color: color.text, fontSize: 14, marginBottom: 2, fontWeight: '500' }}>
                        {`1 ${String(rateData.from).toUpperCase()} = \u00a5${Number(rateData.rate).toFixed(4)} ${String(rateData.to).toUpperCase()}`}
                    </Text>
                    {rateData.updated && (
                        <Text style={{ color: color.mutedText, fontSize: 11, marginTop: 2 }}>
                            {simpleT('last_update', language)}: {new Date(rateData.updated).toLocaleString()}
                        </Text>
                    )}
                    {rateData.source && (
                        <Text style={{ color: color.mutedText, fontSize: 11 }}>{`\u6765\u6e90: ${rateData.source}`}</Text>
                    )}
                </View>
            ) : rateData && 'error' in rateData ? (
                <Text style={{ color: color.mutedText }}>{String((rateData as any).error)}</Text>
            ) : (
                <Text style={{ color: color.mutedText }}>{simpleT('loading_rates', language)}</Text>
            )}

            <View style={{ marginTop: 8 }}>
                <PrimaryButton
                    title={simpleT('update_rates', language)}
                    icon="refresh"
                    variant="outlined"
                    onPress={handleManualRefresh}
                    disabled={loadingRate || isUpdatingRates}
                    style={{ backgroundColor: color.card }}
                    textStyle={{ color: color.primary }}
                    iconColor={color.primary}
                />
            </View>
        </View>
    );
}
