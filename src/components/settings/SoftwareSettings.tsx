import React from 'react';
import { View, Text } from 'react-native';
import simpleT from '@/i18n/simpleT';
import { useSettings } from '@/providers/SettingsProvider';
import SelectField from '@/components/common/SelectField';
import { InfoRow } from '@/components/common/InfoRow';
import { LANGUAGES, CURRENCIES, DEFAULT_TO_CURRENCY } from '@/constants/appConfig';
import { TouchableOpacity } from 'react-native';
import EditableHint from '@/components/EditableHint';
import { Palette as color } from '@/constants';

export default function SoftwareSettings({ language, currency }: any) {
  const { setLanguage, setCurrency } = useSettings();
  const [showSelect, setShowSelect] = React.useState(false);
  const [showCurrencySelect, setShowCurrencySelect] = React.useState(false);
  const [toast, setToast] = React.useState<{ visible: boolean; msg: string }>({ visible: false, msg: '' });

  const getLanguageDisplayName = (code: string) => {
    if (!code) return '';
    const key = `language_name_${String(code)}`;
    const translated = simpleT(key);
    // simpleT returns key if missing — fallback to uppercased code
    if (translated === key) return String(code).toUpperCase();
    return translated;
  };

  const handleSelectLanguage = async (code: string) => {
    try {
      await setLanguage(code);
      const name = getLanguageDisplayName(code);
      const msg = simpleT('language_changed', undefined, { name }) || `${simpleT('language_switched') || '语言已切换为'} ${name}`;
      setToast({ visible: true, msg });
      setTimeout(() => setToast({ visible: false, msg: '' }), 2000);
    } catch (e) {
      console.warn('setLanguage failed', e);
    }
  };
  return (
    <View style={{ marginBottom: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ fontWeight: '700', color: color.title }}>{simpleT('software_settings')}</Text>
        <EditableHint textKey="click_to_edit" fallback="点击修改" icon="pencil-outline" onPress={() => { setShowSelect((s) => !s); setShowCurrencySelect((s) => !s); }} />
      </View>
      <View style={{ padding: 12, backgroundColor: color.lightBackground, borderRadius: 8, borderWidth: 1, borderColor: color.borderColor }}>
        <TouchableOpacity onPress={() => setShowSelect((s) => !s)}>
          <InfoRow
            icon="translate"
            label={simpleT('language_label')}
            text={getLanguageDisplayName(language)}
          />
        </TouchableOpacity>

        {showSelect && (
          <View style={{ marginTop: 8 }}>
            <SelectField
              value={language}
              onChange={(k) => {
                handleSelectLanguage(k);
                setShowSelect(false);
              }}
              options={LANGUAGES.map((l) => ({ key: l.code, label: simpleT(l.nameKey) }))}
            />
          </View>
        )}

        <View style={{ marginTop: 12 }}>
          <TouchableOpacity onPress={() => setShowCurrencySelect((s) => !s)}>
            <InfoRow icon="currency-usd" label={simpleT('currency_label')} text={`${currency ?? ''}`} />
          </TouchableOpacity>

          {showCurrencySelect && (
            <View style={{ marginTop: 8 }}>
              <SelectField
                value={currency}
                onChange={async (k) => {
                  try {
                    await setCurrency(k);
                    const name = simpleT(k === DEFAULT_TO_CURRENCY ? 'currency_name_cny' : 'currency_name_aud');
                    const msg = simpleT('currency_changed', undefined, { name }) || `${simpleT('currency_switched') || ''} ${name}`;
                    setToast({ visible: true, msg });
                    setTimeout(() => setToast({ visible: false, msg: '' }), 2500);
                  } catch (e) {
                    console.warn('setCurrency failed', e);
                  }
                  setShowCurrencySelect(false);
                }}
                options={CURRENCIES.map((c) => ({ key: c.code, label: simpleT(c.nameKey) }))}
              />
              <Text style={{ color: color.mutedText, fontSize: 12, marginTop: 8 }}>{simpleT('currency_change_note')}</Text>
            </View>
          )}
        </View>
      </View>

      {toast.visible && (
        <View style={{ position: 'absolute', right: 16, top: 12, backgroundColor: color.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, zIndex: 9999 }}>
          <Text style={{ color: color.lightText, fontSize: 13 }}>{toast.msg}</Text>
        </View>
      )}
    </View>
  );
}
