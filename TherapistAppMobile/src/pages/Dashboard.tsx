import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TouchableWithoutFeedback,
  ActivityIndicator, Modal, FlatList, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useContentBottomPadding } from '../hooks/useContentBottomPadding';
import { alertMessage } from '../lib/alert';
import { useQuery } from '../hooks/useFetch';
import { api, formatINR, formatTime } from '../lib/api';
import { C, T, E, R, getGreeting, avatarTone, status } from '../lib/design';
import {
  Bell, X, CheckCircle, ChevronRight, Clock,
  LogIn, LogOut, Zap, AlertCircle, Target, TrendingUp
} from 'lucide-react-native';

// Avatar initials 
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

// Availability Status Badge 
const AVAILABILITY_OPTIONS = [
  { key: 'AVAILABLE', label: 'Available', color: C.ok, bg: C.okLt },
  { key: 'BUSY',      label: 'Busy',      color: C.warn, bg: C.warnLt },
  { key: 'BREAK',     label: 'On Break',  color: C.ink3, bg: C.bgSoft },
];

function StatusBadge({ current }: { current: string }) {
  const opt = AVAILABILITY_OPTIONS.find(o => o.key === current) ?? AVAILABILITY_OPTIONS[0];
  return (
    <View style={[s.statusBadge, { backgroundColor: opt.bg, borderColor: opt.color, borderWidth: 1 }]}>
      <View style={[s.statusDot, { backgroundColor: opt.color }]} />
      <Text style={[s.statusBadgeTxt, { color: opt.color }]}>{opt.label}</Text>
    </View>
  );
}

//  Target progress bar 
function TargetBar({ achieved, target, pct }: { achieved: number; target: number; pct: number }) {
  return (
    <View style={s.targetCard}>
      <View style={s.targetHead}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Target size={18} color={C.ink} />
          <Text style={s.targetTitle}>Monthly Target</Text>
        </View>
        <Text style={s.targetPct}>{pct}%</Text>
      </View>
      <View style={s.targetBar}>
        <View style={[s.targetFill, { width: `${Math.min(pct, 100)}%` as any, backgroundColor: pct >= 100 ? C.ok : pct > 60 ? C.blue : C.warn }]} />
      </View>
      <View style={s.targetNums}>
        <Text style={s.targetSub}>{formatINR(achieved)} earned</Text>
        <Text style={s.targetSub}>Target: {formatINR(target)}</Text>
      </View>
    </View>
  );
}

// Today next appointment card 
function NextUpCard({ appt }: { appt: any }) {
  const st = status(appt.status);
  return (
    <View style={[s.nextCard, E.border]}>
      <View style={s.nextTop}>
        <View>
          <Text style={s.nextLabel}>NEXT UP</Text>
          <Text style={s.nextTime}>{formatTime(appt.start_time)}</Text>
        </View>
        <View style={[s.statusChip, { backgroundColor: st.bg }]}>
          <Text style={[s.statusText, { color: st.fg }]}>{st.label}</Text>
        </View>
      </View>
      <View style={s.nextClientRow}>
        <Avatar name={appt.customer_name} size={44} />
        <View style={{ flex: 1 }}>
          <Text style={s.nextClientName}>{appt.customer_name}</Text>
          <Text style={s.nextService}>{appt.items?.[0]?.service_name || 'Service'}</Text>
        </View>
      </View>
      <View style={s.nextActionBorder} />
      <TouchableOpacity style={s.nextActionBtn} activeOpacity={1}>
        <Text style={s.nextActionTxt}>View Details</Text>
        <ChevronRight size={16} color={C.blue} />
      </TouchableOpacity>
    </View>
  );
}

// Notification row
function NotifRow({ item, onRead }: { item: any; onRead: (id: number) => void }) {
  const ICONS: Record<string, any> = {
    APPOINTMENT_BOOKED: '📅', APPOINTMENT_CANCELLED: '❌', TIP_RECEIVED: '💰',
    NEW_REVIEW: '⭐', NEW_MESSAGE: '💬', SHIFT_CHANGED: '🗓️', NEW_TRAINING: '📚',
    LEAVE_APPROVED: '✅', SALARY_PROCESSED: '💳',
  };
  const icon = ICONS[item.type] ?? '🔔';
  return (
    <TouchableOpacity
      onPress={() => !item.is_read && onRead(item.id)}
      style={[s.notifRow, !item.is_read && { backgroundColor: C.bluePale }]}
      activeOpacity={1}
    >
      <Text style={{ fontSize: 24 }}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={s.notifTitle}>{item.title}</Text>
        <Text style={s.notifMsg} numberOfLines={2}>{item.message}</Text>
        <Text style={s.notifTime}>
          {new Date(item.created_at).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
        </Text>
      </View>
      {!item.is_read && <View style={s.notifDot} />}
    </TouchableOpacity>
  );
}

// Main Dashboard 
export const Dashboard = () => {
  const insets = useSafeAreaInsets();
  const contentBottomPadding = useContentBottomPadding();
  const dash       = useQuery<{ data: any }>('/api/staff/dashboard/');
  const schedule   = useQuery<any>('/api/therapist/schedule/?ordering=slot_start');
  const notifs     = useQuery<any>('/api/staff/notifications/');
  const me         = useQuery<{ data: any }>('/api/staff/profile/');
  const attendance = useQuery<any>('/api/staff/attendance/');
  const target     = useQuery<any>('/api/staff/target/');
  const stats      = useQuery<any>('/api/staff/stats/');
  const aiData     = useQuery<any>('/api/staff/ai-suggestions/');
  const tasksData  = useQuery<any>('/api/staff/tasks/');

  const [showNotifs, setShowNotifs] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);

  const d = dash.data?.data;
  const firstName = me.data?.data?.first_name || 'there';
  const att = attendance.data;
  const tgt = target.data;
  const st  = stats.data;

  const rawSlots: any[] = Array.isArray(schedule.data) ? schedule.data
    : Array.isArray(schedule.data?.results) ? schedule.data.results : [];
  const appts = rawSlots.map((slot: any) => ({
    id: slot.id,
    customer_name: slot.customer_name || 'Guest',
    start_time: slot.slot_start,
    end_time: slot.slot_end,
    status: slot.status,
    items: [{ id: slot.id, service_name: slot.store_service_name }],
  }));
  const upcoming = appts.filter(a => ['scheduled', 'started'].includes(a.status));
  const completed = appts.filter(a => a.status === 'done').length;
  const [nextAppt, ...restAppts] = upcoming;

  const allNotifs: any[] = Array.isArray(notifs.data) ? notifs.data
    : Array.isArray(notifs.data?.results) ? notifs.data.results : [];
  const unreadCount = allNotifs.filter(n => !n.is_read).length;

  const markRead = async (id: number) => {
    try { await api(`/api/staff/notifications/${id}/mark_read/`, { method: 'POST' }); }
    catch {}
    notifs.refetch();
  };

  const handleCheckIn = () => {
    if (isCheckedIn) {
      // Already checked in → confirm check out
      alertMessage('Check Out?', 'Are you sure you want to clock out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Check Out', style: 'destructive', onPress: async () => {
          setCheckLoading(true);
          try {
            await api('/api/staff/attendance/', { method: 'POST', body: { action: 'check_out' } });
            attendance.refetch();
          } catch (e: any) {
            alertMessage('Check Out Failed', e?.data?.error || e?.message || 'Could not check out.');
          }
          setCheckLoading(false);
        }},
      ]);
    } else {
      // Not checked in → open status picker first
      setShowStatusPicker(true);
    }
  };

  const handleCheckInWithStatus = async (chosenStatus: string) => {
    setShowStatusPicker(false);
    setCheckLoading(true);
    try {
      await api('/api/staff/attendance/', { method: 'POST', body: { action: 'check_in', availability_status: chosenStatus } });
      attendance.refetch();
    } catch (e: any) {
      alertMessage('Check In Failed', e?.data?.error || e?.message || 'Could not complete check-in.');
    }
    setCheckLoading(false);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!isCheckedIn) {
      // Not yet checked in — use this as check-in with status
      await handleCheckInWithStatus(newStatus);
      return;
    }
    try {
      await api('/api/staff/attendance/', { method: 'POST', body: { action: 'status', availability_status: newStatus } });
      attendance.refetch();
    } catch (e: any) {
      alertMessage('Status Update Failed', e?.data?.error || e?.message || 'Could not update your status.');
    }
  };

  const isCheckedIn = !!(att?.clock_in && !att?.clock_out);
  const availStatus = att?.availability_status || 'AVAILABLE';

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* ── Topbar ── */}
      <View style={[s.topbar, { paddingTop: insets.top + 16 }]}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={s.greetText}>{getGreeting()}, {firstName} 👋</Text>
            {st?.performance_badge && (
              <View style={s.badgeFloating}>
                <Text style={s.badgeFloatingTxt}>{st.performance_badge}</Text>
              </View>
            )}
          </View>
          <Text style={s.dateText}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setShowNotifs(true)} style={s.bellBtn} activeOpacity={0.8}>
          <Bell size={28} color={C.ink} strokeWidth={1.5} />
          {unreadCount > 0 && (
            <View style={s.unreadBadge}>
              <Text style={s.unreadBadgeTxt}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: contentBottomPadding }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── AI Daily Suggestions ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4 }}>
          <View style={[s.aiCard, E.border]}>
            <View style={s.aiHead}>
              <Text style={s.aiTitle}>✨ AI Assistant</Text>
              <Text style={s.aiTime}>{aiData.data?.updated_at || 'Just now'}</Text>
            </View>
            <Text style={s.aiBody}>
              {aiData.isLoading ? "Analyzing your day..." : (aiData.data?.suggestion || `${getGreeting()}! Have a great day.`)}
            </Text>
          </View>
        </View>

        {/* ── CHECK IN / STATUS BAR ── */}
        <View style={s.actionBar}>
          <TouchableOpacity
            onPress={handleCheckIn}
            disabled={checkLoading}
            activeOpacity={1}
            style={[s.checkBtn, { backgroundColor: isCheckedIn ? C.okLt : C.ink }]}
          >
            {isCheckedIn
              ? <LogOut size={18} color={C.ok} strokeWidth={2} />
              : <LogIn size={18} color="#fff" strokeWidth={2} />}
            <Text style={[s.checkBtnTxt, { color: isCheckedIn ? C.ok : '#fff' }]}>
              {isCheckedIn ? 'Check Out' : 'Check In'}
            </Text>
          </TouchableOpacity>

          {isCheckedIn && <StatusBadge current={availStatus} />}
        </View>

        {/* ── EARNINGS + QUICK STATS ── */}
        <View style={s.earningsBlock}>
          <Text style={s.earningsLabel}>TODAY'S EARNINGS</Text>
          {dash.isLoading
            ? <ActivityIndicator color={C.ink} style={{ marginVertical: 8 }} />
            : <Text style={s.earningsNum}>{formatINR(d?.earnings_today?.total ?? 0)}</Text>}
        </View>

        {/* Stats grid: 2x3 */}
        <View style={s.statsGrid}>
          {[
            { label: 'COMMISSION', value: formatINR(d?.earnings_today?.commission ?? 0), color: C.blue },
            { label: 'TIPS TODAY',  value: formatINR(d?.earnings_today?.tips ?? 0),       color: C.gold },
            { label: 'APPTS',       value: String(d?.today_appointments ?? '0'),           color: C.ink },
            { label: 'UPCOMING',    value: String(upcoming.length),                        color: C.ink },
            { label: 'COMPLETED',   value: String(completed),                              color: C.ok },
            { label: 'FOLLOWERS',   value: String(d?.followers ?? '0'),                    color: C.ink2 },
          ].map((stat, i) => (
            <View key={i} style={[s.statCell,
              { borderRightWidth: i % 3 !== 2 ? 1 : 0, borderRightColor: C.line },
              { borderBottomWidth: i < 3 ? 1 : 0, borderBottomColor: C.line }
            ]}>
              <Text style={[s.statValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={s.section}>
          {/* ── Target ── */}
          {tgt && tgt.revenue_target > 0 && (
            <TargetBar
              achieved={parseFloat(tgt.achieved || 0)}
              target={parseFloat(tgt.revenue_target || 0)}
              pct={tgt.percentage ?? 0}
            />
          )}

          {/* ── Pending Tasks ── */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Pending Tasks</Text>
            <View style={[s.card, E.border]}>
              {tasksData.isLoading ? (
                <ActivityIndicator color={C.blue} style={{ padding: 20 }} />
              ) : tasksData.data?.results?.length === 0 ? (
                <Text style={{ padding: 20, color: C.ink3, textAlign: 'center' }}>No pending tasks.</Text>
              ) : (
                tasksData.data?.results?.map((task: any, index: number) => (
                  <View key={task.id}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={s.taskRow}
                      onPress={async () => {
                        await api(`/api/staff/tasks/${task.id}/`, {
                          method: 'PATCH',
                          body: { is_completed: !task.is_completed }
                        });
                        tasksData.refetch();
                      }}
                    >
                      <View style={[s.taskCheck, task.is_completed && { backgroundColor: C.blue, borderColor: C.blue }]}>
                        {task.is_completed && <CheckCircle size={14} color="#fff" />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.taskTxt, task.is_completed && { textDecorationLine: 'line-through', color: C.ink3 }]}>
                          {task.title}
                        </Text>
                        {task.description && (
                          <Text style={s.taskSub}>{task.description}</Text>
                        )}
                      </View>
                      <ChevronRight size={16} color={C.ink3} />
                    </TouchableOpacity>
                    {index < tasksData.data.results.length - 1 && <View style={s.rowDivider} />}
                  </View>
                ))
              )}
            </View>
          </View>

          {/* ── Next Appointment ── */}
          <Text style={s.sectionLabel}>NEXT UP</Text>
          {schedule.isLoading ? (
            <ActivityIndicator color={C.blue} />
          ) : nextAppt ? (
            <NextUpCard appt={nextAppt} />
          ) : (
            <View style={[s.clearDay, E.border]}>
              <CheckCircle size={22} color={C.ok} strokeWidth={2} />
              <Text style={s.clearDayText}>Your schedule is clear.</Text>
            </View>
          )}

          {/* ── Later Today ── */}
          {restAppts.length > 0 && (
            <View style={{ marginTop: 24 }}>
              <Text style={s.sectionLabel}>LATER TODAY</Text>
              <View style={[s.remainList, E.border]}>
                {restAppts.slice(0, 4).map((a: any, i: number) => (
                  <View key={a.id}>
                    <View style={s.schedRow}>
                      <Text style={s.schedTime}>{formatTime(a.start_time)}</Text>
                      <Avatar name={a.customer_name} size={32} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.schedName}>{a.customer_name}</Text>
                        <Text style={s.schedSvc}>{a.items?.[0]?.service_name || 'Service'}</Text>
                      </View>
                      <View style={[s.schedStatus, { backgroundColor: status(a.status).bg }]}>
                        <Text style={[s.schedStatusTxt, { color: status(a.status).fg }]}>{status(a.status).label}</Text>
                      </View>
                    </View>
                    {i < Math.min(restAppts.length - 1, 3) && <View style={s.rowDivider} />}
                  </View>
                ))}
              </View>
              {restAppts.length > 4 && (
                <Text style={s.moreText}>+{restAppts.length - 4} more appointments</Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Status Picker Modal (root-level so Android touches work) ── */}
      <Modal visible={showStatusPicker} transparent animationType="fade" onRequestClose={() => setShowStatusPicker(false)}>
        <TouchableWithoutFeedback onPress={() => setShowStatusPicker(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' }}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={s.statusPicker}>
                <Text style={s.statusPickerTitle}>Set Your Status</Text>
                {AVAILABILITY_OPTIONS.map(o => (
                  <TouchableOpacity
                    key={o.key}
                    onPress={() => handleStatusChange(o.key)}
                    activeOpacity={0.7}
                    style={[s.statusPickerRow, availStatus === o.key && { backgroundColor: o.bg }]}
                  >
                    <View style={[s.statusDot, { backgroundColor: o.color }]} />
                    <Text style={[s.statusPickerRowTxt, { color: o.color }]}>{o.label}</Text>
                    {availStatus === o.key && <CheckCircle size={18} color={o.color} />}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Notification drawer ── */}
      <Modal visible={showNotifs} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setShowNotifs(false)}><View style={s.drawerBg} /></TouchableWithoutFeedback>
        <View style={[s.drawer, { paddingBottom: insets.bottom + 12 }]}>
          <View style={s.drawerPill} />
          <View style={s.drawerHeader}>
            <Text style={s.drawerTitle}>Notifications</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {unreadCount > 0 && (
                <TouchableOpacity onPress={async () => {
                  await api('/api/staff/notifications/mark_all_read/', { method: 'POST' });
                  notifs.refetch();
                }} activeOpacity={1}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: C.blue }}>Mark all read</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setShowNotifs(false)}>
                <X size={24} color={C.ink} />
              </TouchableOpacity>
            </View>
          </View>
          <FlatList
            data={allNotifs}
            keyExtractor={n => String(n.id)}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: C.line }} />}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingTop: 48, gap: 12 }}>
                <Bell size={48} color={C.line} />
                <Text style={{ ...T.body, color: C.ink3 }}>You're all caught up.</Text>
              </View>
            }
            renderItem={({ item }) => <NotifRow item={item} onRead={markRead} />}
          />
        </View>
      </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  topbar:      { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, backgroundColor: C.bg, paddingBottom: 16 },
  greetText:   { fontSize: 24, fontWeight: '700', color: C.ink, letterSpacing: -0.7 },
  dateText:    { ...T.caption, color: C.ink3, marginTop: 4 },
  badgeFloating: { backgroundColor: C.goldLt, borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 3 },
  badgeFloatingTxt:{ fontSize: 11, fontWeight: '700', color: C.gold },
  bellBtn:     { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  unreadBadge: { position: 'absolute', top: 8, right: 8, width: 16, height: 16, backgroundColor: C.accent, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.bg },
  unreadBadgeTxt:{ fontSize: 9, fontWeight: '800', color: '#fff' },

  // Action bar
  actionBar:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 4, paddingBottom: 20, backgroundColor: C.bg },
  checkBtn:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 12, borderRadius: R.pill },
  checkBtnTxt: { fontSize: 14, fontWeight: '700' },

  // Status badge
  statusBadge:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: R.pill },
  statusDot:    { width: 8, height: 8, borderRadius: 4 },
  statusBadgeTxt:{ fontSize: 13, fontWeight: '700' },
  statusPicker: { backgroundColor: C.bgCard, borderRadius: R.lg, padding: 24, width: 280, gap: 4 },
  statusPickerTitle:{ ...T.h3, marginBottom: 12 },
  statusPickerRow:{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: R.sm },
  statusPickerRowTxt:{ flex: 1, fontSize: 15, fontWeight: '700' },

  // Earnings
  earningsBlock:  { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 },
  earningsLabel:  { ...T.label, marginBottom: 4 },
  earningsNum:    { fontSize: 44, fontWeight: '700', color: C.ink, letterSpacing: -1.5, lineHeight: 50 },

  // Stats Grid
  statsGrid:   { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: C.bgCard, borderRadius: R.lg, marginHorizontal: 20, marginTop: 12, overflow: 'hidden', ...E.sm },
  statCell:    { width: '33.33%', paddingVertical: 18, alignItems: 'center', borderRightWidth: 1, borderBottomWidth: 1, borderColor: C.line },
  statValue:   { fontSize: 18, fontWeight: '700', letterSpacing: -0.4 },
  statLabel:   { fontSize: 10, fontWeight: '600', letterSpacing: 0.4, color: C.ink3, marginTop: 4, textTransform: 'uppercase' },

  section:     { paddingHorizontal: 20, paddingTop: 28 },
  sectionLabel:{ ...T.label, marginBottom: 12 },

  // Target
  targetCard:  { backgroundColor: C.bgCard, borderRadius: R.lg, padding: 20, marginBottom: 24, ...E.sm },
  targetHead:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  targetTitle: { ...T.bodySB },
  targetPct:   { fontSize: 18, fontWeight: '700', color: C.ink },
  targetBar:   { height: 8, backgroundColor: C.bgSoft, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  targetFill:  { height: 8, borderRadius: 4 },
  targetNums:  { flexDirection: 'row', justifyContent: 'space-between' },
  targetSub:   { ...T.caption, color: C.ink3 },

  // Next up card
  nextCard:      { backgroundColor: C.bgCard, borderRadius: R.lg, marginBottom: 10, overflow: 'hidden', ...E.sm },
  nextTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 20, paddingBottom: 16 },
  nextLabel:     { ...T.label, marginBottom: 4 },
  nextTime:      { fontSize: 24, fontWeight: '700', color: C.ink, letterSpacing: -0.5 },
  nextClientRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingBottom: 20 },
  nextClientName:{ fontSize: 18, fontWeight: '700', color: C.ink },
  nextService:   { ...T.caption, color: C.ink2, marginTop: 4 },
  nextActionBorder:{ height: 1, backgroundColor: C.line },
  nextActionBtn: { paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.bgSoft },
  nextActionTxt: { fontSize: 14, fontWeight: '700', color: C.blue },
  statusChip:    { paddingHorizontal: 8, paddingVertical: 4, borderRadius: R.xs },
  statusText:    { fontSize: 11, fontWeight: '700' },

  // Clear day
  clearDay:    { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.bgCard, borderRadius: R.lg, padding: 20, marginBottom: 10, ...E.sm },
  clearDayText:{ ...T.bodySB },

  // Schedule rows
  remainList:  { backgroundColor: C.bgCard, borderRadius: R.lg, overflow: 'hidden', ...E.sm },
  schedRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  schedTime:   { fontSize: 13, fontWeight: '700', color: C.ink, width: 52 },
  schedName:   { fontSize: 14, fontWeight: '700', color: C.ink },
  schedSvc:    { fontSize: 12, color: C.ink3, marginTop: 1 },
  schedStatus: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: R.xs },
  schedStatusTxt:{ fontSize: 10, fontWeight: '700' },
  rowDivider:  { height: 1, backgroundColor: C.line, marginHorizontal: 16 },
  moreText:    { ...T.caption, color: C.ink3, marginTop: 12, textAlign: 'center' },

  // Notifications
  drawerBg:    { flex: 1, backgroundColor: 'rgba(28,27,25,0.5)' },
  drawer:      { backgroundColor: C.bgCard, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl, maxHeight: '80%' },
  drawerPill:  { width: 36, height: 5, backgroundColor: C.line, borderRadius: 2.5, alignSelf: 'center', marginTop: 12 },
  drawerHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: C.line },
  drawerTitle: { ...T.h2 },
  notifRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 24, paddingVertical: 16 },
  notifTitle:  { fontSize: 15, fontWeight: '700', color: C.ink, marginBottom: 4 },
  notifMsg:    { ...T.caption, color: C.ink2, lineHeight: 20 },
  notifTime:   { fontSize: 12, color: C.ink3, marginTop: 6 },
  notifDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: C.blue, marginTop: 6 },

  // AI & Tasks
  aiCard:      { backgroundColor: C.blueLt, borderRadius: R.lg, padding: 18 },
  aiHead:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  aiTitle:     { fontSize: 13, fontWeight: '700', color: C.blueMid },
  aiTime:      { fontSize: 11, color: C.blueMid, opacity: 0.6 },
  aiBody:      { fontSize: 14, color: C.ink, lineHeight: 22 },
  card:        { backgroundColor: C.bgCard, borderRadius: R.lg, overflow: 'hidden', ...E.sm },
  taskRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  taskCheck:   { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: C.line },
  taskTxt:     { fontSize: 14, fontWeight: '600', color: C.ink },
  taskSub:     { fontSize: 12, color: C.ink3, marginTop: 2 },
});
