import React from 'react';
import { View, Text } from 'react-native';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Palette as color } from '@/constants';
import { InfoRow } from '@/components/InfoRow';
import { simpleT } from '@/i18n/simpleT';

export default function UserInfoCard({ user, profile, language }: { user: any; profile: any; language: string }) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={{ fontWeight: '700', marginBottom: 8, color: color.title }}>{simpleT('user_info', language)}</Text>
      {user ? (
        <View style={{ padding: 12, backgroundColor: color.lightBackground, borderRadius: 8, borderWidth: 1, borderColor: color.borderColor }}>
          <Text style={{ fontWeight: '600', color: color.title }}>{user.displayName ?? simpleT('unnamed', language)}</Text>
          <Text style={{ color: color.text, marginTop: 4 }}>{user.email ?? (user.isAnonymous ? simpleT('guest_account', language) : '')}</Text>
          <Text style={{ color: color.text, marginTop: 4 }}>{simpleT('identity', language)}: {profile?.role ?? (user.isAnonymous ? 'guest' : 'player')}</Text>
        </View>
      ) : (
        <View style={{ padding: 12, backgroundColor: color.card, borderRadius: 8, borderWidth: 1, borderColor: color.borderColor }}>
          <Text style={{ color: color.mutedText }}>{simpleT('not_logged_in', language)}</Text>
        </View>
      )}
    </View>
  );
}
