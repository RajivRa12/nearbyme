import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Switch,
  StyleSheet, Modal, TextInput, ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { alertMessage } from '../lib/alert';
import { useQuery } from '../hooks/useFetch';
import { api, logout } from '../lib/api';
import { C, T, E, avatarTone } from '../lib/design';
import {
  ChevronRight, LogOut, User, Lock, Bell, Globe,
  Shield, HelpCircle, FileText, Moon, ArrowLeft
} from 'lucide-react-native';

// Change Password Modal 
function ChangePasswordModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext]       = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (next !== confirm) { alertMessage('Error', 'Passwords do not match'); return; }
    if (next.length < 6)  { alertMessage('Error', 'Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await api('/api/auth/change-password/', { method: 'POST', body: { current_password: current, new_password: next } });
      alertMessage('Success', 'Password changed successfully');
      onClose();
    } catch (e: any) {
      alertMessage('Error', e.message || 'Incorrect current password');
    } finally { setLoading(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={m.container}>
        <View style={m.header}>
          <TouchableOpacity onPress={onClose} style={m.btn}><Text style={m.btnTxt}>Cancel</Text></TouchableOpacity>
          <Text style={m.title}>Change Password</Text>
          <TouchableOpacity onPress={save} style={m.btn} disabled={loading}>
            {loading ? <ActivityIndicator size="small" color={C.blue} /> : <Text style={[m.btnTxt, { fontWeight: '700' }]}>Save</Text>}
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={m.form}>
          <Text style={m.label}>Current Password</Text>
          <TextInput style={m.input} value={current} onChangeText={setCurrent} secureTextEntry />
          <Text style={m.label}>New Password</Text>
          <TextInput style={m.input} value={next} onChangeText={setNext} secureTextEntry />
          <Text style={m.label}>Confirm New Password</Text>
          <TextInput style={m.input} value={confirm} onChangeText={setConfirm} secureTextEntry />
        </ScrollView>
      </View>
    </Modal>
  );
}

const m = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: C.line, backgroundColor: C.bgCard },
  title:     { ...T.h3 },
  btn:       { padding: 8, minWidth: 64, alignItems: 'center' },
  btnTxt:    { fontSize: 16, color: C.blue },
  form:      { padding: 24 },
  label:     { ...T.label, marginBottom: 8, marginTop: 20 },
  input:     { backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.line, borderRadius: 8, padding: 14, ...T.body, color: C.ink },
});

// Row types 
function SettingsRow({ icon: Icon, label, sub, onPress, right, danger = false }: {
  icon: any; label: string; sub?: string; onPress?: () => void;
  right?: React.ReactNode; danger?: boolean;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={s.row} activeOpacity={1} disabled={!onPress}>
      <View style={[s.iconBox, { backgroundColor: danger ? C.errLt : C.bgSoft }]}>
        <Icon size={18} color={danger ? C.err : C.ink2} strokeWidth={1.8} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.rowLabel, danger && { color: C.err }]}>{label}</Text>
        {sub && <Text style={s.rowSub}>{sub}</Text>}
      </View>
      {right ?? (onPress && <ChevronRight size={20} color={C.ink3} />)}
    </TouchableOpacity>
  );
}

// Main 
export const Settings = ({ onBack }: { onBack?: () => void }) => {
  const insets = useSafeAreaInsets();
  const { data } = useQuery<{ data: any }>('/api/staff/profile/');
  const user = data?.data;
  
  const settingsReq = useQuery<any>('/api/staff/settings/');

  const [notifAppt, setNotifAppt]   = useState(true);
  const [notifTip, setNotifTip]     = useState(true);
  const [notifReview, setNotifReview] = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);

  useEffect(() => {
    if (settingsReq.data) {
      setNotifAppt(settingsReq.data.push_notifications ?? true);
      setNotifTip(settingsReq.data.sms_alerts ?? true);
      setNotifReview(settingsReq.data.biometric_login ?? false);
    }
  }, [settingsReq.data]);

  const updateSetting = async (key: string, val: boolean) => {
    try {
      await api('/api/staff/settings/', {
        method: 'PATCH',
        body: { [key]: val }
      });
    } catch (e) {}
  };

  const toggleAppt = (val: boolean) => { setNotifAppt(val); updateSetting('push_notifications', val); };
  const toggleTip = (val: boolean) => { setNotifTip(val); updateSetting('sms_alerts', val); };
  const toggleReview = (val: boolean) => { setNotifReview(val); updateSetting('biometric_login', val); };

  const handleLogout = () => {
    alertMessage('Sign out?', 'You\'ll need to log back in to continue.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => { await logout(); } },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[s.header, { paddingTop: insets.top + 16 }]}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={{ padding: 4, marginRight: 12 }}>
            <ArrowLeft size={24} color={C.ink} />
          </TouchableOpacity>
        )}
        <Text style={s.headerTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* Profile Section */}
        <View style={s.group}>
          <Text style={s.groupLabel}>ACCOUNT</Text>
          <View style={[s.card, E.border]}>
            <SettingsRow icon={User} label="Edit Profile" sub="Name, bio, years of experience" onPress={() => onBack?.()} />
            <View style={s.div} />
            <SettingsRow icon={Lock} label="Change Password" onPress={() => setShowChangePwd(true)} />
          </View>
        </View>

        {/* Notifications */}
        <View style={s.group}>
          <Text style={s.groupLabel}>NOTIFICATIONS</Text>
          <View style={[s.card, E.border]}>
            <SettingsRow
              icon={Bell} label="Push Notifications"
              right={<Switch value={notifAppt} onValueChange={toggleAppt} trackColor={{ true: C.blue }} />}
            />
            <View style={s.div} />
            <SettingsRow
              icon={Bell} label="SMS Alerts"
              right={<Switch value={notifTip} onValueChange={toggleTip} trackColor={{ true: C.blue }} />}
            />
            <View style={s.div} />
            <SettingsRow
              icon={Lock} label="Biometric Login"
              right={<Switch value={notifReview} onValueChange={toggleReview} trackColor={{ true: C.blue }} />}
            />
          </View>
        </View>

        {/* Preferences */}
        <View style={s.group}>
          <Text style={s.groupLabel}>PREFERENCES</Text>
          <View style={[s.card, E.border]}>
            <SettingsRow icon={Globe} label="Language" sub="English" onPress={() => alertMessage('Coming soon', 'Language selection isn\'t available yet.')} />
            <View style={s.div} />
            <SettingsRow icon={Moon} label="Theme" sub="System Default" onPress={() => alertMessage('Coming soon', 'Theme selection isn\'t available yet.')} />
          </View>
        </View>

        {/* Support */}
        <View style={s.group}>
          <Text style={s.groupLabel}>SUPPORT</Text>
          <View style={[s.card, E.border]}>
            <SettingsRow icon={HelpCircle} label="Help Center" onPress={() => alertMessage('Coming soon', 'The Help Center isn\'t available yet — contact your store admin for now.')} />
            <View style={s.div} />
            <SettingsRow icon={FileText} label="Privacy Policy" onPress={() => alertMessage('Coming soon', 'The Privacy Policy page isn\'t available yet.')} />
            <View style={s.div} />
            <SettingsRow icon={Shield} label="Terms of Service" onPress={() => alertMessage('Coming soon', 'The Terms of Service page isn\'t available yet.')} />
          </View>
        </View>

        {/* Danger Zone */}
        <View style={s.group}>
          <View style={[s.card, E.border]}>
            <SettingsRow icon={LogOut} label="Sign Out" danger onPress={handleLogout} />
          </View>
        </View>

        <Text style={s.versionTxt}>Nearbyme Tech CRM · v2.0 · {user?.email}</Text>
      </ScrollView>

      <ChangePasswordModal visible={showChangePwd} onClose={() => setShowChangePwd(false)} />
    </View>
  );
};

const s = StyleSheet.create({
  header:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 16, backgroundColor: C.bgCard, borderBottomWidth: 1, borderBottomColor: C.line },
  headerTitle:{ ...T.h1 },

  group:      { paddingHorizontal: 24, paddingTop: 24 },
  groupLabel: { ...T.label, marginBottom: 12 },
  card:       { backgroundColor: C.bgCard, borderRadius: 8, overflow: 'hidden' },
  div:        { height: 1, backgroundColor: C.line, marginLeft: 60 },

  row:        { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16, paddingHorizontal: 16 },
  iconBox:    { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rowLabel:   { fontSize: 15, fontWeight: '600', color: C.ink },
  rowSub:     { fontSize: 13, color: C.ink3, marginTop: 2 },

  versionTxt: { ...T.caption, color: C.ink3, textAlign: 'center', marginTop: 36, marginBottom: 12 },
});
