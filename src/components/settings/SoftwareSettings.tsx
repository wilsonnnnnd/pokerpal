import React from 'react';
import { View, Text } from 'react-native';
import SelectField from '@/components/SelectField';
import { getCommonTimezones, getTimezoneDisplayName } from '@/utils/timezoneUtils';
import { Palette as color } from '@/constants';
import { simpleT } from '@/i18n/simpleT';
import { InfoRow } from '@/components/InfoRow';

export default function SoftwareSettings({ language, timezone, currency, setLanguage, setTimezone }: any) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={{ fontWeight: '700', marginBottom: 8, color: color.title }}>{simpleT('software_settings', language)}</Text>
      <InfoRow icon="translate" label="语言" text={language === 'zh' ? 'CN' : language === 'en' ? 'ENG' : (language ?? '')} />
      <InfoRow icon="clock-outline" label="时区" text={getTimezoneDisplayName(timezone)} />
      <InfoRow icon="currency-usd" label="货币" text={`${currency ?? ''}`} />

      <View style={{ paddingHorizontal: 12, marginTop: 6, marginBottom: 8 }}>
        <SelectField value={language} onChange={(val: string) => { try { setLanguage(val); } catch (e) { } }} options={[{ key: 'zh', label: 'CN' }, { key: 'en', label: 'ENG' }]} />
      </View>

      <View style={{ marginTop: 16, marginBottom: 8 }}>
        <Text style={{ fontWeight: '600', marginBottom: 8, color: color.title }}>{simpleT('timezone_management', language)}</Text>
        <View style={{ paddingHorizontal: 12 }}>
          <SelectField value={timezone} onChange={setTimezone} options={getCommonTimezones()} />
        </View>

        <Text style={{ color: color.mutedText, fontSize: 12, marginTop: 4, paddingHorizontal: 12 }}>
          {simpleT('current_timezone', language)}: {getTimezoneDisplayName(timezone)}
        </Text>
      </View>
    </View>
  );
}
