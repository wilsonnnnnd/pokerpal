import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette as color } from '@/constants';

export default function EditableHint({
  textKey,
  fallback,
  icon = 'pencil-outline',
  onPress,
}: {
  textKey?: string;
  fallback?: string;
  icon?: string;
  onPress?: () => void;
}) {
  // lazy require to avoid circular deps on simpleT in some contexts
  const simpleT = require('@/i18n/simpleT').default;
  const label = textKey ? simpleT(textKey) : fallback || '';

  const Content = (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <MaterialCommunityIcons name={icon as any} size={14} color={color.primary} style={{ marginRight: 6 }} />
      <Text style={{ fontSize: 12, color: color.primary }}>{label || fallback}</Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} accessibilityRole="button" style={{ padding: 4 }}>
        {Content}
      </TouchableOpacity>
    );
  }

  return Content;
}
