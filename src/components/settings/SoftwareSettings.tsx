import React from 'react';
import { View, Text } from 'react-native';
import { HomePagestyles as styles } from '@/assets/styles';
import { simpleT } from '@/i18n/simpleT';
import { InfoRow } from '@/components/InfoRow';

export default function SoftwareSettings({ language, currency }: any) {
  return (
    <View style={styles.settingsSection}>
      <Text style={styles.settingsTitle}>{simpleT('software_settings', language)}</Text>
      <InfoRow icon="translate" label="语言" text={language === 'zh' ? 'CN' : language === 'en' ? 'ENG' : (language ?? '')} />
      <InfoRow icon="currency-usd" label="货币" text={`${currency ?? ''}`} />

      {/* timezone management removed */}
    </View>
  );
}
