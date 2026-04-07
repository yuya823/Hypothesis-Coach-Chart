import { useState, useEffect } from 'react';
import * as db from '../lib/database';

const ACTION_LABELS = {
  session_create: { label: 'セッション開始', color: 'var(--color-info)' },
  session_complete: { label: 'セッション完了', color: 'var(--color-success)' },
  observation_save: { label: '観察・評価保存', color: 'var(--color-accent)' },
  hypothesis_update: { label: '仮説ステータス変更', color: 'var(--color-warning)' },
  hypothesis_edit: { label: '仮説テキスト編集', color: 'var(--color-text-tertiary)' },
  intervention_save: { label: '介入記録', color: 'var(--color-success)' },
  intake_save: { label: '問診保存', color: 'var(--color-info)' },
  client_create: { label: 'クライアント登録', color: 'var(--color-accent)' },
  ai_generate: { label: 'AI生成', color: 'var(--color-accent)' },
  flag_set: { label: 'フラグ設定', color: 'var(--color-danger)' },
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    Promise.all([db.getAuditLogs(), db.getAllProfiles()])
      .then(([l, p]) => { setLogs(l); setProfiles(p); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  let filtered = logs;
  if (filterAction !== 'all') filtered = filtered.filter(l => l.action === filterAction);
  if (filterUser !== 'all') filtered = filtered.filter(l => l.user_id === filterUser);
  if (searchText) filtered = filtered.filter(l =>
    (l.target_label || '').includes(searchText) || (l.details || '').includes(searchText) || (l.user_name || '').includes(searchText)
  );

  const aiLogs = logs.filter(l => l.action === 'ai_generate');
  const editLogs = logs.filter(l => l.action === 'hypothesis_edit');

  if (loading) return <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>読み込み中...</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">監査ログ</h1>
        <p className="page-subtitle">セッション操作履歴とAI生成ログ</p>
      </div>

      <div className="stats-grid" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="stat-card"><div className="stat-label">総ログ数</div><div className="stat-value">{logs.length}</div></div>
        <div className="stat-card"><div className="stat-label">AI生成回数</div><div className="stat-value" style={{ color: 'var(--color-accent)' }}>{aiLogs.length}</div></div>
        <div className="stat-card"><div className="stat-label">手修正回数</div><div className="stat-value">{editLogs.length}</div></div>
        <div className="stat-card"><div className="stat-label">トレーナー数</div><div className="stat-value">{profiles.length}</div></div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
          <span className="icon" style={{ fontSize: 13, opacity: 0.5 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="6" cy="6" r="4.5" /><path d="M10 10l3 3" /></svg>
          </span>
          <input type="text" className="form-input" placeholder="ログを検索..." value={searchText} onChange={e => setSearchText(e.target.value)} style={{ paddingLeft: 38 }} />
        </div>
        <select className="form-select" style={{ width: 'auto', minWidth: 160 }} value={filterAction} onChange={e => setFilterAction(e.target.value)}>
          <option value="all">全アクション</option>
          {Object.entries(ACTION_LABELS).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
        </select>
        <select className="form-select" style={{ width: 'auto', minWidth: 140 }} value={filterUser} onChange={e => setFilterUser(e.target.value)}>
          <option value="all">全ユーザー</option>
          {profiles.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table>
            <thead><tr><th style={{ width: 160 }}>日時</th><th style={{ width: 120 }}>トレーナー</th><th style={{ width: 160 }}>アクション</th><th>対象</th><th>詳細</th></tr></thead>
            <tbody>
              {filtered.length > 0 ? filtered.map(log => {
                const actionInfo = ACTION_LABELS[log.action] || { label: log.action, color: 'var(--color-text-tertiary)' };
                return (
                  <tr key={log.id}>
                    <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontFamily: 'monospace' }}>
                      {new Date(log.created_at).toLocaleString('ja-JP')}
                    </td>
                    <td><span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>{log.user_name || '—'}</span></td>
                    <td>
                      <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 'var(--radius-sm)', background: `color-mix(in srgb, ${actionInfo.color} 8%, transparent)`, color: actionInfo.color, fontSize: 'var(--font-size-xs)', fontWeight: 500 }}>
                        {actionInfo.label}
                      </span>
                    </td>
                    <td style={{ fontSize: 'var(--font-size-sm)' }}>{log.target_label || '—'}</td>
                    <td style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{log.details || '—'}</td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--color-text-tertiary)' }}>ログがまだありません</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
