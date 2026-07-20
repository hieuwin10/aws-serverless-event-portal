import React, { useEffect, useState } from 'react';
import { analyticsApi, certificatesApi, exportCsv, surveyCronApi } from '../services/eventFeatures';

interface AnalyticsData {
  eventId: string;
  eventTitle: string;
  summary: {
    totalSeats: number;
    registeredCount: number;
    checkinCount: number;
    checkinRate: number;
    fillRate: number;
    revenue: number;
  };
  timeline: { date: string; count: number }[];
  referralStats: { source: string; count: number }[];
}

interface Props {
  eventId: string;
}

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4ecdc4', '#45b7d1'];

// Minimal SVG bar chart (no external deps)
const BarChart: React.FC<{ data: { label: string; value: number }[]; color?: string }> = ({ data, color = '#667eea' }) => {
  const max = Math.max(...data.map(d => d.value), 1);
  const W = 520, H = 150, pad = 40;
  const barW = data.length > 0 ? Math.max(12, (W - pad * 2) / data.length - 6) : 20;
  return (
    <svg viewBox={`0 0 ${W} ${H + 40}`} style={{ width: '100%', overflow: 'visible' }}>
      {data.map((d, i) => {
        const x = pad + i * ((W - pad * 2) / data.length) + (((W - pad * 2) / data.length) - barW) / 2;
        const barH = (d.value / max) * H;
        const y = H - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx={4}
              fill={color} opacity={0.85} />
            <text x={x + barW / 2} y={H + 18} fill="rgba(255,255,255,0.6)"
              fontSize={10} textAnchor="middle"
            >{d.label.slice(5)}</text>
            {d.value > 0 && (
              <text x={x + barW / 2} y={y - 6} fill="#fff"
                fontSize={10} textAnchor="middle" fontWeight="bold"
              >{d.value}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
};

// SVG pie chart
const PieChart: React.FC<{ data: { source: string; count: number }[] }> = ({ data }) => {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 20 }}>Chưa có dữ liệu</div>;
  let angle = 0;
  const slices = data.map((d, i) => {
    const pct = d.count / total;
    const start = angle;
    angle += pct * 2 * Math.PI;
    return { ...d, pct, start, end: angle, color: COLORS[i % COLORS.length] };
  });
  const arc = (start: number, end: number) => {
    const r = 80;
    const cx = 100, cy = 100;
    const x1 = cx + r * Math.cos(start - Math.PI / 2);
    const y1 = cy + r * Math.sin(start - Math.PI / 2);
    const x2 = cx + r * Math.cos(end - Math.PI / 2);
    const y2 = cy + r * Math.sin(end - Math.PI / 2);
    const large = end - start > Math.PI ? 1 : 0;
    return `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`;
  };
  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
      <svg viewBox="0 0 200 200" style={{ width: 160, flexShrink: 0 }}>
        {slices.map((s, i) => (
          <path key={i} d={arc(s.start, s.end)} fill={s.color} opacity={0.9} />
        ))}
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: s.color }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {s.source} ({Math.round(s.pct * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const AdminEventTools: React.FC<Props> = ({ eventId }) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [certUrl, setCertUrl] = useState('');
  const [certX, setCertX] = useState(250);
  const [certY, setCertY] = useState(350);
  const [actionMsg, setActionMsg] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const showMsg = (msg: string) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(''), 5000);
  };

  useEffect(() => {
    analyticsApi.getAnalytics(eventId)
      .then(data => { setAnalytics(data); setLoadingAnalytics(false); })
      .catch(() => setLoadingAnalytics(false));
  }, [eventId]);

  const handleSurveyCron = async () => {
    setActionLoading(true);
    const res = await surveyCronApi.trigger(eventId);
    setActionLoading(false);
    if (res.success) {
      showMsg(`✅ Đã gửi email khảo sát tới ${res.data?.processedCount ?? 0} người check-in!`);
    } else {
      showMsg('❌ ' + (res.error || 'Gửi thất bại'));
    }
  };

  const handleSaveCertConfig = async () => {
    if (!certUrl.trim()) { showMsg('❌ Nhập URL template trước!'); return; }
    setActionLoading(true);
    const res = await certificatesApi.saveConfig(eventId, certUrl, certX, certY);
    setActionLoading(false);
    showMsg(res.success ? '✅ Đã lưu cấu hình chứng nhận!' : '❌ Lưu thất bại.');
  };

  const handleGenerateCerts = async () => {
    setActionLoading(true);
    const res = await certificatesApi.generateAll(eventId);
    setActionLoading(false);
    if (res.success) {
      showMsg(`✅ Đã tạo và gửi ${res.data?.processedCount ?? 0} chứng nhận qua email!`);
    } else {
      showMsg('❌ ' + (res.error || 'Tạo thất bại'));
    }
  };

  const handleExportCSV = () => {
    exportCsv(eventId);
    showMsg('📥 Đang tải file CSV...');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {actionMsg && (
        <div className="alert" style={{
          background: actionMsg.startsWith('✅') ? 'rgba(76,175,80,0.2)' : 'rgba(244,67,54,0.2)',
          color: actionMsg.startsWith('✅') ? '#4caf50' : '#f44336',
          border: `1px solid ${actionMsg.startsWith('✅') ? '#4caf50' : '#f44336'}`,
          borderRadius: 8, padding: '12px 16px', fontWeight: 600
        }}>
          {actionMsg}
        </div>
      )}

      {/* Analytics */}
      <div className="card-glass" style={{ padding: '24px 28px' }}>
        <h3 style={{ marginBottom: 20 }}>📊 Dashboard Phân Tích</h3>
        {loadingAnalytics ? (
          <div style={{ color: 'var(--text-secondary)' }}>Đang tải...</div>
        ) : analytics ? (
          <>
            {/* KPI cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14, marginBottom: 28 }}>
              {[
                { label: 'Tổng đăng ký', value: analytics.summary.registeredCount, color: '#667eea' },
                { label: 'Check-in', value: `${analytics.summary.checkinCount} (${analytics.summary.checkinRate}%)`, color: '#4ecdc4' },
                { label: 'Tỷ lệ lấp đầy', value: `${analytics.summary.fillRate}%`, color: '#f093fb' },
                { label: 'Doanh thu', value: `$${analytics.summary.revenue}`, color: '#ffd700' }
              ].map((kpi, i) => (
                <div key={i} style={{
                  padding: '16px', borderRadius: 12, textAlign: 'center',
                  background: kpi.color + '20', border: `1px solid ${kpi.color}50`
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 4 }}>{kpi.label}</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
                </div>
              ))}
            </div>

            {/* Bar chart – registrations per day */}
            <h4 style={{ marginBottom: 12, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>📈 Đăng ký theo ngày</h4>
            {analytics.timeline.length > 0 ? (
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '16px 8px', marginBottom: 24 }}>
                <BarChart
                  data={analytics.timeline.map(t => ({ label: t.date, value: t.count }))}
                  color="#667eea"
                />
              </div>
            ) : (
              <div style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Chưa có dữ liệu.</div>
            )}

            {/* Pie chart – referral sources */}
            <h4 style={{ marginBottom: 12, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>🥧 Nguồn người dùng biết đến</h4>
            <PieChart data={analytics.referralStats} />
          </>
        ) : (
          <div style={{ color: 'var(--text-secondary)' }}>Không thể tải phân tích.</div>
        )}
      </div>

      {/* Export CSV */}
      <div className="card-glass" style={{ padding: '20px 24px' }}>
        <h3 style={{ marginBottom: 8 }}>📤 Xuất Dữ Liệu</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 16 }}>
          Tải file CSV gồm: STT, Mã Vé, Họ Tên, Email, SĐT, Ngày đăng ký, Check-in, Nguồn.
        </p>
        <button onClick={handleExportCSV} className="btn-primary" style={{ justifyContent: 'center' }}>
          📥 Export CSV
        </button>
      </div>

      {/* Survey Cron */}
      <div className="card-glass" style={{ padding: '20px 24px' }}>
        <h3 style={{ marginBottom: 8 }}>📧 Gửi Khảo Sát Sau Sự Kiện</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 16 }}>
          Kích hoạt cron job gửi email khảo sát 1-5 sao tới toàn bộ người check-in.
        </p>
        <button onClick={handleSurveyCron} className="btn-secondary" disabled={actionLoading} style={{ justifyContent: 'center' }}>
          {actionLoading ? 'Đang gửi...' : '🔔 Kích hoạt gửi khảo sát'}
        </button>
      </div>

      {/* Certificate Config */}
      <div className="card-glass" style={{ padding: '20px 24px' }}>
        <h3 style={{ marginBottom: 14 }}>🏅 Cấu Hình & Tạo Chứng Nhận PDF</h3>
        <div className="form-row" style={{ marginBottom: 14 }}>
          <div className="form-group">
            <label>URL ảnh template (PNG/JPG)</label>
            <input
              value={certUrl}
              onChange={e => setCertUrl(e.target.value)}
              placeholder="https://... /template.png"
            />
          </div>
        </div>
        <div className="form-row" style={{ marginBottom: 16 }}>
          <div className="form-group">
            <label>Tọa độ X (vị trí tên)</label>
            <input type="number" value={certX} onChange={e => setCertX(Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label>Tọa độ Y (vị trí tên)</label>
            <input type="number" value={certY} onChange={e => setCertY(Number(e.target.value))} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={handleSaveCertConfig} disabled={actionLoading} className="btn-secondary" style={{ justifyContent: 'center' }}>
            💾 Lưu cấu hình
          </button>
          <button onClick={handleGenerateCerts} disabled={actionLoading} className="btn-primary" style={{ justifyContent: 'center' }}>
            🎓 Gửi chứng nhận toàn bộ
          </button>
        </div>
      </div>
    </div>
  );
};
