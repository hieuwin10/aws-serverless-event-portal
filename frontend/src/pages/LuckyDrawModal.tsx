import React, { useEffect, useRef, useState } from 'react';
import { luckyDrawApi } from '../services/eventFeatures';

interface Candidate {
  userId: string;
  fullName: string;
  phone: string;
  checkedInAt: string;
  hasWon: boolean;
}

interface Winner {
  userId: string;
  fullName: string;
  phone: string;
  drawnAt: string;
}

interface Props {
  eventId: string;
  onClose: () => void;
}

const maskPhone = (phone: string) => {
  if (!phone || phone.length < 6) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(-3);
};

// Simple confetti
const Confetti: React.FC = () => {
  const colors = ['#ff6b6b', '#ffd700', '#4ecdc4', '#45b7d1', '#a29bfe', '#fd79a8'];
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 10000, overflow: 'hidden' }}>
      {Array.from({ length: 60 }).map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: `${Math.random() * 10 + 5}px`,
          height: `${Math.random() * 10 + 5}px`,
          background: colors[Math.floor(Math.random() * colors.length)],
          borderRadius: Math.random() > 0.5 ? '50%' : '0',
          left: `${Math.random() * 100}%`,
          top: '-20px',
          animation: `fall ${Math.random() * 3 + 2}s linear ${Math.random() * 2}s forwards`,
          transform: `rotate(${Math.random() * 360}deg)`
        }} />
      ))}
    </div>
  );
};

export const LuckyDrawModal: React.FC<Props> = ({ eventId, onClose }) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [currentWinner, setCurrentWinner] = useState<Winner | null>(null);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [message, setMessage] = useState('');
  const displayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const eligible = candidates.filter(c => allowMultiple || !c.hasWon);

  const load = async () => {
    setLoading(true);
    const data = await luckyDrawApi.getCandidates(eventId);
    setCandidates(data.candidates || []);
    setWinners(data.winners || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [eventId]);

  const startSpin = () => {
    if (eligible.length === 0) {
      setMessage('Không có ứng viên nào!');
      return;
    }
    setSpinning(true);
    setCurrentWinner(null);
    setMessage('');
    // Rolling display effect
    displayRef.current = setInterval(() => {
      const idx = Math.floor(Math.random() * eligible.length);
      setDisplayName(eligible[idx].fullName);
    }, 80);
  };

  const stopSpin = async () => {
    if (displayRef.current) clearInterval(displayRef.current);
    setSpinning(false);
    const res = await luckyDrawApi.draw(eventId, allowMultiple);
    if (res.success) {
      const winner = res.data;
      setCurrentWinner(winner);
      setDisplayName(winner.fullName);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);
      await load();
    } else {
      setMessage(res.error || 'Quay thưởng thất bại!');
      setDisplayName('');
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset toàn bộ lịch sử trúng thưởng?')) return;
    await luckyDrawApi.reset(eventId);
    setCurrentWinner(null);
    setDisplayName('');
    setMessage('');
    await load();
  };

  return (
    <>
      {showConfetti && <Confetti />}
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20
      }}>
        <div className="card-glass" style={{
          width: '100%', maxWidth: 580, padding: 36, borderRadius: 20,
          position: 'relative', maxHeight: '90vh', overflowY: 'auto'
        }}>
          <button onClick={onClose} style={{
            position: 'absolute', top: 14, right: 14, background: 'transparent',
            border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer'
          }}>✕</button>

          <h2 style={{ textAlign: 'center', marginBottom: 6, fontSize: '1.8rem' }}>🎰 Vòng Quay May Mắn</h2>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 28 }}>
            {eligible.length} ứng viên hợp lệ
          </p>

          {/* Spinner display */}
          <div style={{
            textAlign: 'center', padding: '32px 20px', marginBottom: 24,
            background: 'linear-gradient(135deg, rgba(102,126,234,0.2), rgba(118,75,162,0.2))',
            borderRadius: 16, border: '2px solid rgba(102,126,234,0.4)',
            minHeight: 100, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center'
          }}>
            {displayName ? (
              <>
                <div style={{
                  fontSize: spinning ? '1.5rem' : '2.2rem',
                  fontWeight: 800,
                  color: spinning ? 'rgba(255,255,255,0.7)' : '#ffd700',
                  animation: spinning ? 'pulse 0.5s infinite' : 'none',
                  transition: 'all 0.3s',
                  textShadow: spinning ? 'none' : '0 0 20px #ffd70080'
                }}>
                  {currentWinner && !spinning ? '🏆 ' : ''}{displayName}
                  {currentWinner && !spinning ? ' 🏆' : ''}
                </div>
                {currentWinner && !spinning && (
                  <div style={{ marginTop: 8, color: '#4ecdc4', fontWeight: 600 }}>
                    📱 {maskPhone(currentWinner.phone)}
                  </div>
                )}
              </>
            ) : (
              <span style={{ color: 'var(--text-secondary)' }}>Nhấn "Bắt đầu Quay" để khởi động...</span>
            )}
          </div>

          {message && (
            <div className="alert alert-error" style={{ marginBottom: 16 }}>{message}</div>
          )}

          {/* Controls */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            {!spinning ? (
              <button
                onClick={startSpin}
                className="btn-primary"
                style={{ flex: 1, justifyContent: 'center', padding: '14px' }}
                disabled={loading || eligible.length === 0}
              >
                🎲 Bắt đầu Quay
              </button>
            ) : (
              <button
                onClick={stopSpin}
                style={{
                  flex: 1, padding: '14px', borderRadius: 10, fontWeight: 700,
                  background: 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
                  border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1rem'
                }}
              >
                ⛔ Dừng lại!
              </button>
            )}
            <button
              onClick={handleReset}
              className="btn-secondary"
              style={{ padding: '0 18px' }}
              disabled={spinning}
            >
              🔄 Reset
            </button>
          </div>

          {/* Allow multiple wins option */}
          <label style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={allowMultiple}
              onChange={e => setAllowMultiple(e.target.checked)}
            />
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Cho phép trúng nhiều lần
            </span>
          </label>

          {/* Past winners */}
          {winners.length > 0 && (
            <div>
              <h3 style={{ marginBottom: 12, fontSize: '1rem', color: 'var(--text-secondary)' }}>
                🏅 Người đã trúng thưởng ({winners.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
                {winners.map((w, i) => (
                  <div key={w.userId} className="card-glass" style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between' }}>
                    <span><strong style={{ color: '#ffd700' }}>#{i + 1}</strong> {w.fullName}</span>
                    <span style={{ color: '#4ecdc4' }}>{maskPhone(w.phone)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
