import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { apiGet } from '@/services/httpService';
import { getLocal, setLocal } from '@/services/storageService';
import simpleT from '@/i18n/simpleT';
import * as Clipboard from 'expo-clipboard';

const LAST_FETCH_KEY = 'healthcheck:lastFetch';
const ONE_HOUR_SECONDS = 60 * 60;

export default function HealthCheckScreen() {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<any | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  // Exchange UI moved to Settings screen

  const fetchHealth = async (initiatedByUser = false) => {
    setLoading(true);
    setError(null);
    try {
      if (initiatedByUser) {
        try {
          const last = (await getLocal<number>(LAST_FETCH_KEY)) ?? 0;
          const now = Math.floor(Date.now() / 1000);
          const elapsed = now - (last || 0);
          if (elapsed < ONE_HOUR_SECONDS) {
            const remain = ONE_HOUR_SECONDS - elapsed;
            setCooldownRemaining(remain);
            setError({ message: simpleT('health_cooldown', undefined, { minutes: Math.ceil(remain / 60) }) });
            return;
          }
          // record this click
          await setLocal(LAST_FETCH_KEY, Math.floor(Date.now() / 1000));
          setCooldownRemaining(ONE_HOUR_SECONDS);
        } catch (e) {
          // ignore storage errors and continue
        }
      }
  const data = await apiGet('/health');
  setResult(data);
  setLastFetchedAt(Date.now());
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // initial automatic fetch (not considered a manual click)
    fetchHealth(false);

    // update cooldownRemaining from storage on mount
    (async () => {
      try {
        const last = (await getLocal<number>(LAST_FETCH_KEY)) ?? 0;
        if (last) {
          const now = Math.floor(Date.now() / 1000);
          const elapsed = now - last;
          if (elapsed < ONE_HOUR_SECONDS) {
            setCooldownRemaining(ONE_HOUR_SECONDS - elapsed);
          }
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  // realtime countdown for cooldown
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const iv = setInterval(() => {
      setCooldownRemaining((s) => {
        if (s <= 1) {
          clearInterval(iv);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [cooldownRemaining]);

  const onCopy = async () => {
    try {
      const payload = result ? JSON.stringify(result, null, 2) : '';
      await Clipboard.setStringAsync(payload);
      setCopyStatus(simpleT('health_copy_success'));
      setTimeout(() => setCopyStatus(null), 2000);
    } catch (e) {
      setCopyStatus(simpleT('health_copy_failed'));
      setTimeout(() => setCopyStatus(null), 2000);
    }
  };


  // exchange functionality removed from this screen

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{simpleT('health_title')}</Text>
      <View style={styles.box}>
        <View style={styles.headerRow}>
          <Text style={styles.subtitle}>{simpleT('health_check_time')}</Text>
          <Text style={styles.muted}>{lastFetchedAt ? new Date(lastFetchedAt).toLocaleString() : simpleT('health_never_requested')}</Text>
        </View>

        <View style={styles.contentArea}>
          {loading ? (
            <ActivityIndicator size="large" />
          ) : error ? (
            <View>
              <Text style={styles.error}>{simpleT('health_error_request_failed')}</Text>
              <Text style={styles.errorDetail}>{simpleT('error_details')}: {JSON.stringify(error, null, 2)}</Text>
            </View>
          ) : (
            <>
              {/* Health card */}
              <View style={[styles.healthCard, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                <Text style={styles.healthTitle}>{simpleT('health_service_status')}</Text>
                {result && typeof result === 'object' && 'ok' in result ? (
                  result.ok ? (
                    <View style={styles.healthStatusRow}>
                      <View style={[styles.healthIcon, { backgroundColor: '#e6f4ea' }]}>
                        <MaterialCommunityIcons name="check" size={16} color="#1b8a2e" />
                      </View>
                      <Text style={[styles.healthStatusText, { color: '#1b8a2e' }]}>{simpleT('health_status_ok')}</Text>
                    </View>
                  ) : (
                    <View style={styles.healthStatusRow}>
                      <View style={[styles.healthIcon, { backgroundColor: '#fdecea' }]}>
                        <MaterialCommunityIcons name="close" size={16} color="#c92a2a" />
                      </View>
                      <Text style={[styles.healthStatusText, { color: '#c92a2a' }]}>{simpleT('health_status_unhealthy')}</Text>
                    </View>
                  )
                ) : (
                  <Text style={styles.muted}>{simpleT('health_no_status')}</Text>
                )}
              </View>
            </>
          )}
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.btn, cooldownRemaining > 0 ? styles.btnDisabled : styles.btnPrimary, { marginRight: 8 }]}
            onPress={() => fetchHealth(true)}
            disabled={cooldownRemaining > 0}
          >
            <Text style={styles.btnText}>{cooldownRemaining > 0 ? simpleT('health_cooldown_button', undefined, { minutes: Math.ceil(cooldownRemaining/60) }) : simpleT('health_reload')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.btnSmall, styles.btnOutline]} onPress={onCopy}>
            <Text style={[styles.btnOutlineText]}>{copyStatus ?? simpleT('health_copy')}</Text>
          </TouchableOpacity>
        </View>
        {/* Exchange UI moved to Settings screen */}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  box: { backgroundColor: '#fff', padding: 12, borderRadius: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  subtitle: { fontSize: 14, fontWeight: '700' },
  muted: { color: '#666', fontSize: 13 },
  contentArea: { marginBottom: 8 },
  error: { color: 'red', fontWeight: '700', marginBottom: 6 },
  errorDetail: { color: '#b00020', marginTop: 6 },
  ok: { color: 'green', fontWeight: '700', marginBottom: 6 },
  jsonBox: { maxHeight: 300, backgroundColor: '#f6f8fa', padding: 8, borderRadius: 6 },
  mono: { fontFamily: 'monospace', fontSize: 12, color: '#222' },
  buttonRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: '#1776ff' },
  btnDisabled: { backgroundColor: '#cfd8e3' },
  btnText: { color: '#fff', fontWeight: '700' },
  btnSmall: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btnOutline: { borderWidth: 1, borderColor: '#1776ff', backgroundColor: 'transparent' },
  btnOutlineText: { color: '#1776ff' },
  // exchange styles removed
  healthCard: { backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e6f4ea', marginBottom: 10 },
  healthTitle: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  healthStatus: { fontSize: 18, fontWeight: '800' },
  healthStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  healthIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  healthStatusText: { fontSize: 16, fontWeight: '700', marginLeft: 8 },
});
