import { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Modal, StyleSheet, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useContentBottomPadding } from '../hooks/useContentBottomPadding';
import { useQuery } from '../hooks/useFetch';
import { api, formatTime, formatDate, formatINR } from '../lib/api';
import { alertMessage } from '../lib/alert';
import { C, T, E, R, status as statusHelper, avatarTone } from '../lib/design';
import {
  X, CheckCircle, CalendarX, ChevronRight,
  Play, Slash, Calendar, Clock, MapPin, Navigation,
} from 'lucide-react-native';

// Normalize a raw AppointmentSlot row (from /api/therapist/schedule/) into
// the shape the UI below was built around.
function mapSlot(slot: any) {
  return {
    id: slot.id,
    customer_name: slot.customer_name || 'Guest',
    outlet_name: slot.outlet_name,
    start_time: slot.slot_start,
    end_time: slot.slot_end,
    status: slot.status,
    is_home_service: !!slot.is_home_service,
    service_address: slot.service_address,
    on_the_way_at: slot.on_the_way_at,
    items: [{ id: slot.id, service_name: slot.store_service_name, price: (slot.price_paise ?? 0) / 100 }],
  };
}

const LOCATION_PING_MS = 30000;

// Foreground-only location sharing while a home-service appointment is
// active — no background tracking, matches the rest of this app's
// polling-based (not push/websocket) approach to "live" data.
function useLocationPing(apptId: string | null) {
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    return () => { if (interval.current) clearInterval(interval.current); };
  }, []);
  const start = (id: string) => {
    if (interval.current) clearInterval(interval.current);
    const ping = async () => {
      try {
        const pos = await Location.getCurrentPositionAsync({});
        await api(`/api/therapist/schedule/${id}/update-location/`, {
          method: 'POST',
          body: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        });
      } catch {
        // transient GPS/network failure — next tick will retry
      }
    };
    ping();
    interval.current = setInterval(ping, LOCATION_PING_MS);
  };
  const stop = () => {
    if (interval.current) { clearInterval(interval.current); interval.current = null; }
  };
  return { start, stop };
}

// Avatar
function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const t = avatarTone(name || '?');
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.4, fontWeight: '700', color: t.fg }}>
        {(name || '?').charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

// Action Button
function ActionBtn({ label, color, bg, icon: Icon, onPress, loading = false }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      activeOpacity={1}
      style={[d.actionBtn, { backgroundColor: bg, borderColor: color, borderWidth: 1 }]}
    >
      {loading
        ? <ActivityIndicator size="small" color={color} />
        : <Icon size={16} color={color} strokeWidth={2} />}
      <Text style={[d.actionBtnTxt, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// Appointment Detail Sheet
function DetailSheet({ appt, onClose, onRefresh }: { appt: any; onClose: () => void; onRefresh: () => void }) {
  const [loading, setLoading] = useState('');
  const [onTheWay, setOnTheWay] = useState(!!appt.on_the_way_at);
  const st = statusHelper(appt.status);
  const locationPing = useLocationPing(appt.id);

  useEffect(() => {
    if (onTheWay) locationPing.start(appt.id);
    return () => locationPing.stop();
  }, [onTheWay]);

  const doAction = async (action: string, label: string, confirm?: string) => {
    const run = async () => {
      setLoading(action);
      try {
        await api(`/api/therapist/schedule/${appt.id}/${action}/`, { method: 'POST' });
        onRefresh();
        onClose();
      } catch (e: any) {
        alertMessage('Error', e.message || 'Could not update');
      } finally { setLoading(''); }
    };
    if (confirm) {
      alertMessage(label, confirm, [
        { text: 'Cancel', style: 'cancel' },
        { text: label, style: 'destructive', onPress: run },
      ]);
    } else { run(); }
  };

  const markOnTheWay = async () => {
    setLoading('on-the-way');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let coords: { lat: number; lng: number } | null = null;
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({});
        coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      }
      await api(`/api/therapist/schedule/${appt.id}/on-the-way/`, {
        method: 'POST',
        body: coords ?? {},
      });
      setOnTheWay(true);
      onRefresh();
    } catch (e: any) {
      alertMessage('Error', e.message || 'Could not notify the customer');
    } finally { setLoading(''); }
  };

  const isScheduled = appt.status === 'scheduled';
  const isStarted = appt.status === 'started';
  const isActive = isScheduled || isStarted;

  return (
    <Modal visible transparent animationType="slide">
      <Pressable style={d.overlay} onPress={onClose} />
      <View style={d.sheet}>
        <View style={d.sheetPill} />

        {/* Client header */}
        <View style={d.clientRow}>
          <Avatar name={appt.customer_name} size={52} />
          <View style={{ flex: 1 }}>
            <Text style={d.clientName}>{appt.customer_name}</Text>
          </View>
          <View style={[d.statusPill, { backgroundColor: st.bg }]}>
            <Text style={[d.statusPillTxt, { color: st.fg }]}>{st.label}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
            <X size={24} color={C.ink3} />
          </TouchableOpacity>
        </View>

        <View style={d.divider} />

        {/* Time & date */}
        <View style={d.metaRow}><Text style={d.metaKey}>Time</Text><Text style={d.metaVal}>{formatTime(appt.start_time)} — {formatTime(appt.end_time)}</Text></View>
        <View style={d.metaRow}><Text style={d.metaKey}>Date</Text><Text style={d.metaVal}>{formatDate(appt.start_time)}</Text></View>
        {!!appt.outlet_name && (
          <View style={d.metaRow}><Text style={d.metaKey}>Outlet</Text><Text style={d.metaVal}>{appt.outlet_name}</Text></View>
        )}
        {appt.is_home_service && !!appt.service_address && (
          <View style={d.metaRow}><Text style={d.metaKey}>Address</Text><Text style={d.metaVal}>{appt.service_address}</Text></View>
        )}

        {/* Services */}
        {appt.items?.length > 0 && (
          <>
            <View style={d.divider} />
            <Text style={d.svcLabel}>Service</Text>
            {appt.items.map((item: any) => (
              <View key={item.id} style={d.svcRow}>
                <Text style={d.svcName}>{item.service_name}</Text>
                <Text style={d.svcPrice}>{formatINR(item.price)}</Text>
              </View>
            ))}
          </>
        )}

        <View style={d.divider} />

        {/* Action buttons */}
        {isActive && (
          <View style={d.actionsGrid}>
            {isScheduled && appt.is_home_service && (
              onTheWay ? (
                <View style={[d.actionBtn, { backgroundColor: C.blueLt, borderColor: C.blue, borderWidth: 1 }]}>
                  <Navigation size={16} color={C.blue} strokeWidth={2} />
                  <Text style={[d.actionBtnTxt, { color: C.blue }]}>On the way</Text>
                </View>
              ) : (
                <ActionBtn label="On My Way" color={C.blue} bg={C.blueLt} icon={Navigation}
                  loading={loading === 'on-the-way'}
                  onPress={markOnTheWay} />
              )
            )}
            {isScheduled && (
              <ActionBtn label="Start Service" color={C.ok} bg={C.okLt} icon={Play}
                loading={loading === 'start'}
                onPress={() => doAction('start', 'Start')} />
            )}
            {isStarted && (
              <ActionBtn label="Complete" color={C.blue} bg={C.blueLt} icon={CheckCircle}
                loading={loading === 'complete'}
                onPress={() => doAction('complete', 'Complete')} />
            )}
            <ActionBtn label="Cancel" color={C.err} bg={C.errLt} icon={Slash}
              loading={loading === 'cancel'}
              onPress={() => doAction('cancel', 'Cancel', 'Cancel this appointment? This cannot be undone.')} />
          </View>
        )}
      </View>
    </Modal>
  );
}

// Filter Tabs
const FILTER_TABS = [
  { key: 'all',       label: 'All' },
  { key: 'upcoming',  label: 'Upcoming' },
  { key: 'completed', label: 'Done' },
  { key: 'cancelled', label: 'Cancelled' },
];

// Timeline appointment card
function ApptCard({ appt, onPress, onQuickAction }: { appt: any; onPress: () => void; onQuickAction: (action: string) => void }) {
  const st = statusHelper(appt.status);
  const isDone = ['done', 'cancelled'].includes(appt.status);

  return (
    <View style={s.timelineRow}>
      <View style={s.timeCol}>
        <Text style={[s.timeText, isDone && { color: C.ink3 }]}>{formatTime(appt.start_time)}</Text>
      </View>
      <TouchableOpacity onPress={onPress} activeOpacity={1}
        style={[s.apptCard, E.border, isDone && { backgroundColor: C.bgSoft, borderColor: 'transparent' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar name={appt.customer_name} size={40} />
          <View style={{ flex: 1 }}>
            <Text style={[s.cardName, isDone && { color: C.ink2 }]}>{appt.customer_name}</Text>
            <Text style={s.cardSvc}>{appt.items?.[0]?.service_name || 'Service'}</Text>
          </View>
          <View style={[s.chipSmall, { backgroundColor: st.bg }]}>
            <Text style={[s.chipSmallTxt, { color: st.fg }]}>{st.label}</Text>
          </View>
        </View>

        {/* Quick actions on upcoming cards */}
        {appt.status === 'scheduled' && (
          <View style={s.quickActions}>
            <TouchableOpacity
              style={[s.quickBtn, { backgroundColor: C.okLt }]}
              onPress={() => onQuickAction('start')}
              activeOpacity={1}
            >
              <Play size={12} color={C.ok} fill={C.ok} />
              <Text style={[s.quickBtnTxt, { color: C.ok }]}>Start</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.quickBtn, { backgroundColor: C.bgSoft }]}
              onPress={onPress}
              activeOpacity={1}
            >
              <ChevronRight size={12} color={C.ink2} />
              <Text style={[s.quickBtnTxt, { color: C.ink2 }]}>Details</Text>
            </TouchableOpacity>
          </View>
        )}
        {appt.status === 'started' && (
          <View style={s.quickActions}>
            <TouchableOpacity
              style={[s.quickBtn, { backgroundColor: C.blueLt }]}
              onPress={() => onQuickAction('complete')}
              activeOpacity={1}
            >
              <CheckCircle size={12} color={C.blue} />
              <Text style={[s.quickBtnTxt, { color: C.blue }]}>Complete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.quickBtn, { backgroundColor: C.bgSoft }]}
              onPress={onPress}
              activeOpacity={1}
            >
              <ChevronRight size={12} color={C.ink2} />
              <Text style={[s.quickBtnTxt, { color: C.ink2 }]}>Details</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

//  Main
export const Schedule = () => {
  const insets = useSafeAreaInsets();
  const contentBottomPadding = useContentBottomPadding();
  const { data, isLoading, refetch } = useQuery<any>('/api/therapist/schedule/?ordering=slot_start');
  const [selected, setSelected] = useState<any>(null);
  const [filter, setFilter] = useState('upcoming');
  const [viewMode, setViewMode] = useState<'timeline'|'calendar'|'week'>('timeline');

  const raw: any[] = Array.isArray(data) ? data
    : Array.isArray(data?.results) ? data.results : [];
  const appts = raw.map(mapSlot);

  const filtered = appts.filter(a => {
    if (filter === 'upcoming')  return ['scheduled', 'started'].includes(a.status);
    if (filter === 'completed') return a.status === 'done';
    if (filter === 'cancelled') return a.status === 'cancelled';
    return true;
  });

  const quickAction = async (id: string, action: string) => {
    try { await api(`/api/therapist/schedule/${id}/${action}/`, { method: 'POST' }); refetch(); }
    catch {}
  };

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      {/* ── View & Date Header ── */}
      <View style={[s.header, { paddingTop: insets.top + 16 }]}>
        <View style={{ flex: 1 }}>
          <Text style={s.dateTitle}>{new Date().toLocaleDateString('en-US', { weekday: 'long' })}</Text>
          <Text style={s.dateSub}>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</Text>
        </View>
        <View style={s.viewToggle}>
          <TouchableOpacity onPress={() => setViewMode('timeline')} style={[s.viewBtn, viewMode === 'timeline' && s.viewBtnActive]}>
            <Text style={[s.viewTxt, viewMode === 'timeline' && s.viewTxtActive]}>Day</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setViewMode('week')} style={[s.viewBtn, viewMode === 'week' && s.viewBtnActive]}>
            <Text style={[s.viewTxt, viewMode === 'week' && s.viewTxtActive]}>Week</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setViewMode('calendar')} style={[s.viewBtn, viewMode === 'calendar' && s.viewBtnActive]}>
            <Calendar size={14} color={viewMode === 'calendar' ? '#fff' : C.ink3} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterBar} contentContainerStyle={{ paddingHorizontal: 20 }}>
        {FILTER_TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            onPress={() => setFilter(t.key)}
            style={[s.filterTab, filter === t.key && s.filterTabActive]}
            activeOpacity={1}
          >
            <Text style={[s.filterTabTxt, filter === t.key && s.filterTabTxtActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={{ height: 1, backgroundColor: C.line }} />

      <ScrollView contentContainerStyle={{ paddingBottom: contentBottomPadding }} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ActivityIndicator color={C.blue} style={{ marginTop: 60 }} />
        ) : viewMode !== 'timeline' ? (
          <View style={s.placeholderView}>
            <Calendar size={48} color={C.line} strokeWidth={1.5} />
            <Text style={s.placeholderTitle}>{viewMode === 'calendar' ? 'Calendar View' : 'Week View'}</Text>
            <Text style={s.placeholderSub}>Switch back to Day view to see timeline details.</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={s.empty}>
            <CalendarX size={48} color={C.line} strokeWidth={1.5} />
            <Text style={s.emptyTitle}>No appointments</Text>
            <Text style={s.emptySub}>You have no {filter} appointments.</Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
            {filtered.map(a => (
              <ApptCard key={a.id} appt={a} onPress={() => setSelected(a)} onQuickAction={(action) => quickAction(a.id, action)} />
            ))}
          </View>
        )}
      </ScrollView>

      {selected && (
        <DetailSheet
          appt={selected}
          onClose={() => setSelected(null)}
          onRefresh={() => { setSelected(null); refetch(); }}
        />
      )}
    </View>
  );
};

//  Detail sheet styles
const d = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: 'rgba(28,27,25,0.5)' },
  sheet:    { backgroundColor: C.bgCard, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl, paddingHorizontal: 24, paddingBottom: 48, maxHeight: '90%' },
  sheetPill:{ width: 36, height: 5, backgroundColor: C.line, borderRadius: 2.5, alignSelf: 'center', marginTop: 12, marginBottom: 24 },
  clientRow:{ flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 20 },
  clientName:{ fontSize: 20, fontWeight: '700', color: C.ink, letterSpacing: -0.5 },
  statusPill:{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: R.pill, alignSelf: 'flex-start', marginTop: 4 },
  statusPillTxt:{ fontSize: 11, fontWeight: '700' },
  divider:  { height: 1, backgroundColor: C.line, marginVertical: 16 },
  metaRow:  { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  metaKey:  { ...T.body, color: C.ink2 },
  metaVal:  { ...T.bodySB },
  svcLabel: { ...T.h3, marginBottom: 12 },
  svcRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  svcName:  { ...T.body },
  svcPrice: { ...T.bodySB },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionBtn:   { width: '48%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: R.pill },
  actionBtnTxt:{ fontSize: 14, fontWeight: '700' },
});

// Main screen styles
const s = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: C.bg },
  // Header
  header:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, backgroundColor: C.bg },
  dateTitle:  { ...T.h1 },
  dateSub:    { ...T.caption, color: C.ink3, marginTop: 4 },
  viewToggle: { flexDirection: 'row', backgroundColor: C.bgSoft, borderRadius: R.pill, padding: 4, alignItems: 'center' },
  viewBtn:    { paddingHorizontal: 12, paddingVertical: 7, borderRadius: R.pill },
  viewBtnActive:{ backgroundColor: C.bgCard, ...E.xs },
  viewTxt:    { fontSize: 13, fontWeight: '700', color: C.ink2 },
  viewTxtActive:{ color: C.ink },

  // Filter bar
  filterBar:     { flexGrow: 0, backgroundColor: C.bg, paddingVertical: 4, paddingBottom: 12 },
  filterTab:     { paddingHorizontal: 16, paddingVertical: 8, borderRadius: R.pill, marginRight: 8, backgroundColor: C.bgSoft },
  filterTabActive:{ backgroundColor: C.blue },
  filterTabTxt:  { fontSize: 13, fontWeight: '600', color: C.ink2 },
  filterTabTxtActive:{ color: '#fff' },

  // Timeline
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 14 },
  timeCol:     { width: 56, paddingTop: 16, alignItems: 'flex-end' },
  timeText:    { fontSize: 13, fontWeight: '700', color: C.ink },

  // Card
  apptCard:    { flex: 1, backgroundColor: C.bgCard, borderRadius: R.lg, padding: 16, ...E.sm },
  cardName:    { fontSize: 16, fontWeight: '700', color: C.ink, letterSpacing: -0.3 },
  cardSvc:     { fontSize: 13, color: C.ink3, marginTop: 2 },
  chipSmall:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: R.pill },
  chipSmallTxt:{ fontSize: 10, fontWeight: '700' },

  // Quick action buttons on card
  quickActions:{ flexDirection: 'row', gap: 8, marginTop: 12 },
  quickBtn:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: R.pill },
  quickBtnTxt: { fontSize: 12, fontWeight: '700' },

  // Empty
  empty:       { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { ...T.h3, marginTop: 16, color: C.ink2 },
  emptySub:   { ...T.body, color: C.ink3, marginTop: 4 },
  placeholderView: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  placeholderTitle: { ...T.h3, marginTop: 16, color: C.ink2 },
  placeholderSub: { ...T.body, color: C.ink3, marginTop: 8, textAlign: 'center' },
});
