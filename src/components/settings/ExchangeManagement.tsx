import React, { useCallback, useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { Palette as color } from '@/constants';
import simpleT from '@/i18n/simpleT';
import { DEFAULT_FROM_CURRENCY, DEFAULT_TO_CURRENCY } from '@/constants/appConfig';
import { getExchangeRate } from '@/services/exchangeService';
import { useSettings } from '@/providers/SettingsProvider';

interface CardProps {
  language: string;
  setLastRateUpdate?: (s: string | null) => void;
  from?: string;
  to?: string;
}

function SettingsExchangeCardInline({ language, setLastRateUpdate, from = DEFAULT_FROM_CURRENCY, to = DEFAULT_TO_CURRENCY }: CardProps) {
  const { latestExchange, isExchangeRatesFresh, isUpdatingRates, updateExchangeRates, setExchangeRate } = useSettings();
  const [rateData, setRateData] = useState<any | null>(null);
  const [loadingRate, setLoadingRate] = useState(false);

  const loadRateFromService = useCallback(async () => {
    setLoadingRate(true);
    try {
      const res = await getExchangeRate(from, to);
      const src = res?.source ?? 'service';
      const data = { from: String(res.from).toUpperCase(), to: String(res.to).toUpperCase(), rate: res.rate, updated: res.updated ?? null, source: src };
      setRateData(data);
      if (setLastRateUpdate) setLastRateUpdate(res.updated ?? null);

      try {
        const fromUpper = String(from).toUpperCase();
        const toUpper = String(to).toUpperCase();
  if (fromUpper === DEFAULT_FROM_CURRENCY && res && typeof res.rate === 'number') {
          await setExchangeRate(toUpper, res.rate);
        }
      } catch (e) {
        // ignore
      }
    } catch (e) {
      setRateData({ error: e });
    } finally {
      setLoadingRate(false);
    }
  }, [from, to, setLastRateUpdate, setExchangeRate]);

  useEffect(() => {
    const key = String(to).toUpperCase();
    const fromUpper = String(from).toUpperCase();

  if (fromUpper === DEFAULT_FROM_CURRENCY && latestExchange && latestExchange.to === key && typeof latestExchange.rate === 'number' && isExchangeRatesFresh()) {
      setRateData({ from: fromUpper, to: key, rate: latestExchange.rate, updated: latestExchange.updated ?? null, source: latestExchange.source ?? null });
      if (setLastRateUpdate) setLastRateUpdate(latestExchange.updated ?? null);
      return;
    }

    loadRateFromService();
  }, [latestExchange, from, to, isExchangeRatesFresh, setLastRateUpdate, loadRateFromService]);

  const handleManualRefresh = async () => {
    try {
      await updateExchangeRates();
    } catch (e) {
      // ignore
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
              {simpleT('last_update')}: {new Date(rateData.updated).toLocaleString()}
            </Text>
          )}
          {rateData.source && (
            <Text style={{ color: color.mutedText, fontSize: 11 }}>{simpleT('rate_source')}: {rateData.source}</Text>
          )}
        </View>
      ) : rateData && 'error' in rateData ? (
        <Text style={{ color: color.mutedText }}>{String((rateData as any).error)}</Text>
      ) : (
  <Text style={{ color: color.mutedText }}>{simpleT('loading_rates')}</Text>
      )}

      <View style={{ marginTop: 8 }}>
        <PrimaryButton
          title={simpleT('update_rates')}
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

export default function ExchangeManagement({ language, setLastRateUpdate }: { language: string; setLastRateUpdate: (s: string | null) => void }) {
  return (
    <View style={{ marginBottom: 18 }}>
  <Text style={{ fontWeight: '700', marginBottom: 8, color: color.title }}>{simpleT('exchange_rate_management')}</Text>
      <View style={{ padding: 12, backgroundColor: color.lightBackground, borderRadius: 8, borderWidth: 1, borderColor: color.borderColor }}>
  <Text style={{ color: color.text, marginBottom: 12 }}>{simpleT('exchange_rate_description')}</Text>
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontWeight: '600', marginBottom: 8, color: color.title }}>{simpleT('current_rates')}:</Text>
          <SettingsExchangeCardInline language={language} setLastRateUpdate={setLastRateUpdate} from="AUD" to="CNY" />
        </View>
      </View>
    </View>
  );
}
