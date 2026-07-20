import React, { useEffect, useRef, useState } from 'react';
import { qaApi } from '../services/eventFeatures';

interface Reply {
  replyId: string;
  adminName: string;
  content: string;
  createdAt: string;
}

interface Question {
  questionId: string;
  userName: string;
  content: string;
  upvoteCount: number;
  status: 'pending' | 'answering' | 'answered';
  replies: Reply[];
  createdAt: string;
}

interface Props {
  eventId: string;
  isAdmin: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  pending: '⏳ Chờ trả lời',
  answering: '🎤 Đang trả lời',
  answered: '✅ Đã trả lời'
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#f0a500',
  answering: '#00c4cc',
  answered: '#4caf50'
};

export const QnAPage: React.FC<Props> = ({ eventId, isAdmin }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [content, setContent] = useState('');
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadQuestions = async () => {
    const data = await qaApi.getQuestions(eventId);
    setQuestions(data);
    setLoading(false);
  };

  useEffect(() => {
    loadQuestions();
    // Poll every 10 seconds for real-time feel
    pollRef.current = setInterval(loadQuestions, 10000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [eventId]);

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    const res = await qaApi.submitQuestion(eventId, userName.trim() || 'Ẩn danh', content.trim());
    setSubmitting(false);
    if (res.success) {
      setContent('');
      await loadQuestions();
      showToast('✅ Câu hỏi đã được gửi!');
    } else {
      showToast('❌ ' + (res.error || 'Gửi thất bại'));
    }
  };

  const handleUpvote = async (questionId: string) => {
    await qaApi.upvote(eventId, questionId);
    setQuestions(prev =>
      prev.map(q => q.questionId === questionId ? { ...q, upvoteCount: q.upvoteCount + 1 } : q)
    );
  };

  const handleSetStatus = async (questionId: string, status: string) => {
    const res = await qaApi.setStatus(eventId, questionId, status);
    if (res.success) {
      setQuestions(prev =>
        prev.map(q => q.questionId === questionId ? { ...q, status: status as any } : q)
      );
    }
  };

  const handleAddReply = async (questionId: string) => {
    const text = replyTexts[questionId]?.trim();
    if (!text) return;
    const res = await qaApi.addReply(eventId, questionId, text);
    if (res.success) {
      setReplyTexts(prev => ({ ...prev, [questionId]: '' }));
      await loadQuestions();
      showToast('✅ Phản hồi đã được gửi!');
    } else {
      showToast('❌ ' + (res.error || 'Gửi thất bại'));
    }
  };

  const visible = isAdmin ? questions : questions.filter(q => q.status !== 'answered');

  return (
    <div style={{ padding: '20px 0', position: 'relative' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          background: '#1e3a5f', color: '#fff', padding: '12px 20px',
          borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          fontWeight: 600, fontSize: '0.95rem'
        }}>{toast}</div>
      )}

      <h2 style={{ marginBottom: 6, fontSize: '1.6rem' }}>💬 Hỏi & Đáp</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
        Đặt câu hỏi cho diễn giả và upvote những câu hay nhất.
      </p>

      {/* Ask form */}
      <form onSubmit={handleSubmitQuestion} className="card-glass" style={{ padding: '20px 24px', marginBottom: 24 }}>
        <div className="form-group" style={{ marginBottom: 12 }}>
          <label>Tên của bạn (bỏ trống để ẩn danh)</label>
          <input
            value={userName}
            onChange={e => setUserName(e.target.value)}
            placeholder="Nguyễn Văn A"
            maxLength={80}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 12 }}>
          <label>Câu hỏi của bạn <span style={{ color: '#ff6b6b' }}>*</span></label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Nhập câu hỏi dưới 250 ký tự..."
            maxLength={250}
            rows={3}
            required
          />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{content.length}/250</span>
        </div>
        <button type="submit" className="btn-primary" disabled={submitting} style={{ justifyContent: 'center' }}>
          {submitting ? 'Đang gửi...' : '📨 Gửi câu hỏi'}
        </button>
      </form>

      {/* Questions list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>Đang tải câu hỏi...</div>
      ) : visible.length === 0 ? (
        <div className="card-glass" style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
          Chưa có câu hỏi nào. Hãy là người đầu tiên!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {visible.map(q => (
            <div key={q.questionId} className="card-glass" style={{
              padding: '18px 24px',
              borderLeft: `4px solid ${STATUS_COLORS[q.status]}`,
              animation: q.status === 'answering' ? 'pulse 1.5s infinite' : 'none'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, color: 'var(--primary-color)' }}>
                      {q.userName || 'Ẩn danh'}
                    </span>
                    <span style={{
                      fontSize: '0.75rem', padding: '2px 8px', borderRadius: 20,
                      background: STATUS_COLORS[q.status] + '30', color: STATUS_COLORS[q.status],
                      fontWeight: 600
                    }}>
                      {STATUS_LABELS[q.status]}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '1rem', lineHeight: 1.6 }}>{q.content}</p>
                </div>
                {/* Upvote */}
                <button
                  onClick={() => handleUpvote(q.questionId)}
                  style={{
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    border: 'none', borderRadius: 10, cursor: 'pointer',
                    padding: '8px 14px', color: '#fff', fontWeight: 700,
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    minWidth: 56, transition: 'transform 0.15s'
                  }}
                  title="Upvote câu hỏi này"
                >
                  <span style={{ fontSize: '1.1rem' }}>👍</span>
                  <span style={{ fontSize: '0.85rem' }}>{q.upvoteCount}</span>
                </button>
              </div>

              {/* Replies */}
              {q.replies && q.replies.length > 0 && (
                <div style={{ marginTop: 14, paddingLeft: 16, borderLeft: '2px solid rgba(255,255,255,0.15)' }}>
                  {q.replies.map(r => (
                    <div key={r.replyId} style={{ marginBottom: 10 }}>
                      <span style={{ fontWeight: 600, color: '#00c4cc', fontSize: '0.85rem' }}>
                        🏛️ {r.adminName}:&nbsp;
                      </span>
                      <span style={{ color: 'var(--text-secondary)' }}>{r.content}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Admin controls */}
              {isAdmin && (
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['pending', 'answering', 'answered'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => handleSetStatus(q.questionId, s)}
                        style={{
                          padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                          fontWeight: 600, fontSize: '0.8rem',
                          background: q.status === s ? STATUS_COLORS[s] : 'rgba(255,255,255,0.08)',
                          color: q.status === s ? '#fff' : 'var(--text-secondary)',
                          transition: 'all 0.2s'
                        }}
                      >
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      style={{ flex: 1 }}
                      value={replyTexts[q.questionId] || ''}
                      onChange={e => setReplyTexts(prev => ({ ...prev, [q.questionId]: e.target.value }))}
                      placeholder="Nhập câu trả lời của Ban tổ chức..."
                      maxLength={500}
                    />
                    <button
                      onClick={() => handleAddReply(q.questionId)}
                      className="btn-primary"
                      style={{ padding: '0 16px' }}
                    >
                      Gửi
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
