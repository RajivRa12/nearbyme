import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, Modal, TextInput, Switch, Image
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useContentBottomPadding } from '../hooks/useContentBottomPadding';
import { alertMessage } from '../lib/alert';
import * as ImagePicker from 'expo-image-picker';
import { useQuery } from '../hooks/useFetch';
import { logout, api, uploadPhoto } from '../lib/api';
import { C, T, avatarTone } from '../lib/design';
import {
  ChevronRight, Star, MapPin, CheckCircle, Award,
  LogOut, Edit2, Settings2, Users, Percent,
  Briefcase, TrendingUp, MessageCircle, Plus, X, ShieldCheck,
  Wallet, CalendarOff
} from 'lucide-react-native';
import { Settings } from './Settings';
import { ReviewsModal } from './Reviews';
import { PayrollModal } from './Payroll';
import { LeaveRequestsModal } from './LeaveRequests';

// Edit basic profile (name + bio + experience + photo)
function EditProfileModal({ staffUser, account, visible, onClose, onSave }: any) {
  const [loading, setLoading] = useState(false);
  const [firstName, setFirstName] = useState(staffUser?.first_name || '');
  const [lastName, setLastName] = useState(staffUser?.last_name || '');
  const [bio, setBio] = useState(account?.bio || '');
  const [yearsExp, setYearsExp] = useState(String(account?.years_experience ?? '0'));
  const [photoUrl, setPhotoUrl] = useState(account?.profile_photo_url || '');
  const [uploading, setUploading] = useState(false);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    setUploading(true);
    try {
      const asset = result.assets[0];
      const { url } = await uploadPhoto('/api/therapist/upload-photo/', asset.uri, asset.fileName || 'profile.jpg');
      setPhotoUrl(url);
    } catch (e: any) {
      alertMessage('Upload failed', e.message || 'Could not upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await Promise.all([
        api('/api/staff/profile/', { method: 'PATCH', body: { first_name: firstName, last_name: lastName } }),
        api('/api/therapist/profile/', {
          method: 'PATCH',
          body: { bio, years_experience: parseInt(yearsExp) || 0, profile_photo_url: photoUrl || null },
        }),
      ]);
      onSave();
    } catch (e: any) {
      alertMessage('Error', e.message || 'Could not update profile');
    } finally { setLoading(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={m.container}>
        <View style={m.header}>
          <TouchableOpacity onPress={onClose} style={m.btn}><Text style={m.btnTxt}>Cancel</Text></TouchableOpacity>
          <Text style={m.title}>Edit Profile</Text>
          <TouchableOpacity onPress={handleSave} style={m.btn} disabled={loading}>
            {loading ? <ActivityIndicator size="small" color={C.blue} /> : <Text style={[m.btnTxt, { fontWeight: '700' }]}>Save</Text>}
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={m.form} keyboardShouldPersistTaps="handled">
          <Text style={m.label}>First Name</Text>
          <TextInput style={m.input} value={firstName} onChangeText={setFirstName} />
          <Text style={m.label}>Last Name</Text>
          <TextInput style={m.input} value={lastName} onChangeText={setLastName} />
          <Text style={m.label}>Years of Experience</Text>
          <TextInput style={m.input} value={yearsExp} onChangeText={setYearsExp} keyboardType="number-pad" />
          <Text style={m.label}>Bio</Text>
          <TextInput style={[m.input, { minHeight: 80 }]} value={bio} onChangeText={setBio} multiline />
          <Text style={m.label}>Profile Photo</Text>
          <TouchableOpacity onPress={pickPhoto} disabled={uploading} style={m.photoPicker} activeOpacity={0.8}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={m.photoPreview} />
            ) : (
              <View style={[m.photoPreview, m.photoPlaceholder]}>
                <Edit2 size={18} color={C.ink3} />
              </View>
            )}
            <Text style={m.photoPickerTxt}>{uploading ? 'Uploading…' : photoUrl ? 'Change photo' : 'Choose from library'}</Text>
            {uploading && <ActivityIndicator size="small" color={C.blue} />}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

// Add a portfolio photo (media_url + caption)
function AddPhotoModal({ visible, onClose, existing, onSave }: any) {
  const [mediaUrl, setMediaUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    setUploading(true);
    try {
      const asset = result.assets[0];
      const { url } = await uploadPhoto('/api/therapist/upload-photo/', asset.uri, asset.fileName || 'portfolio.jpg');
      setMediaUrl(url);
    } catch (e: any) {
      alertMessage('Upload failed', e.message || 'Could not upload photo');
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!mediaUrl.trim()) return;
    setSaving(true);
    try {
      const portfolio_items = [
        ...existing.map((p: any) => ({ media_url: p.media_url, caption: p.caption, display_order: p.display_order })),
        { media_url: mediaUrl.trim(), caption: caption.trim(), display_order: existing.length },
      ];
      await api('/api/therapist/profile/', { method: 'PATCH', body: { portfolio_items } });
      setMediaUrl(''); setCaption('');
      onSave();
    } catch (e: any) {
      alertMessage('Error', e.message || 'Could not add photo');
    } finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={d.overlay}>
        <View style={d.dialog}>
          <View style={d.dialogHead}>
            <Text style={d.dialogTitle}>Add portfolio photo</Text>
            <TouchableOpacity onPress={onClose}><X size={20} color={C.ink3} /></TouchableOpacity>
          </View>
          <TouchableOpacity onPress={pickPhoto} disabled={uploading} style={m.photoPicker} activeOpacity={0.8}>
            {mediaUrl ? (
              <Image source={{ uri: mediaUrl }} style={m.photoPreview} />
            ) : (
              <View style={[m.photoPreview, m.photoPlaceholder]}>
                <Plus size={18} color={C.ink3} />
              </View>
            )}
            <Text style={m.photoPickerTxt}>{uploading ? 'Uploading…' : mediaUrl ? 'Change photo' : 'Choose from library'}</Text>
            {uploading && <ActivityIndicator size="small" color={C.blue} />}
          </TouchableOpacity>
          <TextInput style={[m.input, { marginTop: 12 }]} placeholder="Caption (optional)" placeholderTextColor={C.ink3} value={caption} onChangeText={setCaption} />
          <TouchableOpacity onPress={submit} disabled={saving || uploading || !mediaUrl.trim()} style={[d.saveBtn, { opacity: saving || uploading || !mediaUrl.trim() ? 0.6 : 1 }]}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={d.saveBtnTxt}>Add</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// Add a certification (title + issuer + year)
function AddCertModal({ visible, onClose, existing, onSave }: any) {
  const [title, setTitle] = useState('');
  const [issuer, setIssuer] = useState('');
  const [year, setYear] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const certifications = [
        ...existing.map((c: any) => ({ title: c.title, issuer: c.issuer, year: c.year, media_url: c.media_url })),
        { title: title.trim(), issuer: issuer.trim() || null, year: year ? parseInt(year) : null, media_url: null },
      ];
      await api('/api/therapist/profile/', { method: 'PATCH', body: { certifications } });
      setTitle(''); setIssuer(''); setYear('');
      onSave();
    } catch (e: any) {
      alertMessage('Error', e.message || 'Could not add certification');
    } finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={d.overlay}>
        <View style={d.dialog}>
          <View style={d.dialogHead}>
            <Text style={d.dialogTitle}>Add certification</Text>
            <TouchableOpacity onPress={onClose}><X size={20} color={C.ink3} /></TouchableOpacity>
          </View>
          <TextInput style={m.input} placeholder="Title (e.g. Advanced Colour Theory)" placeholderTextColor={C.ink3} value={title} onChangeText={setTitle} />
          <TextInput style={[m.input, { marginTop: 12 }]} placeholder="Issuer (optional)" placeholderTextColor={C.ink3} value={issuer} onChangeText={setIssuer} />
          <TextInput style={[m.input, { marginTop: 12 }]} placeholder="Year (optional)" placeholderTextColor={C.ink3} keyboardType="number-pad" value={year} onChangeText={setYear} />
          <TouchableOpacity onPress={submit} disabled={saving || !title.trim()} style={[d.saveBtn, { opacity: saving || !title.trim() ? 0.6 : 1 }]}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={d.saveBtnTxt}>Add</Text>}
          </TouchableOpacity>
        </View>
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
  form:      { padding: 24, paddingBottom: 100 },
  label:     { ...T.label, marginBottom: 8, marginTop: 20 },
  input:     { backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.line, borderRadius: 8, padding: 14, ...T.body, color: C.ink },
  photoPicker:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  photoPreview:   { width: 56, height: 56, borderRadius: 10, backgroundColor: C.bgSoft },
  photoPlaceholder:{ alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line, borderStyle: 'dashed' },
  photoPickerTxt: { fontSize: 14, fontWeight: '600', color: C.blue, flex: 1 },
});

const d = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  dialog: { backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  dialogHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  dialogTitle: { ...T.h3 },
  saveBtn: { marginTop: 16, padding: 16, borderRadius: 12, alignItems: 'center', backgroundColor: C.blue },
  saveBtnTxt: { fontSize: 16, fontWeight: '600', color: '#fff' },
});

// Stat Card
function StatCard({ label, value, icon: Icon, color = C.ink, bg = C.bgSoft }: any) {
  return (
    <View style={[s.statCard, { backgroundColor: bg }]}>
      <View style={[s.statIconCircle, { backgroundColor: color + '18' }]}>
        <Icon size={16} color={color} strokeWidth={2} />
      </View>
      <Text style={[s.statCardNum, { color }]}>{value}</Text>
      <Text style={s.statCardLbl}>{label}</Text>
    </View>
  );
}

// Main Profile
export const Profile = ({ onLogout }: { onLogout?: () => void }) => {
  const insets = useSafeAreaInsets();
  const contentBottomPadding = useContentBottomPadding();
  const staffQ = useQuery<any>('/api/staff/profile/');
  const proQ = useQuery<any>('/api/therapist/profile/');
  const consentQ = useQuery<any>('/api/therapist/reputation-consent/');
  const stats = useQuery<any>('/api/staff/stats/');

  const [editing, setEditing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const [showPayroll, setShowPayroll] = useState(false);
  const [showLeaves, setShowLeaves] = useState(false);
  const [addingPhoto, setAddingPhoto] = useState(false);
  const [addingCert, setAddingCert] = useState(false);
  const [savingConsent, setSavingConsent] = useState(false);

  const staffUser = staffQ.data;
  const account = proQ.data;
  const st = stats.data;
  const fullName = `${staffUser?.first_name || ''} ${staffUser?.last_name || ''}`.trim() || account?.name || 'Your Name';
  const tone = avatarTone(fullName);
  const reputation = account?.reputation;
  const portfolio: any[] = account?.portfolio_items || [];
  const certifications: any[] = account?.certifications || [];

  const refetchAll = () => { proQ.refetch(); staffQ.refetch(); };

  const toggleConsent = async (value: boolean) => {
    setSavingConsent(true);
    try {
      await api('/api/therapist/reputation-consent/', { method: 'PATCH', body: { portability_granted: value } });
      consentQ.refetch();
    } catch (e: any) {
      alertMessage('Error', e.message || 'Could not update this setting');
    } finally { setSavingConsent(false); }
  };

  const removePhoto = async (id: string) => {
    try {
      const portfolio_items = portfolio.filter((p) => p.id !== id).map((p) => ({ media_url: p.media_url, caption: p.caption, display_order: p.display_order }));
      await api('/api/therapist/profile/', { method: 'PATCH', body: { portfolio_items } });
      proQ.refetch();
    } catch (e: any) {
      alertMessage('Error', e.message || 'Could not remove photo');
    }
  };

  const removeCert = async (id: string) => {
    try {
      const certifications_payload = certifications.filter((c) => c.id !== id).map((c) => ({ title: c.title, issuer: c.issuer, year: c.year, media_url: c.media_url }));
      await api('/api/therapist/profile/', { method: 'PATCH', body: { certifications: certifications_payload } });
      proQ.refetch();
    } catch (e: any) {
      alertMessage('Error', e.message || 'Could not remove certification');
    }
  };

  const handleLogout = () => {
    alertMessage('Sign out?', "You'll need to log back in.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => {
        await logout();
        onLogout?.();
      }},
    ]);
  };

  if (staffQ.isLoading || proQ.isLoading) return (
    <View style={{ flex: 1, backgroundColor: C.bgCard, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={C.blue} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: contentBottomPadding }}>

        {/* Hero Banner */}
        <View style={[s.heroBanner, { paddingTop: insets.top + 20 }]}>
          <View style={s.avatarWrap}>
            {account?.profile_photo_url ? (
              <Image source={{ uri: account.profile_photo_url }} style={s.avatarImg} />
            ) : (
              <View style={[s.avatar, { backgroundColor: tone.bg }]}>
                <Text style={[s.avatarTxt, { color: tone.fg }]}>
                  {(staffUser?.first_name || account?.name || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            {st?.performance_badge && (
              <View style={s.badgePill}>
                <Text style={s.badgePillTxt}>🏆 {st.performance_badge}</Text>
              </View>
            )}
          </View>

          <Text style={s.heroName}>{fullName}</Text>
          {!!reputation && reputation.total_reviews > 0 && (
            <View style={s.heroLocationRow}>
              <Star size={13} color={C.gold} fill={C.gold} />
              <Text style={s.heroLocationTxt}>{Number(reputation.avg_rating).toFixed(1)} · {reputation.total_reviews} reviews</Text>
            </View>
          )}
          {staffUser?.store_name && (
            <View style={s.heroLocationRow}>
              <MapPin size={13} color={C.ink3} />
              <Text style={s.heroLocationTxt}>{staffUser.store_name}</Text>
            </View>
          )}

          <View style={s.heroBtnRow}>
            <TouchableOpacity onPress={() => setEditing(true)} style={s.heroBtnPrimary} activeOpacity={0.8}>
              <Edit2 size={14} color='#fff' />
              <Text style={s.heroBtnPrimaryTxt}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowSettings(true)} style={s.heroBtnSecondary} activeOpacity={0.8}>
              <Settings2 size={14} color={C.ink} />
              <Text style={s.heroBtnSecondaryTxt}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={s.statsSection}>
          <Text style={s.sectionLabel}>Performance</Text>
          <View style={s.statsGrid}>
            <StatCard label="Rating"     value={reputation ? Number(reputation.avg_rating).toFixed(1) : '—'} icon={Star}        color={C.gold} />
            <StatCard label="Completed"  value={st?.total_completed ?? 0}           icon={CheckCircle} color={C.ok} />
            <StatCard label="Rate"       value={`${st?.completion_rate ?? 0}%`}     icon={Percent}     color={C.blue} />
            <StatCard label="Yrs Exp"    value={account?.years_experience ?? 0}     icon={Briefcase}   color={C.ink2} />
            <StatCard label="Repeats"    value={st?.repeat_customers ?? 0}          icon={Users}       color='#8B5CF6' />
            <StatCard label="Followers"  value={st?.followers ?? 0}                 icon={TrendingUp}  color={C.ok} />
          </View>
          <TouchableOpacity onPress={() => setShowReviews(true)} style={s.viewReviewsBtn}>
            <MessageCircle size={14} color={C.blue} />
            <Text style={s.viewReviewsTxt}>View Customer Reviews</Text>
            <ChevronRight size={14} color={C.blue} />
          </TouchableOpacity>
        </View>

        {/* Bio */}
        {!!account?.bio && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>About</Text>
            <View style={s.card}>
              <Text style={s.bioTxt}>{account.bio}</Text>
            </View>
          </View>
        )}

        {/* Portfolio */}
        <View style={s.section}>
          <View style={s.sectionHeadRow}>
            <Text style={s.sectionLabel}>Portfolio</Text>
            <TouchableOpacity onPress={() => setAddingPhoto(true)} style={s.addBtn}>
              <Plus size={14} color={C.blue} />
              <Text style={s.addBtnTxt}>Add photo</Text>
            </TouchableOpacity>
          </View>
          {portfolio.length === 0 ? (
            <View style={s.card}><Text style={s.emptyTxt}>No photos yet. Show off your best work.</Text></View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {portfolio.map((p) => (
                <TouchableOpacity key={p.id} onLongPress={() => removePhoto(p.id)} style={s.portfolioItem}>
                  <Image source={{ uri: p.media_url }} style={s.portfolioImg} />
                  {!!p.caption && <Text style={s.portfolioCaption} numberOfLines={1}>{p.caption}</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Certifications */}
        <View style={s.section}>
          <View style={s.sectionHeadRow}>
            <Text style={s.sectionLabel}>Certifications</Text>
            <TouchableOpacity onPress={() => setAddingCert(true)} style={s.addBtn}>
              <Plus size={14} color={C.blue} />
              <Text style={s.addBtnTxt}>Add</Text>
            </TouchableOpacity>
          </View>
          {certifications.length === 0 ? (
            <View style={s.card}><Text style={s.emptyTxt}>No certifications added yet.</Text></View>
          ) : (
            <View style={s.listCard}>
              {certifications.map((cert, i) => (
                <View key={cert.id}>
                  <TouchableOpacity onLongPress={() => removeCert(cert.id)} style={s.certRow}>
                    <View style={[s.certIconWrap, { backgroundColor: C.blueLt }]}>
                      <Award size={16} color={C.blue} strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.certTxt}>{cert.title}</Text>
                      {(!!cert.issuer || !!cert.year) && (
                        <Text style={s.certLabel}>{[cert.issuer, cert.year].filter(Boolean).join(' · ')}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                  {i < certifications.length - 1 && <View style={s.cardDiv} />}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Reputation portability */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Reputation</Text>
          <View style={[s.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
            <View style={[s.certIconWrap, { backgroundColor: C.goldLt }]}>
              <ShieldCheck size={16} color={C.gold} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.certTxt}>Let my reputation follow me</Text>
              <Text style={s.certLabel}>Carry your rating & review history if you move to another store</Text>
            </View>
            <Switch
              value={!!consentQ.data?.portability_granted}
              onValueChange={toggleConsent}
              disabled={savingConsent || consentQ.isLoading}
              trackColor={{ false: C.line, true: C.blue }}
            />
          </View>
        </View>

        {/* Account */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Account</Text>
          <View style={s.listCard}>
            <TouchableOpacity onPress={() => setShowSettings(true)} style={s.accountRow} activeOpacity={0.8}>
              <View style={[s.accountIcon, { backgroundColor: C.bgSoft }]}>
                <Settings2 size={18} color={C.ink2} />
              </View>
              <Text style={s.accountLabel}>App Settings</Text>
              <ChevronRight size={20} color={C.ink3} />
            </TouchableOpacity>
            <View style={s.cardDiv} />
            <TouchableOpacity onPress={() => setShowPayroll(true)} style={s.accountRow} activeOpacity={0.8}>
              <View style={[s.accountIcon, { backgroundColor: C.bgSoft }]}>
                <Wallet size={18} color={C.ink2} />
              </View>
              <Text style={s.accountLabel}>Payroll</Text>
              <ChevronRight size={20} color={C.ink3} />
            </TouchableOpacity>
            <View style={s.cardDiv} />
            <TouchableOpacity onPress={() => setShowLeaves(true)} style={s.accountRow} activeOpacity={0.8}>
              <View style={[s.accountIcon, { backgroundColor: C.bgSoft }]}>
                <CalendarOff size={18} color={C.ink2} />
              </View>
              <Text style={s.accountLabel}>Leave Requests</Text>
              <ChevronRight size={20} color={C.ink3} />
            </TouchableOpacity>
            <View style={s.cardDiv} />
            <TouchableOpacity onPress={handleLogout} style={s.logoutBtn} activeOpacity={0.8}>
              <View style={[s.accountIcon, { backgroundColor: '#FEF2F2' }]}>
                <LogOut size={18} color={C.err} />
              </View>
              <Text style={s.logoutTxt}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={s.versionTxt}>Nearbyme Tech CRM · v2.0</Text>
      </ScrollView>

      <EditProfileModal
        staffUser={staffUser}
        account={account}
        visible={editing}
        onClose={() => setEditing(false)}
        onSave={() => { setEditing(false); refetchAll(); }}
      />
      <AddPhotoModal visible={addingPhoto} onClose={() => setAddingPhoto(false)} existing={portfolio} onSave={() => { setAddingPhoto(false); proQ.refetch(); }} />
      <AddCertModal visible={addingCert} onClose={() => setAddingCert(false)} existing={certifications} onSave={() => { setAddingCert(false); proQ.refetch(); }} />

      <Modal visible={showSettings} animationType="slide">
        <Settings onBack={() => setShowSettings(false)} />
      </Modal>

      <ReviewsModal visible={showReviews} onClose={() => setShowReviews(false)} />
      <PayrollModal visible={showPayroll} onClose={() => setShowPayroll(false)} />
      <LeaveRequestsModal visible={showLeaves} onClose={() => setShowLeaves(false)} />
    </View>
  );
};

const s = StyleSheet.create({
  // Hero
  heroBanner:       { backgroundColor: C.bgCard, alignItems: 'center', paddingHorizontal: 24, paddingBottom: 28, borderBottomWidth: 1, borderBottomColor: C.line },

  avatarWrap:       { marginBottom: 14, alignItems: 'center' },
  avatar:           { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.line },
  avatarImg:        { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: C.line },
  avatarTxt:        { fontSize: 40, fontWeight: '800' },

  badgePill:        { marginTop: 10, backgroundColor: '#FEF3C7', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, borderWidth: 1, borderColor: C.gold },
  badgePillTxt:     { fontSize: 12, fontWeight: '700', color: '#92400E' },

  heroName:         { fontSize: 28, fontWeight: '800', color: C.ink, letterSpacing: -0.5, textAlign: 'center' },
  heroLocationRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  heroLocationTxt:  { fontSize: 13, color: C.ink3 },

  heroBtnRow:       { flexDirection: 'row', gap: 10, marginTop: 20 },
  heroBtnPrimary:   { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: C.ink, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 8 },
  heroBtnPrimaryTxt:{ fontSize: 14, fontWeight: '700', color: '#fff' },
  heroBtnSecondary: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: C.bgSoft, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 8, borderWidth: 1, borderColor: C.line },
  heroBtnSecondaryTxt:{ fontSize: 14, fontWeight: '600', color: C.ink },

  // Stats Grid
  statsSection:     { paddingHorizontal: 20, paddingTop: 24 },
  statsGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  statCard:         { width: '30.5%', borderRadius: 10, padding: 14, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: C.line },
  statIconCircle:   { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  statCardNum:      { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  statCardLbl:      { fontSize: 10, fontWeight: '700', color: C.ink3, textTransform: 'uppercase', letterSpacing: 0.3 },

  // Sections
  section:          { paddingHorizontal: 20, paddingTop: 24 },
  sectionHeadRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionLabel:     { fontSize: 11, fontWeight: '800', color: C.ink3, letterSpacing: 0.5, textTransform: 'uppercase' },
  addBtn:           { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addBtnTxt:        { fontSize: 12, fontWeight: '700', color: C.blue },

  card:             { backgroundColor: C.bgCard, borderRadius: 10, padding: 18, borderWidth: 1, borderColor: C.line },
  bioTxt:           { ...T.body, color: C.ink, lineHeight: 24 },
  emptyTxt:         { fontSize: 13, color: C.ink3 },

  portfolioItem:    { width: 120 },
  portfolioImg:      { width: 120, height: 120, borderRadius: 10, backgroundColor: C.bgSoft },
  portfolioCaption:  { fontSize: 11, color: C.ink3, marginTop: 4 },

  listCard:         { backgroundColor: C.bgCard, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: C.line },
  cardDiv:          { height: 1, backgroundColor: C.line, marginHorizontal: 18 },

  certRow:          { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  certIconWrap:     { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  certLabel:        { fontSize: 12, color: C.ink3, marginTop: 2 },
  certTxt:          { fontSize: 14, fontWeight: '600', color: C.ink },

  accountRow:       { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  accountIcon:      { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  accountLabel:     { flex: 1, fontSize: 15, fontWeight: '600', color: C.ink },
  logoutBtn:        { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  logoutTxt:        { fontSize: 15, fontWeight: '600', color: C.err },

  versionTxt:       { ...T.caption, color: C.ink3, textAlign: 'center', marginTop: 40, marginBottom: 20 },

  viewReviewsBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, paddingVertical: 12, backgroundColor: C.bluePale, borderRadius: 8 },
  viewReviewsTxt:   { fontSize: 14, fontWeight: '600', color: C.blue },
});
