import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as db from '../lib/database';
import { useAuth } from '../App';

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState({
    clients: [], sessions: [], todaySessions: [],
    inProgressSessions: [], flaggedClients: [], activeCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.getDashboardData().then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">ダッシュボード</h1>
        <p className="page-subtitle">今日の確認事項と要対応ケース</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-label">今日のセッション</div><div className="stat-value">{data.todaySessions.length}</div><div className="stat-change">件</div></div>
        <div className="stat-card"><div className="stat-label">進行中セッション</div><div className="stat-value">{data.inProgressSessions.length}</div><div className="stat-change">件</div></div>
        <div className="stat-card"><div className="stat-label">要注意フラグ</div><div className="stat-value" style={{ color: data.flaggedClients.length > 0 ? 'var(--color-warning)' : undefined }}>{data.flaggedClients.length}</div><div className="stat-change">件</div></div>
        <div className="stat-card"><div className="stat-label">アクティブクライアント</div><div className="stat-value">{data.activeCount}</div><div className="stat-change">名</div></div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><h2 className="card-title">今日のセッション</h2><Link to="/clients" className="btn btn-ghost btn-sm">全て見る →</Link></div>
          {data.todaySessions.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {data.todaySessions.map(client => (
                <Link key={client.id} to={`/clients/${client.id}`} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px var(--space-md)', background: 'var(--color-bg-primary)',
                  borderRadius: 'var(--radius-md)', textDecoration: 'none', color: 'inherit',
                  border: '1px solid var(--color-border-light)', transition: 'border-color var(--transition-fast)',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{client.name}</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>主訴: {client.latest_chief_complaint}</div>
                  </div>
                  <span className="badge badge-accent">第{(client.session_count || 0) + 1}回</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state"><p>今日予定のセッションはありません</p></div>
          )}
        </div>

        <div className="card">
          <div className="card-header"><h2 className="card-title">要注意・要対応ケース</h2></div>
          {data.flaggedClients.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {data.flaggedClients.map(client => {
                const flags = typeof client.flags === 'string' ? JSON.parse(client.flags) : (client.flags || []);
                return (
                  <Link key={client.id} to={`/clients/${client.id}`} style={{
                    display: 'block', padding: '12px var(--space-md)', background: 'var(--color-bg-primary)',
                    borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-warning)',
                    textDecoration: 'none', color: 'inherit',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{client.name}</span>
                      {flags.map((f, i) => <span key={i} className={`badge ${f.type === 'referral' ? 'badge-danger' : 'badge-warning'}`}>{f.label}</span>)}
                    </div>
                    {flags.map((f, i) => <div key={i} style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 4 }}>{f.note}</div>)}
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="empty-state"><p>要注意ケースはありません</p></div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 'var(--space-lg)' }}>
        <div className="card-header"><h2 className="card-title">直近のセッション</h2></div>
        <div className="table-container">
          <table>
            <thead><tr><th>クライアント</th><th>日付</th><th>回数</th><th>ステータス</th><th></th></tr></thead>
            <tbody>
              {data.sessions.slice(0, 10).map(session => {
                const client = data.clients.find(c => c.id === session.client_id);
                return (
                  <tr key={session.id}>
                    <td style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{client?.name || '—'}</td>
                    <td>{session.date}</td>
                    <td>第{session.session_number}回</td>
                    <td><span className={`badge ${session.status === 'completed' ? 'badge-success' : session.status === 'in_progress' ? 'badge-warning' : 'badge-info'}`}>{session.status === 'completed' ? '完了' : session.status === 'in_progress' ? '進行中' : '下書き'}</span></td>
                    <td><Link to={`/clients/${client?.id}`} className="btn btn-ghost btn-sm">詳細 →</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-2xl)', color: 'var(--color-text-tertiary)' }}>読み込み中...</div>;
}
