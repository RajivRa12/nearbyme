import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Modal, TextInput, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { alertMessage } from '../lib/alert';
import { useQuery } from '../hooks/useFetch';
import { api, formatDate, toArray } from '../lib/api';
import { C, T, E } from '../lib/design';
import { X, CalendarOff, Plus } from 'lucide-react-native';

function statusStyle(status: string) {
  if (status === 'APPROVED') return { bg: C.okLt, fg: C.ok };
  if (status === 'REJECTED') return { bg: C.errLt, fg: C.err };
  return { bg: C.warnLt, fg: C.warn };
}

function LeaveRow({ item }: { item: any }) {
  const st = statusStyle(item.status);
  return (
    <View style={[s.card, E.border]}>
      <View style={{ flex: 1 }}>
        <Text style={s.dates}>{formatDate(item.start_date)} — {formatDate(item.end_date)}</Text>
        <Text style={s.reason} numberOfLines={2}>{item.reason}</Text>
      </View>
      <View style={[s.statusPill, { backgroundColor: st.bg }]}>
        <Text style={[s.statusTxt, { color: st.fg }]}>{item.status}</Text>
      </View>
    </View>
  );
}

function NewLeaveModal({ visible, onClose, onSaved }: { visible: boolean; onClose: () => void; onSaved: () => void }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!startDate.trim() || !endDate.trim() || !reason.trim()) return;
    setSaving(true);
    try {
      await api('/api/staff/leaves/', {
        method: 'POST',
        body: { start_date: startDate.trim(), end_date: endDate.trim(), reason: reason.trim() },
      });
      setStartDate(''); setEndDate(''); setReason('');
      onSaved();
    } catch (e: any) {
      alertMessage('Could not submit', e?.message || 'Please check the dates and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={m.overlay} onPress={onClose} />
      <View style={m.dialog}>
        <Text style={m.title}>Request leave</Text>
        <Text style={m.label}>Start date (YYYY-MM-DD)</Text>
        <TextInput style={m.input} placeholder="2026-09-01" placeholderTextColor={C.ink3} value={startDate} onChangeText={setStartDate} />
        <Text style={m.label}>End date (YYYY-MM-DD)</Text>
        <TextInput style={m.input} placeholder="2026-09-03" placeholderTextColor={C.ink3} value={endDate} onChangeText={setEndDate} />
        <Text style={m.label}>Reason</Text>
        <TextInput style={[m.input, { minHeight: 80 }]} placeholder="e.g. Family function" placeholderTextColor={C.ink3} value={reason} onChangeText={setReason} multiline />
        <TouchableOpacity
          onPress={submit}
          disabled={saving || !startDate.trim() || !endDate.trim() || !reason.trim()}
          style={[m.submitBtn, { opacity: saving || !startDate.trim() || !endDate.trim() || !reason.trim() ? 0.6 : 1 }]}
        >
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={m.submitTxt}>Submit request</Text>}
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

export function LeaveRequests({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { data, isLoading, refetch } = useQuery<any>('/api/staff/leaves/');
  const leaves = toArray<any>(data);
  const [adding, setAdding] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[s.header, { paddingTop: insets.top + 16 }]}>
        <Text style={s.title}>Leave Requests</Text>
        <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
          <X size={24} color={C.ink} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => setAdding(true)} style={s.newBtn} activeOpacity={0.8}>
          <Plus size={16} color="#fff" />
          <Text style={s.newBtnTxt}>New leave request</Text>
        </TouchableOpacity>
        {isLoading ? (
          <ActivityIndicator color={C.blue} style={{ marginTop: 40 }} />
        ) : leaves.length === 0 ? (
          <View style={s.empty}>
            <CalendarOff size={40} color={C.line} strokeWidth={1.5} />
            <Text style={s.emptyTxt}>No leave requests yet.</Text>
          </View>
        ) : (
          leaves.map((item: any) => <LeaveRow key={item.id} item={item} />)
        )}
      </ScrollView>
      <NewLeaveModal visible={adding} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); refetch(); }} />
    </View>
  );
}

export function LeaveRequestsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide">
      <LeaveRequests onClose={onClose} />
    </Modal>
  );
}

const s = StyleSheet.create({
  header:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, backgroundColor: C.bgCard, borderBottomWidth: 1, borderBottomColor: C.line },
  title:   { ...T.h1 },
  newBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.ink, borderRadius: 10, paddingVertical: 14, marginBottom: 20 },
  newBtnTxt:{ fontSize: 15, fontWeight: '700', color: '#fff' },
  card:    { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.bgCard, borderRadius: 12, padding: 16, marginBottom: 12 },
  dates:   { fontSize: 14, fontWeight: '700', color: C.ink },
  reason:  { fontSize: 13, color: C.ink3, marginTop: 4 },
  statusPill:{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusTxt: { fontSize: 11, fontWeight: '700' },
  empty:   { alignItems: 'center', paddingTop: 40, gap: 12 },
  emptyTxt:{ ...T.body, color: C.ink3 },
});

const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  dialog:  { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  title:   { ...T.h3, marginBottom: 16 },
  label:   { ...T.label, marginBottom: 8, marginTop: 12 },
  input:   { backgroundColor: C.bg, borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 14, ...T.body, color: C.ink },
  submitBtn:{ marginTop: 20, backgroundColor: C.blue, borderRadius: 10, paddingVertical: 15, alignItems: 'center' },
  submitTxt:{ fontSize: 15, fontWeight: '700', color: '#fff' },
});
