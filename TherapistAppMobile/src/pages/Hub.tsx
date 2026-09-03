import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Modal, Pressable, StyleSheet, FlatList, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useContentBottomPadding } from '../hooks/useContentBottomPadding';
import { useQuery } from '../hooks/useFetch';
import { api, formatDate, formatINR } from '../lib/api';
import { C, T, E, avatarTone } from '../lib/design';
import {
  X, Play, Lock, ChevronRight, Trophy, Star,
  BookOpen, Megaphone, Send, MessageCircle, ChevronLeft, GraduationCap
} from 'lucide-react-native';

// Avatar 
function Av({ name, size = 36 }: { name: string; size?: number }) {
  const t = avatarTone(name || '?');
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.4, fontWeight: '700', color: t.fg }}>
        {(name || '?').charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

// Tab navigation
const HUB_TABS = [
  { key: 'announcements', label: '📢 Feed',        icon: Megaphone },
  { key: 'learn',         label: '📚 Learn',       icon: BookOpen  },
  { key: 'leaderboard',   label: '🏆 Rankings',    icon: Trophy    },
  { key: 'clients',       label: '💬 Chats',       icon: MessageCircle },
];

// Announcement detail sheet 
function AnnSheet({ item, onClose }: { item: any; onClose: () => void }) {
  return (
    <Modal visible transparent animationType="slide">
      <Pressable style={sh.overlay} onPress={onClose} />
      <View style={sh.sheet}>
        <View style={sh.pill} />
        <View style={sh.head}>
          <View style={{ flex: 1 }}>
            <Text style={sh.meta}>{formatDate(item?.created_at)}</Text>
            <Text style={sh.title}>{item?.title}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}><X size={24} color={C.ink3} /></TouchableOpacity>
        </View>
        <ScrollView><Text style={sh.body}>{item?.content}</Text></ScrollView>
      </View>
    </Modal>
  );
}

// Video sheet 
function VideoSheet({ item, onClose }: { item: any; onClose: () => void }) {
  return (
    <Modal visible transparent animationType="slide">
      <Pressable style={sh.overlay} onPress={onClose} />
      <View style={sh.sheet}>
        <View style={sh.pill} />
        <View style={sh.head}>
          <View style={{ flex: 1 }}>
            {item?.is_premium && (
              <View style={[sh.badge, { backgroundColor: C.goldLt }]}>
                <Lock size={10} color={C.gold} />
                <Text style={[sh.badgeTxt, { color: C.gold }]}>PREMIUM</Text>
              </View>
            )}
            <Text style={sh.title}>{item?.title}</Text>
            {item?.description && <Text style={sh.body}>{item.description}</Text>}
          </View>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}><X size={24} color={C.ink3} /></TouchableOpacity>
        </View>
        <View style={sh.videoPlaceholder}>
          <Play size={40} color="#fff" fill="#fff" />
          <Text style={sh.videoLbl}>Tap to play</Text>
        </View>
      </View>
    </Modal>
  );
}

// Announcements tab 
function AnnouncementsTab() {
  const { data, isLoading } = useQuery<any>('/api/staff/announcements/');
  const [selected, setSelected] = useState<any>(null);
  const items: any[] = data?.results ?? (Array.isArray(data) ? data : []);

  if (isLoading) return <ActivityIndicator color={C.blue} style={{ marginTop: 40 }} />;
  return (
    <View style={{ paddingBottom: 24 }}>
      {items.length === 0 ? (
        <View style={t.empty}><Text style={t.emptyTxt}>No announcements yet.</Text></View>
      ) : items.map((item: any) => (
        <TouchableOpacity key={item.id} onPress={() => setSelected(item)} style={t.annCard} activeOpacity={1}>
          <View style={t.annPriority} />
          <View style={{ flex: 1 }}>
            <View style={t.annTop}>
              <Text style={t.annMeta}>{formatDate(item.created_at)}</Text>
              {item.is_urgent && <View style={t.urgentBadge}><Text style={t.urgentTxt}>URGENT</Text></View>}
            </View>
            <Text style={t.annTitle}>{item.title}</Text>
            <Text style={t.annBody} numberOfLines={2}>{item.content}</Text>
          </View>
          <ChevronRight size={18} color={C.ink3} />
        </TouchableOpacity>
      ))}
      {selected && <AnnSheet item={selected} onClose={() => setSelected(null)} />}
    </View>
  );
}

// Course detail sheet
function CourseSheet({ item, onClose }: { item: any; onClose: () => void }) {
  return (
    <Modal visible transparent animationType="slide">
      <Pressable style={sh.overlay} onPress={onClose} />
      <View style={sh.sheet}>
        <View style={sh.pill} />
        <View style={sh.head}>
          <View style={{ flex: 1 }}>
            {item?.category && (
              <View style={sh.badge}>
                <Text style={sh.badgeTxt}>{item.category}</Text>
              </View>
            )}
            <Text style={sh.title}>{item?.title}</Text>
            {item?.instructor_name && <Text style={t.videoMeta}>By {item.instructor_name}</Text>}
            {item?.description && <Text style={sh.body}>{item.description}</Text>}
          </View>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}><X size={24} color={C.ink3} /></TouchableOpacity>
        </View>
        <View style={t.coursePriceRow}>
          <View>
            <Text style={t.coursePriceLbl}>Price</Text>
            <Text style={t.coursePriceTxt}>{formatINR(item?.price ?? 0)}</Text>
          </View>
          <View>
            <Text style={t.coursePriceLbl}>Duration</Text>
            <Text style={t.coursePriceTxt}>{item?.duration_hours} hrs</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

//  Learn tab
function LearnTab() {
  const [sub, setSub] = useState<'videos' | 'courses'>('videos');
  const videosQ = useQuery<any>('/api/staff/training/');
  const coursesQ = useQuery<any>('/api/staff/courses/', sub === 'courses');
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const videos: any[] = videosQ.data?.results ?? (Array.isArray(videosQ.data) ? videosQ.data : []);
  const courses: any[] = coursesQ.data?.results ?? (Array.isArray(coursesQ.data) ? coursesQ.data : []);

  return (
    <View style={{ paddingBottom: 24 }}>
      <View style={t.subTabRow}>
        <TouchableOpacity onPress={() => setSub('videos')} style={[t.subTabBtn, sub === 'videos' && t.subTabBtnActive]}>
          <Text style={[t.subTabTxt, sub === 'videos' && t.subTabTxtActive]}>Videos</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setSub('courses')} style={[t.subTabBtn, sub === 'courses' && t.subTabBtnActive]}>
          <Text style={[t.subTabTxt, sub === 'courses' && t.subTabTxtActive]}>Courses</Text>
        </TouchableOpacity>
      </View>

      {sub === 'videos' ? (
        videosQ.isLoading ? <ActivityIndicator color={C.blue} style={{ marginTop: 40 }} /> : (
          <>
            <View style={t.learnHeader}>
              <Text style={t.learnHeaderTxt}>Training Videos</Text>
              <Text style={t.learnHeaderSub}>{videos.length} available</Text>
            </View>
            {videos.length === 0 ? (
              <View style={t.empty}><Text style={t.emptyTxt}>No training videos yet.</Text></View>
            ) : videos.map((item: any) => (
              <TouchableOpacity key={item.id} onPress={() => setSelectedVideo(item)} style={t.videoCard} activeOpacity={1}>
                <View style={[t.videoThumb, item.is_premium && { borderColor: C.gold, borderWidth: 1.5 }]}>
                  <Play size={20} color={item.is_premium ? C.gold : C.blue} fill={item.is_premium ? C.gold : C.blue} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={t.videoBadgeRow}>
                    {item.is_premium && <View style={[t.badge, { backgroundColor: C.goldLt }]}><Text style={[t.badgeTxt, { color: C.gold }]}>PREMIUM</Text></View>}
                    {item.category && <View style={t.badge}><Text style={t.badgeTxt}>{item.category}</Text></View>}
                  </View>
                  <Text style={t.videoTitle}>{item.title}</Text>
                  {item.duration_minutes && <Text style={t.videoMeta}>{item.duration_minutes} min</Text>}
                </View>
              </TouchableOpacity>
            ))}
            {selectedVideo && <VideoSheet item={selectedVideo} onClose={() => setSelectedVideo(null)} />}
          </>
        )
      ) : (
        coursesQ.isLoading ? <ActivityIndicator color={C.blue} style={{ marginTop: 40 }} /> : (
          <>
            <View style={t.learnHeader}>
              <Text style={t.learnHeaderTxt}>Courses</Text>
              <Text style={t.learnHeaderSub}>{courses.length} available</Text>
            </View>
            {courses.length === 0 ? (
              <View style={t.empty}><Text style={t.emptyTxt}>No courses available yet.</Text></View>
            ) : courses.map((item: any) => (
              <TouchableOpacity key={item.id} onPress={() => setSelectedCourse(item)} style={t.videoCard} activeOpacity={1}>
                <View style={t.videoThumb}>
                  <GraduationCap size={20} color={C.blue} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={t.videoBadgeRow}>
                    {item.category && <View style={t.badge}><Text style={t.badgeTxt}>{item.category}</Text></View>}
                  </View>
                  <Text style={t.videoTitle}>{item.title}</Text>
                  <Text style={t.videoMeta}>
                    {item.instructor_name ? `${item.instructor_name} · ` : ''}{item.duration_hours}h · {formatINR(item.price)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            {selectedCourse && <CourseSheet item={selectedCourse} onClose={() => setSelectedCourse(null)} />}
          </>
        )
      )}
    </View>
  );
}

// Rank medals 
const MEDALS: Record<number, { emoji: string; color: string }> = {
  1: { emoji: '🥇', color: '#F59E0B' },
  2: { emoji: '🥈', color: '#9CA3AF' },
  3: { emoji: '🥉', color: '#B45309' },
};

function LeaderboardRow({ item, isMe }: { item: any; isMe: boolean }) {
  const medal = MEDALS[item.rank];
  return (
    <View style={[t.lbRow, isMe && { backgroundColor: C.blueLt }]}>
      <View style={t.lbRank}>
        {medal ? (
          <Text style={{ fontSize: 22 }}>{medal.emoji}</Text>
        ) : (
          <Text style={[t.lbRankNum, isMe && { color: C.blue }]}>#{item.rank}</Text>
        )}
      </View>
      <Av name={item.name} size={40} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[t.lbName, isMe && { color: C.blue }]}>{item.name}</Text>
          {isMe && <Text style={t.lbYou}>YOU</Text>}
        </View>
        <Text style={t.lbSub}>{item.completed} completed · {item.repeat_customers} repeats</Text>
      </View>
      <Text style={[t.lbTotal, isMe && { color: C.blue }]}>{formatINR(item.total)}</Text>
    </View>
  );
}

// Leaderboard tab 
function LeaderboardTab() {
  const { data, isLoading } = useQuery<any>('/api/staff/leaderboard/');
  const board: any[] = data?.board ?? [];

  if (isLoading) return <ActivityIndicator color={C.blue} style={{ marginTop: 40 }} />;
  return (
    <View style={{ paddingBottom: 24 }}>
      <View style={t.lbHeader}>
        <Trophy size={18} color={C.gold} />
        <Text style={t.lbHeaderTxt}>Monthly Rankings — {data?.month || ''}</Text>
      </View>
      {board.length === 0 ? (
        <View style={t.empty}><Text style={t.emptyTxt}>No rankings yet this month.</Text></View>
      ) : (
        <View style={[t.lbCard, E.border]}>
          {board.map((item: any, i: number) => (
            <View key={item.id}>
              <LeaderboardRow item={item} isMe={item.is_me} />
              {i < board.length - 1 && <View style={{ height: 1, backgroundColor: C.line, marginHorizontal: 16 }} />}
            </View>
          ))}
        </View>
      )}

      {/* Category breakdowns */}
      <Text style={t.catTitle}>CATEGORY LEADERS</Text>
      {board.length > 0 && (
        <View style={{ gap: 10 }}>
          {[
            { label: '💰 Highest Earnings', key: 'total', format: (v: any) => formatINR(v) },
            { label: '🎯 Most Completed',   key: 'completed', format: (v: any) => `${v} services` },
            { label: '💝 Most Tips',        key: 'tips', format: (v: any) => formatINR(v) },
            { label: '🔄 Most Repeats',     key: 'repeat_customers', format: (v: any) => `${v} repeat clients` },
          ].map(cat => {
            const winner = [...board].sort((a, b) => Number(b[cat.key]) - Number(a[cat.key]))[0];
            if (!winner) return null;
            return (
              <View key={cat.key} style={[t.catCard, E.border]}>
                <Text style={t.catLabel}>{cat.label}</Text>
                <View style={t.catRow}>
                  <Av name={winner.name} size={32} />
                  <Text style={t.catName}>{winner.name}</Text>
                  <Text style={t.catVal}>{cat.format(winner[cat.key])}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

// Client conversation detail sheet
function ClientChatSheet({ conversation, onClose }: { conversation: any; onClose: () => void }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchMessages = async () => {
    try {
      const res: any = await api(`/api/staff/conversations/${conversation.id}/messages/`);
      setMessages(res?.data ?? []);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 4000);
    return () => clearInterval(interval);
  }, [conversation.id]);

  const send = async () => {
    if (!text.trim()) return;
    const txt = text.trim();
    setText('');
    try {
      await api(`/api/staff/conversations/${conversation.id}/messages/`, { method: 'POST', body: { content: txt } });
      fetchMessages();
    } catch (e) {}
  };

  return (
    <Modal visible transparent animationType="slide">
      <Pressable style={sh.overlay} onPress={onClose} />
      <View style={[sh.sheet, { height: '85%', display: 'flex' }]}>
        <View style={sh.pill} />
        <View style={[sh.head, { alignItems: 'center' }]}>
          <Av name={conversation.customer_name} size={40} />
          <Text style={[sh.title, { flex: 1, marginLeft: 12, fontSize: 18 }]}>{conversation.customer_name}</Text>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}><X size={22} color={C.ink3} /></TouchableOpacity>
        </View>
        {loading ? (
          <ActivityIndicator color={C.blue} style={{ marginTop: 40 }} />
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 8, gap: 10 }} showsVerticalScrollIndicator={false}>
            {messages.length === 0 && <Text style={{ textAlign: 'center', color: C.ink3, marginTop: 24 }}>No messages yet.</Text>}
            {messages.map((m: any) => (
              <View key={m.id} style={[t.msgRow, m.is_mine && { flexDirection: 'row-reverse' }]}>
                <View style={[t.bubble, m.is_mine ? t.bubbleMe : t.bubbleOther]}>
                  <Text style={[t.msgText, m.is_mine && { color: '#fff' }]}>{m.content}</Text>
                  <Text style={[t.msgTime, m.is_mine && { color: 'rgba(255,255,255,0.6)' }]}>
                    {new Date(m.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
        <View style={[t.chatInput, { position: 'relative', marginTop: 8 }]}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Type a reply..."
            placeholderTextColor={C.ink3}
            style={t.chatField}
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <TouchableOpacity onPress={send} disabled={!text.trim()} style={[t.sendBtn, { backgroundColor: text.trim() ? C.blue : C.bgSoft }]} activeOpacity={1}>
            <Send size={18} color={text.trim() ? '#fff' : C.ink3} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// Client conversations tab
function ClientsTab() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);

  const fetchConvos = async () => {
    try {
      const res: any = await api('/api/staff/conversations/');
      setConversations(res?.results ?? (Array.isArray(res) ? res : []));
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    fetchConvos();
    const interval = setInterval(fetchConvos, 8000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <ActivityIndicator color={C.blue} style={{ marginTop: 40 }} />;

  return (
    <View style={{ paddingBottom: 24 }}>
      {conversations.length === 0 ? (
        <View style={t.empty}><Text style={t.emptyTxt}>No client messages yet. Customers can message you from the app's Home screen.</Text></View>
      ) : (
        conversations.map((c: any) => (
          <TouchableOpacity key={c.id} onPress={() => setSelected(c)} style={t.annCard} activeOpacity={1}>
            <Av name={c.customer_name} size={44} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={t.annTitle}>{c.customer_name}</Text>
                {!!c.unread_count && (
                  <View style={{ backgroundColor: C.accent, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }}>
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{c.unread_count}</Text>
                  </View>
                )}
              </View>
              <Text style={t.annBody} numberOfLines={1}>{c.last_message?.content || 'No messages yet'}</Text>
            </View>
          </TouchableOpacity>
        ))
      )}
      {selected && <ClientChatSheet conversation={selected} onClose={() => setSelected(null)} />}
    </View>
  );
}

// Main
export const Hub = () => {
  const insets = useSafeAreaInsets();
  const contentBottomPadding = useContentBottomPadding();
  const [activeTab, setActiveTab] = useState('announcements');

  return (
    <View style={[h.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={h.header}>
        <Text style={h.title}>Hub</Text>
        <Text style={h.sub}>Announcements, learning & client chats</Text>
      </View>

      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={h.tabBar} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {HUB_TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[h.tab, activeTab === tab.key && h.tabActive]}
            activeOpacity={1}
          >
            <Text style={[h.tabTxt, activeTab === tab.key && h.tabTxtActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={{ height: 1, backgroundColor: C.line }} />

      {/* Content */}
      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingHorizontal: 16, paddingBottom: contentBottomPadding }} showsVerticalScrollIndicator={false}>
        {activeTab === 'announcements' && <AnnouncementsTab />}
        {activeTab === 'learn'         && <LearnTab />}
        {activeTab === 'leaderboard'   && <LeaderboardTab />}
        {activeTab === 'clients'       && <ClientsTab />}
      </ScrollView>
    </View>
  );
};

// Sheet styles 
const sh = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet:    { backgroundColor: C.bgCard, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24, paddingBottom: 48, maxHeight: '85%' },
  pill:     { width: 36, height: 5, backgroundColor: C.line, borderRadius: 2.5, alignSelf: 'center', marginBottom: 20 },
  head:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  meta:     { fontSize: 12, color: C.ink3, marginBottom: 6 },
  title:    { fontSize: 22, fontWeight: '800', color: C.ink, letterSpacing: -0.5, lineHeight: 28 },
  body:     { ...T.body, color: C.ink, lineHeight: 26, marginTop: 4 },
  badge:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, backgroundColor: C.bgSoft, marginBottom: 8, alignSelf: 'flex-start' },
  badgeTxt: { fontSize: 10, fontWeight: '700' },
  videoPlaceholder: { height: 200, backgroundColor: C.ink, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 },
  videoLbl: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
});

// Tab content styles 
const t = StyleSheet.create({
  empty:    { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyTxt: { ...T.body, color: C.ink3, textAlign: 'center' },

  // Announcements
  annCard:   { backgroundColor: C.bgCard, borderRadius: 8, marginBottom: 12, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, borderWidth: 1, borderColor: C.line },
  annPriority:{ width: 3, height: '100%', backgroundColor: C.blue, borderRadius: 1.5, alignSelf: 'center' },
  annTop:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  annMeta:   { fontSize: 12, color: C.ink3 },
  annTitle:  { fontSize: 16, fontWeight: '700', color: C.ink, marginBottom: 6 },
  annBody:   { fontSize: 14, color: C.ink2, lineHeight: 20 },
  urgentBadge:{ backgroundColor: C.errLt, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  urgentTxt: { fontSize: 10, fontWeight: '800', color: C.err },

  // Learn
  subTabRow: { flexDirection: 'row', gap: 8, marginBottom: 16, backgroundColor: C.bgSoft, borderRadius: 8, padding: 4 },
  subTabBtn: { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  subTabBtnActive: { backgroundColor: C.bgCard, ...E.sm },
  subTabTxt: { fontSize: 13, fontWeight: '600', color: C.ink3 },
  subTabTxtActive: { color: C.ink },
  learnHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
  learnHeaderTxt:{ ...T.h3 },
  learnHeaderSub:{ ...T.caption, color: C.ink3 },
  videoCard: { backgroundColor: C.bgCard, borderRadius: 8, marginBottom: 12, padding: 20, flexDirection: 'row', gap: 16, alignItems: 'center', borderWidth: 1, borderColor: C.line },
  videoThumb:{ width: 52, height: 52, borderRadius: 8, backgroundColor: C.bgSoft, alignItems: 'center', justifyContent: 'center' },
  videoBadgeRow:{ flexDirection: 'row', gap: 6, marginBottom: 6 },
  videoTitle:{ fontSize: 15, fontWeight: '700', color: C.ink, letterSpacing: -0.2 },
  videoMeta: { fontSize: 12, color: C.ink3, marginTop: 3 },
  badge:     { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: C.bgSoft },
  badgeTxt:  { fontSize: 10, fontWeight: '700', color: C.ink2 },
  coursePriceRow: { flexDirection: 'row', gap: 32, marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: C.line },
  coursePriceLbl: { fontSize: 11, fontWeight: '700', color: C.ink3, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  coursePriceTxt: { fontSize: 18, fontWeight: '800', color: C.ink },

  // Leaderboard
  lbHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  lbHeaderTxt:{ ...T.h3 },
  lbCard:    { backgroundColor: C.bgCard, borderRadius: 8, overflow: 'hidden', marginBottom: 24 },
  lbRow:     { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  lbRank:    { width: 36, alignItems: 'center' },
  lbRankNum: { fontSize: 16, fontWeight: '800', color: C.ink3 },
  lbName:    { fontSize: 15, fontWeight: '700', color: C.ink },
  lbYou:     { fontSize: 10, fontWeight: '800', color: '#fff', backgroundColor: C.blue, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  lbSub:     { fontSize: 12, color: C.ink3, marginTop: 2 },
  lbTotal:   { fontSize: 15, fontWeight: '800', color: C.ink, letterSpacing: -0.3 },
  catTitle:  { fontSize: 11, fontWeight: '800', color: C.ink3, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },
  catCard:   { backgroundColor: C.bgCard, borderRadius: 8, padding: 16, marginBottom: 10 },
  catLabel:  { fontSize: 13, fontWeight: '700', color: C.ink, marginBottom: 10 },
  catRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  catName:   { flex: 1, fontSize: 15, fontWeight: '700', color: C.ink },
  catVal:    { fontSize: 13, fontWeight: '700', color: C.ink2 },

  // Chat
  msgRow:    { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  bubble:    { maxWidth: '75%', borderRadius: 12, padding: 12 },
  bubbleMe:  { backgroundColor: C.ink, borderBottomRightRadius: 4 },
  bubbleOther:{ backgroundColor: C.bgCard, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: C.line },
  msgText:   { fontSize: 15, color: C.ink, lineHeight: 22 },
  msgTime:   { fontSize: 11, color: C.ink3, marginTop: 4, textAlign: 'right' },
  chatInput: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.bgCard, borderTopWidth: 1, borderTopColor: C.line, position: 'absolute', bottom: 0, left: 0, right: 0 },
  chatField: { flex: 1, backgroundColor: C.bgSoft, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, ...T.body, color: C.ink },
  sendBtn:   { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});

// Screen styles 
const h = StyleSheet.create({
  screen:    { flex: 1, backgroundColor: C.bg },
  header:    { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, backgroundColor: C.bgCard, borderBottomWidth: 1, borderBottomColor: C.line },
  title:     { ...T.h1 },
  sub:       { ...T.caption, color: C.ink3, marginTop: 2 },
  tabBar:    { flexGrow: 0, backgroundColor: C.bgCard, paddingVertical: 12 },
  tab:       { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, marginRight: 8, backgroundColor: C.bgSoft },
  tabActive: { backgroundColor: C.ink },
  tabTxt:    { fontSize: 13, fontWeight: '600', color: C.ink2 },
  tabTxtActive:{ color: '#fff', fontWeight: '700' },
});
