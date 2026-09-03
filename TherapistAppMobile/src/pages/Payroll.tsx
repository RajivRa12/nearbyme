import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '../hooks/useFetch';
import { formatINR, toArray } from '../lib/api';
import { C, T, E } from '../lib/design';
import { X, Wallet } from 'lucide-react-native';

function monthLabel(monthYear: string) {
  const [mm, yyyy] = (monthYear || '').split('-');
  if (!mm || !yyyy) return monthYear;
  const d = new Date(Number(yyyy), Number(mm) - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function statusStyle(status: string) {
  if (status === 'PAID') return { bg: C.okLt, fg: C.ok };
  if (status === 'PROCESSING') return { bg: C.warnLt, fg: C.warn };
  return { bg: C.bgSoft, fg: C.ink2 };
}

function PayslipCard({ p }: { p: any }) {
  const st = statusStyle(p.status);
  return (
    <View style={[s.card, E.border]}>
      <View style={s.cardHead}>
        <Text style={s.month}>{monthLabel(p.month_year)}</Text>
        <View style={[s.statusPill, { backgroundColor: st.bg }]}>
          <Text style={[s.statusTxt, { color: st.fg }]}>{p.status}</Text>
        </View>
      </View>
      <Text style={s.total}>{formatINR(p.total_payout)}</Text>
      <View style={s.divider} />
      <View style={s.row}><Text style={s.rowKey}>Base salary</Text><Text style={s.rowVal}>{formatINR(p.base_salary)}</Text></View>
      <View style={s.row}><Text style={s.rowKey}>Commissions</Text><Text style={s.rowVal}>{formatINR(p.commissions_earned)}</Text></View>
      <View style={s.row}><Text style={s.rowKey}>Incentives</Text><Text style={s.rowVal}>{formatINR(p.incentives)}</Text></View>
      {Number(p.deductions) > 0 && (
        <View style={s.row}><Text style={s.rowKey}>Deductions</Text><Text style={[s.rowVal, { color: C.err }]}>-{formatINR(p.deductions)}</Text></View>
      )}
    </View>
  );
}

export function Payroll({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { data, isLoading } = useQuery<any>('/api/staff/payroll/');
  const payslips = toArray<any>(data);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[s.header, { paddingTop: insets.top + 16 }]}>
        <Text style={s.title}>Payroll</Text>
        <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
          <X size={24} color={C.ink} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ActivityIndicator color={C.blue} style={{ marginTop: 40 }} />
        ) : payslips.length === 0 ? (
          <View style={s.empty}>
            <Wallet size={40} color={C.line} strokeWidth={1.5} />
            <Text style={s.emptyTxt}>No payslips yet.</Text>
          </View>
        ) : (
          payslips.map((p: any) => <PayslipCard key={p.id} p={p} />)
        )}
      </ScrollView>
    </View>
  );
}

export function PayrollModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide">
      <Payroll onClose={onClose} />
    </Modal>
  );
}

const s = StyleSheet.create({
  header:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, backgroundColor: C.bgCard, borderBottomWidth: 1, borderBottomColor: C.line },
  title:   { ...T.h1 },
  card:    { backgroundColor: C.bgCard, borderRadius: 12, padding: 18, marginBottom: 14 },
  cardHead:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  month:   { fontSize: 16, fontWeight: '700', color: C.ink },
  statusPill:{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusTxt: { fontSize: 11, fontWeight: '700' },
  total:   { fontSize: 32, fontWeight: '800', color: C.ink, letterSpacing: -1, marginBottom: 12 },
  divider: { height: 1, backgroundColor: C.line, marginBottom: 10 },
  row:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowKey:  { fontSize: 14, color: C.ink2 },
  rowVal:  { fontSize: 14, fontWeight: '600', color: C.ink },
  empty:   { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTxt:{ ...T.body, color: C.ink3 },
});
