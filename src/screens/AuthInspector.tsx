import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Button, ScrollView, StyleSheet } from 'react-native';
import { atobSafe as atobPoly } from '@/utils/base64';
import { useAuth } from '@/providers/AuthProvider';

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
  const { user, loading, getFreshIdToken, lastToken, events, addEvent } = useAuth();
  const [token, setToken] = useState<string | null>(lastToken ?? null);
  const [payload, setPayload] = useState<any | null>(null);

  useEffect(() => {
    setToken(lastToken ?? null);
  }, [lastToken]);

  useEffect(() => {
    setPayload(decodeJwtPayload(token));
  }, [token]);

  const iat = payload?.iat ? new Date(payload.iat * 1000) : null;
  const exp = payload?.exp ? new Date(payload.exp * 1000) : null;
  const remaining = payload?.exp ? Math.max(0, payload.exp - Math.floor(Date.now() / 1000)) : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.h1}>Auth Inspector</Text>

      <View style={styles.block}>
        <Text style={styles.label}>User</Text>
        {!user ? <Text>未登录</Text> : (
          <View>
            <Text>uid: {user.uid}</Text>
            <Text>email: {user.email ?? '—'}</Text>
            <Text>providerId: {user.providerId ?? '—'}</Text>
          </View>
        )}
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>Token payload</Text>
        {!token ? <Text>无 token</Text> : (
          <View>
            <Text>iat: {iat ? iat.toISOString() : '—'}</Text>
            <Text>exp: {exp ? exp.toISOString() : '—'}</Text>
            <Text>剩余秒: {remaining ?? '—'}</Text>
          </View>
        )}
      </View>

      <View style={styles.block}>
        <Button title="获取当前 token（非强刷）" onPress={async () => {
          const t = await getFreshIdToken();
          setToken(t);
        }} />
      </View>

      <View style={styles.block}>
        <Button title="强制刷新 token" onPress={async () => {
          const t = await getFreshIdToken({ force: true });
          setToken(t);
        }} />
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>事件日志（最近）</Text>
        {events.length === 0 ? <Text>无事件</Text> : events.map((e, idx) => (
          <View key={idx} style={{ marginBottom: 8 }}>
            <Text style={{ fontWeight: '600' }}>{e.type}</Text>
            <Text style={{ color: '#666' }}>{e.time} — {e.message}</Text>
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
});
