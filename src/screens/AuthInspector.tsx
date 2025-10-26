import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { atobSafe as atobPoly } from '@/utils/base64';
import { useAuth } from '@/providers/AuthProvider';
import { Palette as color } from '@/constants';
import { Spacing, Radius, FontSize } from '@/constants/designTokens';
import simpleT from '@/i18n/simpleT';
import { formatDateTime } from '@/services/gameHistoryService';

function decodeJwtPayload(token?: string | null) {
  try {
    if (!token) return null;
    const part = token.split('.')[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const json = atobPoly(b64);
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

export default function AuthInspector() {
  const { user, loading, getFreshIdToken, events, addEvent } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [payload, setPayload] = useState<any | null>(null);

  // fetch token on-demand when screen mounts
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const t = await getFreshIdToken();
        if (mounted) setToken(t);
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, [getFreshIdToken]);

  useEffect(() => {
    setPayload(decodeJwtPayload(token));
  }, [token]);

  const iat = payload?.iat ? new Date(payload.iat * 1000) : null;
  const exp = payload?.exp ? new Date(payload.exp * 1000) : null;
  const remaining = payload?.exp ? Math.max(0, payload.exp - Math.floor(Date.now() / 1000)) : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.h1}>{simpleT('auth_inspector_title')}</Text>
      <Text style={styles.tip}>{simpleT('auth_inspector_tip')}</Text>

      <View style={[styles.block, styles.card]}>
        <Text style={styles.label}>{simpleT('auth_user_label')}</Text>
        {!user ? (
          <Text>{simpleT('auth_not_logged')}</Text>
        ) : (
          <View>
            <Text>{simpleT('auth_field_uid')}: {user.uid}</Text>
            <Text>{simpleT('auth_field_email')}: {user.email ?? '—'}</Text>
            <Text>{simpleT('auth_field_providerId')}: {user.providerId ?? '—'}</Text>
          </View>
        )}
      </View>

      <View style={[styles.block, styles.card]}>
        <Text style={styles.label}>{simpleT('auth_token_payload_label')}</Text>
        {!token ? (
          <Text>{simpleT('auth_no_token')}</Text>
        ) : (
          <View>
            <View style={styles.tokenBox}>
              <Text style={styles.tokenText} selectable numberOfLines={8}>
                {JSON.stringify(payload ?? {}, null, 2)}
              </Text>
            </View>

            <Text style={{ marginTop: 8 }}>{simpleT('auth_iat_label')}: {iat ? iat.toISOString() : '—'}</Text>
            <Text>{simpleT('auth_exp_label')}: {exp ? exp.toISOString() : '—'}</Text>
            <Text>{simpleT('auth_remaining_seconds')}: {remaining ?? '—'}</Text>
          </View>
        )}
      </View>

      <View style={[styles.block, { flexDirection: 'row', gap: Spacing.sm }]}> 
        <View style={{ flex: 1 }}>
          <TouchableOpacity activeOpacity={0.85} style={styles.btn} onPress={async () => {
            const t = await getFreshIdToken();
            setToken(t);
          }}>
            <Text style={styles.btnText}>{simpleT('auth_get_token_button')}</Text>
          </TouchableOpacity>
        </View>
        <View style={{ width: Spacing.lg }} />
        <View style={{ flex: 1 }}>
          <TouchableOpacity activeOpacity={0.85} style={[styles.btn, styles.btnPrimary]} onPress={async () => {
            const t = await getFreshIdToken({ force: true });
            setToken(t);
          }}>
            <Text style={[styles.btnText, styles.btnPrimaryText]}>{simpleT('auth_force_refresh_button')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.block, styles.card]}>
        <Text style={styles.label}>{simpleT('auth_events_label')}</Text>
        {events.length === 0 ? (
          <Text>{simpleT('auth_no_events')}</Text>
        ) : events.map((e, idx) => (
          <View key={idx} style={styles.eventItem}>
            <Text style={styles.eventType}>{e.type}</Text>
            {(() => {
              const f = formatDateTime(String(e.time ?? ''));
              const ts = `${f.year}-${f.month}-${f.day} ${f.time}`;
              return <Text style={styles.eventMeta}>{ts} — {e.message}</Text>;
            })()}
          </View>
        ))}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  h1: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  block: { marginBottom: 12 },
  label: { fontWeight: '700', marginBottom: 6 },
  tip: {
    color: '#666',
    marginBottom: 12,
    fontSize: FontSize.small,
  },
  btn: {
    backgroundColor: color.lightGray,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  btnText: {
    color: color.text,
    fontWeight: '600',
  },
  btnPrimary: {
    backgroundColor: color.primary,
  },
  btnPrimaryText: {
    color: color.lightText,
  },
  card: {
    backgroundColor: '#fff',
    padding: Spacing.md,
    borderRadius: Radius.sm,
    // subtle shadow on iOS / elevation on Android can be added elsewhere
  },
  tokenBox: {
    backgroundColor: '#f7f7f8',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginTop: 4,
  },
  tokenText: {
    color: color.text,
    fontSize: FontSize.small,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  eventItem: {
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    backgroundColor: '#fafafa',
    marginBottom: Spacing.sm,
  },
  eventType: { fontWeight: '600' },
  eventMeta: { color: '#666', marginTop: 4 },
});
