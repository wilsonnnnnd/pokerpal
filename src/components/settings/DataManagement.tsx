import React from 'react';
import { View, Text } from 'react-native';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { Palette as color } from '@/constants';
import simpleT from '@/i18n/simpleT';

export default function DataManagement({ language, onClear }: { language: string; onClear: () => void }) {
  return (
    <View style={{ marginBottom: 18 }}>
  <Text style={{ fontWeight: '700', marginBottom: 8, color: color.title }}>{simpleT('data_management')}</Text>
      <View style={{ padding: 12, backgroundColor: color.lightBackground, borderRadius: 8, borderWidth: 1, borderColor: color.borderColor }}>
  <Text style={{ color: color.text, marginBottom: 12 }}>{simpleT('clear_database_description')}</Text>
        <PrimaryButton
          title={simpleT('clear_database')}
          icon="database-remove"
          variant="filled"
          onPress={onClear}
          style={{ backgroundColor: color.error }}
          textStyle={{ color: color.background }}
        />
      </View>
    </View>
  );
}
