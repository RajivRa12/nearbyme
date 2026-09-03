import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  TextInput, StyleSheet, Image, Pressable, Modal, Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useContentBottomPadding } from '../hooks/useContentBottomPadding';
import { useQuery } from '../hooks/useFetch';
import { api, formatDate, formatINR } from '../lib/api';
import { C, T, E, avatarTone } from '../lib/design';
import {
  Search, ArrowLeft, AlertTriangle, Plus, Check,
  Sparkles, X, ChevronRight, MessageSquare, Phone, Star,
  Activity, Heart, Droplets
} from 'lucide-react-native';

// Avatar 
function Av({ name, size = 42 }: { name: string; size?: number }) {
  const t = avatarTone(name || '?');
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.38, fontWeight: '700', color: t.fg }}>
        {(name || '?').charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

// Section header 
function SectionTitle({ label }: { label: string }) {
  return <Text style={p.sectionTitle}>{label}</Text>;
}

// Skin/Hair badge
function InfoBadge({ label, value, icon: Icon, color }: any) {
  if (!value) return null;
  return (
    <View style={[p.infoBadge, { backgroundColor: color + '20', borderColor: color + '40', borderWidth: 1 }]}>
      <Icon size={14} color={color} />
      <View>
        <Text style={[p.infoBadgeLbl, { color }]}>{label}</Text>
        <Text style={[p.infoBadgeVal, { color }]}>{value}</Text>
      </View>
    </View>
  );
}

// Client full-screen profile 
function ClientProfile({ client, onBack }: { client: any; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const contentBottomPadding = useContentBottomPadding();
  const profile = client.crm_profile || client.customer_profile;
  const name = `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Unknown Client';

  const gallery = useQuery<any>(`/api/staff/gallery/?customer=${client.id}`, !!client.id);
  const notes   = useQuery<any>(`/api/staff/customer-notes/?customer=${client.id}`, !!client.id);

  const [note, setNote]     = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'gallery' | 'notes'>('overview');

  const galleryItems: any[] = gallery.data?.results ?? (Array.isArray(gallery.data) ? gallery.data : []);
  const noteItems: any[]    = notes.data?.results   ?? (Array.isArray(notes.data)   ? notes.data   : []);

  const SKIN_LABELS: Record<string, string> = { DRY: 'Dry', OILY: 'Oily', COMBINATION: 'Combination', NORMAL: 'Normal', SENSITIVE: 'Sensitive' };
  const HAIR_LABELS: Record<string, string> = { WAVY: 'Wavy', STRAIGHT: 'Straight', CURLY: 'Curly', COILY: 'Coily' };
  const TIMING_LABELS: Record<string, string> = { MORNING: '☀️ Morning', AFTERNOON: '🌤 Afternoon', EVENING: '🌙 Evening' };

  const addNote = async () => {
    if (!note.trim()) return;
    setSaving(true);
    try {
      await api('/api/staff/customer-notes/', { method: 'POST', body: { customer: client.id, note_text: note.trim() } });
      setNote(''); setSaved(true); notes.refetch();
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  const TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'history',  label: 'History' },
    { key: 'gallery',  label: 'Gallery' },
    { key: 'notes',    label: 'Notes' },
  ];

  const aiRecs = useQuery<any>(`/api/staff/customer-crm/${client.id}/ai_recommendations/`);
  
  const aiText = aiRecs.isLoading 
    ? "Generating personalized recommendations..." 
    : (aiRecs.data?.rationale || 'Run a skin consultation first to personalise the AI recommendation for this client.');

  return (
    <View style={[p.screen, { paddingTop: insets.top }]}>
      {/* Fixed header */}
      <View style={p.header}>
        <TouchableOpacity onPress={onBack} style={p.backBtn} activeOpacity={1}>
          <ArrowLeft size={24} color={C.ink} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={p.headerTitle} numberOfLines={1}>{name}</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Profile card */}
      <View style={p.profileCard}>
        <Av name={name} size={72} />
        <View style={{ flex: 1 }}>
          <Text style={p.profileName}>{name}</Text>
          {client.phone && <Text style={p.profilePhone}>{client.phone}</Text>}
          {profile?.birthday && <Text style={p.profileSub}>🎂 {formatDate(profile.birthday)}</Text>}
          {profile?.preferred_timing && (
            <Text style={p.profileSub}>{TIMING_LABELS[profile.preferred_timing] || profile.preferred_timing}</Text>
          )}
        </View>
      </View>

      {/* Stats bar */}
      <View style={p.statsBar}>
        <View style={p.statItem}><Text style={p.statNum}>{client.total_visits ?? 0}</Text><Text style={p.statLbl}>VISITS</Text></View>
        <View style={p.statDivider} />
        <View style={p.statItem}><Text style={p.statNum}>{formatINR(client.total_spend ?? 0)}</Text><Text style={p.statLbl}>SPENT</Text></View>
        <View style={p.statDivider} />
        <View style={p.statItem}><Text style={p.statNum}>{formatINR(client.average_spend ?? 0)}</Text><Text style={p.statLbl}>AVG</Text></View>
      </View>

      {/* Tabs */}
      <View style={p.tabs}>
        {TABS.map(t => (
          <TouchableOpacity key={t.key} onPress={() => setActiveTab(t.key as any)} style={[p.tab, activeTab === t.key && p.tabActive]} activeOpacity={1}>
            <Text style={[p.tabTxt, activeTab === t.key && p.tabTxtActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: contentBottomPadding }}>

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <View style={p.tabContent}>

            {/* Skin & Hair badges */}
            {(profile?.skin_type || profile?.hair_type) && (
              <View>
                <SectionTitle label="Consultation" />
                <View style={p.badgeRow}>
                  <InfoBadge label="Skin" value={SKIN_LABELS[profile?.skin_type] || profile?.skin_type} icon={Droplets} color={C.blue} />
                  <InfoBadge label="Hair" value={HAIR_LABELS[profile?.hair_type] || profile?.hair_type} icon={Activity} color={C.ok} />
                </View>
              </View>
            )}

            {/* Allergies — high visibility */}
            {!!profile?.allergies && profile.allergies !== 'None' && (
              <View style={p.alertBox}>
                <AlertTriangle size={20} color={C.err} strokeWidth={2} />
                <View style={{ flex: 1 }}>
                  <Text style={p.alertTitle}>⚠️ Allergies</Text>
                  <Text style={p.alertBody}>{profile.allergies}</Text>
                </View>
              </View>
            )}

            {/* Medical notes */}
            {!!profile?.medical_notes && profile.medical_notes !== 'None.' && (
              <View style={[p.alertBox, { backgroundColor: C.warnLt, borderColor: C.warn }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[p.alertTitle, { color: C.warn }]}>Medical Notes</Text>
                  <Text style={[p.alertBody, { color: '#78350F' }]}>{profile.medical_notes}</Text>
                </View>
              </View>
            )}

            {/* AI Recommendation */}
            <SectionTitle label="AI Recommendation" />
            <View style={p.aiCard}>
              <View style={p.aiHeader}>
                <Sparkles size={16} color={C.blue} />
                <Text style={p.aiHeaderTxt}>Smart Suggestion</Text>
              </View>
              <Text style={p.aiText}>{aiText}</Text>
              {!aiRecs.isLoading && aiRecs.data?.treatments && (
                <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {aiRecs.data.treatments.map((t: string) => (
                    <View key={t} style={{ backgroundColor: C.blueLt, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                      <Text style={{ color: C.blue, fontSize: 12, fontWeight: '700' }}>{t}</Text>
                    </View>
                  ))}
                  {aiRecs.data.products?.map((p: string) => (
                    <View key={p} style={{ backgroundColor: C.okLt, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                      <Text style={{ color: C.ok, fontSize: 12, fontWeight: '700' }}>{p}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Preferences */}
            {profile?.preferred_timing && (
              <View>
                <SectionTitle label="Preferences" />
                <View style={[p.detailsCard, E.border]}>
                  <View style={p.detailRow}>
                    <Text style={p.detailKey}>Preferred Time</Text>
                    <Text style={p.detailVal}>{TIMING_LABELS[profile.preferred_timing] || profile.preferred_timing}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── HISTORY ── */}
        {activeTab === 'history' && (
          <View style={p.tabContent}>
            <SectionTitle label="Visit History" />
            <View style={[p.detailsCard, E.border]}>
              <View style={p.detailRow}><Text style={p.detailKey}>Total Visits</Text><Text style={p.detailVal}>{client.total_visits ?? 0}</Text></View>
              <View style={p.detailDivider} />
              <View style={p.detailRow}><Text style={p.detailKey}>Total Spent</Text><Text style={p.detailVal}>{formatINR(client.total_spend ?? 0)}</Text></View>
              <View style={p.detailDivider} />
              <View style={p.detailRow}><Text style={p.detailKey}>Avg Per Visit</Text><Text style={p.detailVal}>{formatINR(client.average_spend ?? 0)}</Text></View>
              {client.loyalty_points !== undefined && (
                <>
                  <View style={p.detailDivider} />
                  <View style={p.detailRow}><Text style={p.detailKey}>Loyalty Points</Text><Text style={p.detailVal}>⭐ {client.loyalty_points}</Text></View>
                </>
              )}
            </View>

            {client.total_visits === 0 && (
              <View style={p.emptyState}>
                <Text style={p.emptyTxt}>No visit history yet.</Text>
              </View>
            )}
          </View>
        )}

        {/* ── GALLERY ── */}
        {activeTab === 'gallery' && (
          <View style={p.tabContent}>
            <SectionTitle label="Before / After Gallery" />
            {gallery.isLoading ? <ActivityIndicator color={C.blue} style={{ marginTop: 24 }} /> :
             galleryItems.length === 0 ? (
               <View style={p.emptyState}>
                 <Text style={p.emptyTxt}>No photos yet.</Text>
               </View>
             ) : (
               galleryItems.map((g: any) => (
                 <View key={g.id} style={[p.galleryRow, E.border]}>
                   {g.before_photo_url && (
                     <View style={{ flex: 1 }}>
                       <Image source={{ uri: g.before_photo_url }} style={p.galleryImg} />
                       <Text style={p.galleryLbl}>BEFORE</Text>
                     </View>
                   )}
                   {g.after_photo_url && (
                     <View style={{ flex: 1 }}>
                       <Image source={{ uri: g.after_photo_url }} style={p.galleryImg} />
                       <Text style={p.galleryLbl}>AFTER</Text>
                     </View>
                   )}
                   {g.notes && <Text style={p.galleryNote}>{g.notes}</Text>}
                 </View>
               ))
             )
            }
          </View>
        )}

        {/* ── NOTES ── */}
        {activeTab === 'notes' && (
          <View style={p.tabContent}>
            {/* Add note input */}
            <View style={p.noteInputRow}>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Add a note about this client..."
                placeholderTextColor={C.ink3}
                multiline
                style={p.noteInput}
              />
              <TouchableOpacity
                onPress={addNote}
                disabled={saving || !note.trim()}
                activeOpacity={1}
                style={[p.noteAddBtn, { backgroundColor: note.trim() ? C.ink : C.bgSoft }]}
              >
                {saving ? <ActivityIndicator size="small" color="#fff" />
                  : saved ? <Check size={20} color="#fff" />
                  : <Plus size={20} color={note.trim() ? '#fff' : C.ink3} />}
              </TouchableOpacity>
            </View>

            {notes.isLoading ? <ActivityIndicator color={C.blue} style={{ marginTop: 24 }} /> :
             noteItems.length === 0 ? (
               <View style={p.emptyState}>
                 <Text style={p.emptyTxt}>No notes yet. Add your first one above.</Text>
               </View>
             ) : (
               <View style={{ gap: 10, marginTop: 16 }}>
                 {noteItems.map((n: any) => (
                   <View key={n.id} style={[p.noteCard, E.border]}>
                     <Text style={p.noteTxt}>{n.note_text}</Text>
                     <Text style={p.noteMeta}>{formatDate(n.created_at)}</Text>
                   </View>
                 ))}
               </View>
             )
            }
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// Client list row 
function ClientRow({ client, onPress }: { client: any; onPress: () => void }) {
  const name = `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Unknown Client';
  return (
    <TouchableOpacity onPress={onPress} style={l.row} activeOpacity={1}>
      <Av name={name} size={48} />
      <View style={{ flex: 1 }}>
        <Text style={l.rowName}>{name}</Text>
        <Text style={l.rowSub}>
          {client.phone || 'No phone'}
          {(client.total_visits ?? 0) > 0 ? `  ·  ${client.total_visits} visits · ${formatINR(client.total_spend ?? 0)}` : ''}
        </Text>
      </View>
      <ChevronRight size={20} color={C.ink3} />
    </TouchableOpacity>
  );
}

// Main 
export const Clients = () => {
  const insets = useSafeAreaInsets();
  const contentBottomPadding = useContentBottomPadding();
  const { data, isLoading } = useQuery<any>('/api/staff/crm/');
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState<any>(null);

  const all: any[] = data?.results ?? (Array.isArray(data) ? data : []);
  const filtered = search
    ? all.filter(c => {
        const name = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase();
        return name.includes(search.toLowerCase()) || c.phone?.includes(search);
      })
    : all;

  if (selected) return <ClientProfile client={selected} onBack={() => setSelected(null)} />;

  return (
    <View style={[l.screen, { paddingTop: insets.top }]}>
      <View style={l.header}>
        <Text style={l.title}>Clients</Text>
        <Text style={l.sub}>{all.length} client{all.length !== 1 ? 's' : ''}</Text>
      </View>

      {/* Search */}
      <View style={l.searchWrap}>
        <Search size={20} color={C.ink3} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or phone..."
          placeholderTextColor={C.ink3}
          style={l.searchInput}
        />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch('')} activeOpacity={1}>
            <X size={18} color={C.ink3} />
          </TouchableOpacity>
        )}
      </View>

      <View style={{ height: 8, backgroundColor: C.bg, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.line }} />

      <ScrollView contentContainerStyle={{ paddingBottom: contentBottomPadding }} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ActivityIndicator color={C.blue} style={{ marginTop: 60 }} />
        ) : filtered.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 80, gap: 12 }}>
            <Text style={T.h2}>No clients found</Text>
            <Text style={{ ...T.body, color: C.ink3 }}>Try a different name or number</Text>
          </View>
        ) : (
          Array.from(new Set(filtered.map((c: any) => {
            const n = `${c.first_name || ''} ${c.last_name || ''}`.trim();
            return (n || '?').charAt(0).toUpperCase();
          }))).sort().map((letter: any) => (
            <View key={letter}>
              <View style={l.sectionHeader}>
                <Text style={l.sectionLetter}>{letter}</Text>
              </View>
              {filtered
                .filter((c: any) => {
                  const n = `${c.first_name || ''} ${c.last_name || ''}`.trim();
                  return (n || '?').charAt(0).toUpperCase() === letter;
                })
                .map((c: any) => (
                  <View key={c.id}>
                    <ClientRow client={c} onPress={() => setSelected(c)} />
                    <View style={l.rowDivider} />
                  </View>
                ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

// Profile styles 
const p = StyleSheet.create({
  screen:     { flex: 1, backgroundColor: C.bgCard },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.line },
  backBtn:    { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle:{ ...T.h3, flex: 1, textAlign: 'center' },

  profileCard:{ flexDirection: 'row', alignItems: 'center', gap: 16, padding: 24, borderBottomWidth: 1, borderBottomColor: C.line },
  profileName:{ fontSize: 22, fontWeight: '800', color: C.ink, letterSpacing: -0.5 },
  profilePhone:{ ...T.body, color: C.ink2, marginTop: 4 },
  profileSub: { fontSize: 13, color: C.ink3, marginTop: 2 },

  statsBar:   { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.line },
  statItem:   { flex: 1, paddingVertical: 14, alignItems: 'center' },
  statNum:    { fontSize: 16, fontWeight: '800', color: C.ink, letterSpacing: -0.3 },
  statLbl:    { fontSize: 9, fontWeight: '700', letterSpacing: 0.5, color: C.ink3, marginTop: 3, textTransform: 'uppercase' },
  statDivider:{ width: 1, backgroundColor: C.line },

  tabs:       { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.line },
  tab:        { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive:  { borderBottomColor: C.ink },
  tabTxt:     { fontSize: 13, fontWeight: '600', color: C.ink3 },
  tabTxtActive:{ fontSize: 13, fontWeight: '700', color: C.ink },

  tabContent: { padding: 24, gap: 16 },
  sectionTitle:{ fontSize: 13, fontWeight: '700', color: C.ink3, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10, marginTop: 8 },

  badgeRow:   { flexDirection: 'row', gap: 12 },
  infoBadge:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 8, flex: 1 },
  infoBadgeLbl:{ fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  infoBadgeVal:{ fontSize: 16, fontWeight: '800', marginTop: 2 },

  alertBox:   { flexDirection: 'row', gap: 12, backgroundColor: C.errLt, borderRadius: 8, padding: 16, borderWidth: 1, borderColor: C.err + '40', alignItems: 'flex-start' },
  alertTitle: { fontSize: 13, fontWeight: '800', color: C.err, marginBottom: 4 },
  alertBody:  { fontSize: 14, color: C.ink, lineHeight: 20 },

  aiCard:     { backgroundColor: C.blueLt, borderRadius: 8, padding: 16, borderWidth: 1, borderColor: C.blue + '30' },
  aiHeader:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  aiHeaderTxt:{ fontSize: 11, fontWeight: '800', color: C.blue, letterSpacing: 0.5, textTransform: 'uppercase' },
  aiText:     { ...T.body, color: C.ink, lineHeight: 22 },

  detailsCard:{ backgroundColor: C.bgCard, borderRadius: 8 },
  detailRow:  { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  detailDivider:{ height: 1, backgroundColor: C.line, marginHorizontal: 16 },
  detailKey:  { ...T.body, color: C.ink2 },
  detailVal:  { ...T.bodySB },

  galleryRow: { backgroundColor: C.bgCard, borderRadius: 8, padding: 16, flexDirection: 'row', gap: 12, marginBottom: 12 },
  galleryImg: { width: '100%', aspectRatio: 1, borderRadius: 8, backgroundColor: C.bgSoft },
  galleryLbl: { fontSize: 10, fontWeight: '700', color: C.ink3, textAlign: 'center', marginTop: 6, textTransform: 'uppercase' },
  galleryNote:{ width: '100%', ...T.caption, color: C.ink2, marginTop: 8 },

  noteInputRow:{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  noteInput:   { flex: 1, backgroundColor: C.bgCard, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 14, ...T.body, color: C.ink, minHeight: 56, borderWidth: 1, borderColor: C.line },
  noteAddBtn:  { width: 56, height: 56, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  noteCard:    { backgroundColor: C.bgCard, borderRadius: 8, padding: 16 },
  noteTxt:     { ...T.body, color: C.ink, lineHeight: 22 },
  noteMeta:    { fontSize: 12, color: C.ink3, marginTop: 8 },

  emptyState:  { alignItems: 'center', paddingTop: 48 },
  emptyTxt:    { ...T.body, color: C.ink3 },
});

// List styles 
const l = StyleSheet.create({
  screen:     { flex: 1, backgroundColor: C.bgCard },
  header:     { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  title:      { ...T.h1 },
  sub:        { ...T.caption, color: C.ink3 },

  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 24, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.line },
  searchInput:{ flex: 1, ...T.body, color: C.ink, padding: 0 },

  sectionHeader:{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8 },
  sectionLetter:{ fontSize: 14, fontWeight: '800', color: C.ink },
  row:        { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 24, paddingVertical: 16 },
  rowName:    { fontSize: 16, fontWeight: '700', color: C.ink, letterSpacing: -0.3 },
  rowSub:     { fontSize: 13, color: C.ink3, marginTop: 2 },
  rowDivider: { height: 1, backgroundColor: C.line, marginLeft: 88, marginRight: 24 },
});
