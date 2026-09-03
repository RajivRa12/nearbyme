import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, Modal, TextInput, Pressable
} from 'react-native';
import { useQuery } from '../hooks/useFetch';
import { alertMessage } from '../lib/alert';
import { api, formatDate } from '../lib/api';
import { C, T, E } from '../lib/design';
import { Star, X, MessageSquare, CheckCircle } from 'lucide-react-native';

export function ReviewsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const reviewsQuery = useQuery<any>('/api/therapist/reviews/', visible);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);

  const rawReviews: any[] = reviewsQuery.data?.results ?? (Array.isArray(reviewsQuery.data) ? reviewsQuery.data : (reviewsQuery.data?.data ?? []));
  // Normalize to the fields this screen renders — the real ProfessionalReview
  // reports store_rating/professional_rating separately and a nested
  // `response` object instead of the legacy flat rating/reply_text fields.
  const reviews = rawReviews.map((r: any) => ({
    id: r.id,
    customer_name: r.customer_name || 'Anonymous',
    created_at: r.created_at,
    rating: r.professional_rating ?? r.store_rating,
    comment: r.comment,
    reply_text: r.response?.response_text ?? null,
    replied_at: r.response?.created_at ?? null,
  }));

  const submitReply = async () => {
    if (!replyText.trim()) return;
    setLoading(true);
    try {
      await api(`/api/therapist/reviews/${replyingTo.id}/respond/`, {
        method: 'POST',
        body: { response_text: replyText.trim() }
      });
      setReplyText('');
      setReplyingTo(null);
      reviewsQuery.refetch();
    } catch (e: any) {
      alertMessage('Error', e.message || 'Could not send reply');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Text style={s.closeBtnTxt}>Close</Text>
          </TouchableOpacity>
          <Text style={s.title}>Customer Reviews</Text>
          <View style={{ width: 64 }} />
        </View>

        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {reviewsQuery.isLoading ? (
            <ActivityIndicator color={C.blue} style={{ marginTop: 40 }} />
          ) : reviews.length === 0 ? (
            <View style={s.empty}>
              <Star size={48} color={C.line} strokeWidth={1.5} />
              <Text style={s.emptyTitle}>No reviews yet.</Text>
            </View>
          ) : (
            reviews.map((r: any) => (
              <View key={r.id} style={[s.card, E.border]}>
                <View style={s.cardHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.custName}>{r.customer_name}</Text>
                    <Text style={s.dateTxt}>{formatDate(r.created_at)}</Text>
                  </View>
                  <View style={s.ratingBadge}>
                    <Text style={s.ratingTxt}>{r.rating}.0</Text>
                    <Star size={12} color={C.gold} fill={C.gold} />
                  </View>
                </View>

                {!!r.comment && (
                  <Text style={s.commentTxt}>{r.comment}</Text>
                )}

                {r.reply_text ? (
                  <View style={s.replyBox}>
                    <View style={s.replyHead}>
                      <CheckCircle size={14} color={C.ok} />
                      <Text style={s.replyLabel}>Your Reply • {formatDate(r.replied_at)}</Text>
                    </View>
                    <Text style={s.replyContent}>{r.reply_text}</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={s.replyBtn}
                    onPress={() => { setReplyingTo(r); setReplyText(''); }}
                  >
                    <MessageSquare size={14} color={C.blue} />
                    <Text style={s.replyBtnTxt}>Reply to review</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* Reply Modal Overlay */}
      {replyingTo && (
        <Modal visible transparent animationType="fade">
          <Pressable style={s.overlay} onPress={() => setReplyingTo(null)} />
          <View style={s.replyDialog}>
            <Text style={s.replyDialogTitle}>Reply to {replyingTo.customer_name}</Text>
            <TextInput
              style={s.replyInput}
              multiline
              autoFocus
              placeholder="Thank you so much..."
              placeholderTextColor={C.ink3}
              value={replyText}
              onChangeText={setReplyText}
            />
            <View style={s.replyDialogActions}>
              <TouchableOpacity onPress={() => setReplyingTo(null)} style={s.cancelBtn}>
                <Text style={s.cancelBtnTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={submitReply} style={s.submitBtn} disabled={loading || !replyText.trim()}>
                {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.submitBtnTxt}>Send Reply</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: C.line, backgroundColor: C.bgCard },
  title: { ...T.h3 },
  closeBtn: { padding: 8, minWidth: 64 },
  closeBtnTxt: { fontSize: 16, color: C.blue },
  content: { padding: 16, paddingBottom: 100 },
  
  card: { backgroundColor: C.bgCard, borderRadius: 16, padding: 16, marginBottom: 16 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  custName: { ...T.h3, marginBottom: 2 },
  dateTxt: { ...T.caption, color: C.ink3 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.goldLt, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  ratingTxt: { fontSize: 13, fontWeight: '700', color: '#B45309' },
  
  commentTxt: { ...T.body, color: C.ink, marginBottom: 16 },
  
  replyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  replyBtnTxt: { fontSize: 14, fontWeight: '600', color: C.blue },
  
  replyBox: { backgroundColor: C.bgSoft, padding: 12, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: C.ok },
  replyHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  replyLabel: { fontSize: 12, fontWeight: '600', color: C.ink2 },
  replyContent: { fontSize: 14, color: C.ink, lineHeight: 20 },

  empty: { alignItems: 'center', padding: 40 },
  emptyTitle: { ...T.h3, color: C.ink3, marginTop: 16 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  replyDialog: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  replyDialogTitle: { ...T.h3, marginBottom: 16 },
  replyInput: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 16, minHeight: 120, ...T.body, textAlignVertical: 'top', marginBottom: 20 },
  replyDialogActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center', backgroundColor: C.bgSoft },
  cancelBtnTxt: { fontSize: 16, fontWeight: '600', color: C.ink2 },
  submitBtn: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center', backgroundColor: C.blue },
  submitBtnTxt: { fontSize: 16, fontWeight: '600', color: '#fff' }
});
