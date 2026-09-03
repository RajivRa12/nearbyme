import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet,
  Modal, TextInput, Pressable
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useContentBottomPadding } from '../hooks/useContentBottomPadding';
import { alertMessage } from '../lib/alert';
import { useQuery } from '../hooks/useFetch';
import { api, formatINR, formatDate, toArray } from '../lib/api';
import { C, T, E } from '../lib/design';
import { CheckCircle, Clock, TrendingUp, Wallet, ArrowDownCircle, Gift, Smartphone, ShieldCheck } from 'lucide-react-native';

function PayoutCard() {
  const payout = useQuery<any>('/api/therapist/payout-destinations/');
  const destinations = toArray<any>(payout.data);
  const destination = destinations[0];
  const [adding, setAdding] = useState(false);
  const [vpa, setVpa] = useState('');
  const [holderName, setHolderName] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!vpa.trim() || !holderName.trim()) return;
    setSaving(true);
    try {
      await api('/api/therapist/payout-destinations/', {
        method: 'POST',
        body: { type: 'upi_vpa', vpa: vpa.trim(), holder_name: holderName.trim() },
      });
      setAdding(false);
      setVpa('');
      setHolderName('');
      payout.refetch();
    } catch (e: any) {
      alertMessage('Could not save', e?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const verify = async () => {
    if (!destination) return;
    setSaving(true);
    try {
      await api(`/api/therapist/payout-destinations/${destination.id}/verify/`, { method: 'POST' });
      payout.refetch();
    } catch (e: any) {
      alertMessage('Could not verify', e?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const verified = destination?.verification_status === 'verified';

  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
      <View style={[p.card, E.border]}>
        <View style={p.iconBox}>
          <Smartphone size={18} color={C.blue} strokeWidth={1.8} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={p.title}>UPI payout method</Text>
          {destination ? (
            <Text style={p.sub}>
              {destination.vpa} {verified ? '· Verified' : '· Pending verification'}
            </Text>
          ) : (
            <Text style={p.sub}>Add a UPI ID so customers' tips reach you.</Text>
          )}
        </View>
        {destination ? (
          verified ? (
            <ShieldCheck size={18} color={C.ok} strokeWidth={2} />
          ) : (
            <TouchableOpacity onPress={verify} disabled={saving} style={p.verifyBtn}>
              <Text style={p.verifyBtnTxt}>{saving ? '…' : 'Verify'}</Text>
            </TouchableOpacity>
          )
        ) : (
          <TouchableOpacity onPress={() => setAdding(true)} style={p.verifyBtn}>
            <Text style={p.verifyBtnTxt}>Add</Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal visible={adding} transparent animationType="fade" onRequestClose={() => setAdding(false)}>
        <Pressable style={p.overlay} onPress={() => setAdding(false)} />
        <View style={p.dialog}>
          <Text style={p.dialogTitle}>Add UPI payout method</Text>
          <TextInput
            style={p.input}
            placeholder="yourname@upi"
            placeholderTextColor={C.ink3}
            autoCapitalize="none"
            value={vpa}
            onChangeText={setVpa}
          />
          <TextInput
            style={p.input}
            placeholder="Account holder name"
            placeholderTextColor={C.ink3}
            value={holderName}
            onChangeText={setHolderName}
          />
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
            <TouchableOpacity onPress={() => setAdding(false)} style={p.cancelBtn}>
              <Text style={p.cancelBtnTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={submit} disabled={saving || !vpa.trim() || !holderName.trim()} style={p.submitBtn}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={p.submitBtnTxt}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const p = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.bgCard, borderRadius: 12, padding: 14 },
  iconBox: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: C.blue + '20' },
  title: { fontSize: 14, fontWeight: '700', color: C.ink },
  sub: { fontSize: 12, color: C.ink3, marginTop: 2 },
  verifyBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: C.blue },
  verifyBtnTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  dialog: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  dialogTitle: { ...T.h3, marginBottom: 16 },
  input: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 14, ...T.body, marginBottom: 12 },
  cancelBtn: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center', backgroundColor: C.bgSoft },
  cancelBtnTxt: { fontSize: 16, fontWeight: '600', color: C.ink2 },
  submitBtn: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center', backgroundColor: C.blue },
  submitBtnTxt: { fontSize: 16, fontWeight: '600', color: '#fff' },
});

type Period = 'today' | 'week' | 'month' | 'wallet';

// Period selector 
function PeriodTabs({ value, onChange }: { value: Period; onChange: (v: Period) => void }) {
  const opts: { key: Period; label: string }[] = [
    { key: 'today',  label: 'Today' },
    { key: 'week',   label: 'This Week' },
    { key: 'month',  label: 'This Month' },
    { key: 'wallet', label: 'Wallet' },
  ];
  return (
    <View style={s.seg}>
      {opts.map(o => (
        <TouchableOpacity
          key={o.key}
          onPress={() => onChange(o.key)}
          style={[s.segItem, value === o.key && s.segActive]}
          activeOpacity={1}
        >
          <Text style={[s.segTxt, value === o.key && s.segTxtActive]}>{o.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

//  Stat card 
function StatCard({ label, value, sub, icon: Icon, color }: any) {
  return (
    <View style={[s.statCard, { borderLeftColor: color, borderLeftWidth: 3 }]}>
      <View style={s.statCardRow}>
        <View style={[s.statIconBox, { backgroundColor: color + '20' }]}>
          <Icon size={18} color={color} strokeWidth={1.8} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.statLbl}>{label}</Text>
          <Text style={s.statVal}>{value}</Text>
        </View>
      </View>
      {!!sub && <Text style={s.statSub}>{sub}</Text>}
    </View>
  );
}

// Transaction row 
function TxRow({ label, sub, amount, paid }: { label: string; sub: string; amount: string; paid?: boolean }) {
  return (
    <View style={s.txRow}>
      <View style={{ flex: 1 }}>
        <Text style={s.txLabel}>{label}</Text>
        <Text style={s.txSub}>{sub}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <Text style={s.txAmount}>{amount}</Text>
        {paid !== undefined && (
          <View style={[s.paidChip, { backgroundColor: paid ? C.okLt : C.warnLt }]}>
            <Text style={[s.paidTxt, { color: paid ? C.ok : C.warn }]}>{paid ? 'Paid' : 'Pending'}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

//  Main 
export const Earnings = () => {
  const insets = useSafeAreaInsets();
  const contentBottomPadding = useContentBottomPadding();
  // Real commission ledger (apps/therapist_app) — populated when a store
  // finalises an invoice against a booking, keyed to this professional via
  // CommissionAccrual.professional__user_account. The legacy /api/staff/earnings/
  // (Commission model) is never written to by the real booking pipeline.
  const comms  = useQuery<any>('/api/therapist/commissions/');
  const tips   = useQuery<any>('/api/therapist/tips/');
  const wallet = useQuery<any>('/api/staff/wallet/');
  const incentives = useQuery<any>('/api/staff/incentives/');

  const [period, setPeriod] = useState<Period>('today');

  const rawComms: any[] = comms.data?.results ?? (Array.isArray(comms.data) ? comms.data : (comms.data?.data ?? []));
  const commList: any[] = rawComms.map((c: any) => ({
    id: c.id,
    created_at: c.created_at,
    amount: (c.commission_paise ?? 0) / 100,
    service_name: c.service_name || 'Service',
  }));
  // Real tips (apps/therapist_app, linked to the UPI-deeplink flow customers
  // actually use) report amount_paise/initiated_at/status rather than the
  // legacy Tip model's amount/created_at — normalize to what this screen renders.
  const rawTips: any[] = tips.data?.results ?? (Array.isArray(tips.data) ? tips.data : (tips.data?.data ?? []));
  const tipList: any[] = rawTips.map((t: any) => ({
    id: t.id,
    created_at: t.initiated_at,
    amount: (t.amount_paise ?? 0) / 100,
    customer_name: t.customer_name || 'Guest',
    confirmed: t.status === 'CONFIRMED',
  }));
  const incList:  any[] = incentives.data?.results ?? (Array.isArray(incentives.data) ? incentives.data : []);
  const walletBalance = wallet.data?.balance ?? '0.00';

  const now = new Date();
  const filterByPeriod = (date: string) => {
    const d = new Date(date);
    if (period === 'today') return d.toDateString() === now.toDateString();
    if (period === 'week') {
      const start = new Date(now); start.setDate(now.getDate() - now.getDay());
      return d >= start && d <= now;
    }
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };

  const filteredComms = commList.filter(c => filterByPeriod(c.created_at));
  const filteredTips  = tipList.filter(t  => filterByPeriod(t.created_at));
  const filteredIncs  = incList.filter(inc => filterByPeriod(inc.created_at));
  const filteredCommTotal = filteredComms.reduce((sum, c) => sum + (c.amount || 0), 0);
  const filteredTipsTotal = filteredTips.reduce((sum, t) => sum + (t.amount || 0), 0);
  const periodTotal = filteredCommTotal + filteredTipsTotal;
  const avgPerService = filteredComms.length > 0 ? filteredCommTotal / filteredComms.length : 0;

  return (
    <View style={e.screen}>
      {/* Header */}
      <View style={[e.header, { paddingTop: insets.top + 16 }]}>
        <Text style={e.title}>Earnings</Text>
        <View style={[e.walletBadge, E.border]}>
          <Wallet size={14} color={C.ink2} />
          <Text style={e.walletTxt}>Wallet: {formatINR(walletBalance)}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: contentBottomPadding }} showsVerticalScrollIndicator={false}>
        {/* Payout method */}
        <PayoutCard />

        {/* Period selector */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <PeriodTabs value={period} onChange={setPeriod} />
        </View>

        {/* Wallet View */}
        {period === 'wallet' ? (
          <View style={e.section}>
            <View style={e.sectionHead}>
              <Text style={e.sectionTitle}>TRANSACTION HISTORY</Text>
              <Text style={e.sectionBadge}>{wallet.data?.transactions?.length || 0}</Text>
            </View>
            <View style={[e.card, E.border]}>
              {(wallet.data?.transactions || []).map((t: any, i: number, arr: any[]) => (
                <View key={t.id}>
                  <TxRow
                    label={t.description || (t.transaction_type === 'DEPOSIT' ? 'Deposit' : 'Withdrawal')}
                    sub={formatDate(t.created_at)}
                    amount={`${t.transaction_type === 'WITHDRAWAL' ? '-' : '+'}${formatINR(t.amount)}`}
                    paid={t.transaction_type !== 'WITHDRAWAL'}
                  />
                  {i < arr.length - 1 && <View style={e.rowDivider} />}
                </View>
              ))}
              {(!wallet.data?.transactions || wallet.data.transactions.length === 0) && (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={e.emptySub}>No transactions yet.</Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          <>
            {/* Big total */}
            <View style={e.totalBlock}>
              {comms.isLoading || tips.isLoading ? (
                <ActivityIndicator color={C.ink} />
              ) : (
                <>
                  <Text style={e.totalLabel}>
                    {period === 'today' ? "Today's Total" : period === 'week' ? "This Week" : "This Month"}
                  </Text>
                  <Text style={e.totalNum}>{formatINR(periodTotal)}</Text>
                  <Text style={e.totalSub}>Commission + tips for this period</Text>
                </>
              )}
            </View>

            {/* Stats grid */}
            <View style={e.statsGrid}>
              <StatCard
                label="Commission"
                value={formatINR(filteredCommTotal)}
                icon={TrendingUp}
                color={C.blue}
              />
              <StatCard
                label="Tips"
                value={formatINR(filteredTipsTotal)}
                icon={CheckCircle}
                color={C.gold}
              />
              <StatCard
                label="Services Done"
                value={String(filteredComms.length)}
                icon={CheckCircle}
                color={C.ok}
              />
              <StatCard
                label="Avg / Service"
                value={formatINR(avgPerService)}
                icon={Clock}
                color={C.warn}
              />
            </View>

            {/* Commissions breakdown */}
            {filteredComms.length > 0 && (
              <View style={e.section}>
                <View style={e.sectionHead}>
                  <Text style={e.sectionTitle}>COMMISSIONS</Text>
                  <Text style={e.sectionBadge}>{filteredComms.length}</Text>
                </View>
                <View style={[e.card, E.border]}>
                  {filteredComms.map((c: any, i: number) => (
                    <View key={c.id}>
                      <TxRow
                        label={c.service_name}
                        sub={formatDate(c.created_at)}
                        amount={formatINR(c.amount)}
                      />
                      {i < filteredComms.length - 1 && <View style={e.rowDivider} />}
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Tips breakdown */}
            {filteredTips.length > 0 && (
              <View style={e.section}>
                <View style={e.sectionHead}>
                  <Text style={e.sectionTitle}>TIPS</Text>
                  <Text style={e.sectionBadge}>{filteredTips.length}</Text>
                </View>
                <View style={[e.card, E.border]}>
                  {filteredTips.map((t: any, i: number) => (
                    <View key={t.id}>
                      <TxRow
                        label={`Tip from ${t.customer_name}`}
                        sub={formatDate(t.created_at)}
                        amount={formatINR(t.amount)}
                        paid={t.confirmed}
                      />
                      {i < filteredTips.length - 1 && <View style={e.rowDivider} />}
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Incentives breakdown */}
            {filteredIncs.length > 0 && (
              <View style={e.section}>
                <View style={e.sectionHead}>
                  <Text style={e.sectionTitle}>BONUSES & INCENTIVES</Text>
                  <Text style={e.sectionBadge}>{filteredIncs.length}</Text>
                </View>
                <View style={[e.card, E.border]}>
                  {filteredIncs.map((inc: any, i: number) => (
                    <View key={inc.id}>
                      <TxRow
                        label={inc.title}
                        sub={formatDate(inc.created_at)}
                        amount={formatINR(inc.amount)}
                        paid={inc.is_paid_out}
                      />
                      {i < filteredIncs.length - 1 && <View style={e.rowDivider} />}
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* No data state */}
            {!comms.isLoading && !tips.isLoading && filteredComms.length === 0 && filteredTips.length === 0 && filteredIncs.length === 0 && (
              <View style={e.empty}>
                <ArrowDownCircle size={48} color={C.line} strokeWidth={1.5} />
                <Text style={e.emptyTitle}>No earnings for this period</Text>
                <Text style={e.emptySub}>Complete appointments to earn commissions.</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const e = StyleSheet.create({
  screen:     { flex: 1, backgroundColor: C.bg },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingBottom: 16, backgroundColor: C.bgCard, borderBottomWidth: 1, borderBottomColor: C.line },
  title:      { ...T.h1 },
  walletBadge:{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: C.bgCard },
  walletTxt:  { fontSize: 13, fontWeight: '600', color: C.ink2 },

  totalBlock:  { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4, minHeight: 88, justifyContent: 'center' },
  totalLabel:  { fontSize: 12, fontWeight: '700', color: C.ink3, textTransform: 'uppercase', letterSpacing: 0.5 },
  totalNum:    { fontSize: 56, fontWeight: '800', color: C.ink, letterSpacing: -2, lineHeight: 62 },
  totalSub:    { fontSize: 13, color: C.ink3, marginTop: 4 },

  statsGrid:  { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 12, marginTop: 16 },
  statCard:   { width: '47%', backgroundColor: C.bgCard, borderRadius: 8, padding: 16 },
  statCardRow:{ flexDirection: 'row', alignItems: 'center', gap: 12 },
  statIconBox:{ width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statLbl:    { fontSize: 11, fontWeight: '600', color: C.ink3, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 },
  statVal:    { fontSize: 18, fontWeight: '800', color: C.ink, letterSpacing: -0.5 },
  statSub:    { fontSize: 11, color: C.ink3, marginTop: 6 },

  section:    { paddingHorizontal: 20, paddingTop: 28 },
  sectionHead:{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle:{ fontSize: 11, fontWeight: '800', color: C.ink3, letterSpacing: 1, textTransform: 'uppercase' },
  sectionBadge:{ backgroundColor: C.bgSoft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, fontSize: 11, fontWeight: '700', color: C.ink2, overflow: 'hidden' },
  card:       { backgroundColor: C.bgCard, borderRadius: 8, overflow: 'hidden' },
  rowDivider: { height: 1, backgroundColor: C.line, marginHorizontal: 20 },

  txRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 18 },
  txLabel: { fontSize: 15, fontWeight: '600', color: C.ink },
  txSub:   { fontSize: 13, color: C.ink3, marginTop: 2 },
  txAmount:{ fontSize: 17, fontWeight: '800', color: C.ink, letterSpacing: -0.5 },
  paidChip:{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  paidTxt: { fontSize: 11, fontWeight: '700' },

  // Segmented control
  seg:       { flexDirection: 'row', backgroundColor: C.bgSoft, borderRadius: 10, padding: 3 },
  segItem:   { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  segActive: { backgroundColor: C.bgCard, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 1 },
  segTxt:    { fontSize: 13, fontWeight: '600', color: C.ink3 },
  segTxtActive:{ fontSize: 13, fontWeight: '700', color: C.ink },

  empty:     { alignItems: 'center', paddingTop: 60, gap: 12, paddingHorizontal: 40 },
  emptyTitle:{ ...T.h2, textAlign: 'center' },
  emptySub:  { ...T.body, color: C.ink3, textAlign: 'center' },
});

const s = StyleSheet.create({ ...e });
