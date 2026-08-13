import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Screen } from '../../components/ui';
import { useAppTheme } from '../../lib/providers';
import { api, WEB_URL } from '../../lib/api';
import { brand } from '../../lib/theme';

export default function VerifyScreen() {
  const { ui, colors } = useAppTheme();
  const [token, setToken] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  async function verify(value?: string) {
    const t = (value ?? token).trim();
    if (!t) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await api<{
        valid?: boolean;
        certificate?: { title?: string; issuedToName?: string; serialNumber?: string };
        message?: string;
      }>(`/certificates/verify/${encodeURIComponent(t)}`, { auth: false });
      if (data.valid === false) {
        setResult(data.message || 'Certificate could not be verified.');
      } else {
        setResult(
          `Valid · ${data.certificate?.title || 'Certificate'} · ${data.certificate?.issuedToName || ''} · ${data.certificate?.serialNumber || ''}`,
        );
      }
    } catch {
      setResult(`Open web verifier: ${WEB_URL}/verify/certificate/${t}`);
    } finally {
      setLoading(false);
      setScanning(false);
    }
  }

  async function openScanner() {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) return;
    }
    setScanning(true);
  }

  return (
    <Screen scroll={!scanning}>
      <Text style={ui.title}>Verify Certificate</Text>
      <Text style={ui.subtitle}>
        Scan the certificate QR or paste the verification token. Connected to BCL Diocese ERP.
      </Text>

      {scanning ? (
        <View style={{ height: 320, borderRadius: 18, overflow: 'hidden', marginVertical: 8 }}>
          <CameraView
            style={{ flex: 1 }}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={({ data }) => {
              setToken(data);
              void verify(data);
            }}
          />
          <Pressable
            style={[ui.button, ui.secondary, { marginTop: 8 }]}
            onPress={() => setScanning(false)}
          >
            <Text style={ui.secondaryText}>Close camera</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <TextInput
            style={ui.input}
            placeholder="QR token / certificate UUID"
            placeholderTextColor={colors.muted}
            value={token}
            onChangeText={setToken}
            autoCapitalize="none"
          />
          <Pressable
            style={[ui.button, loading && ui.buttonDisabled]}
            onPress={() => verify()}
            disabled={loading}
          >
            <Text style={ui.buttonText}>{loading ? 'Verifying…' : 'Verify'}</Text>
          </Pressable>
          <Pressable style={[ui.button, { backgroundColor: brand.accent }]} onPress={openScanner}>
            <Text style={ui.buttonText}>Scan QR with camera</Text>
          </Pressable>
        </>
      )}

      {result ? (
        <View style={ui.card}>
          <Text style={[ui.cardTitle, { color: colors.primary }]}>Result</Text>
          <Text style={ui.body}>{result}</Text>
        </View>
      ) : null}
    </Screen>
  );
}
