import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as db from '../lib/database';
import { useAuth } from '../App';

export default function ClientListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', age: '', gender: '女性' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    Promise.all([db.getClients(), db.getAllProfiles()])
      .then(([c, p]) => { setClients(c); setProfiles(p); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleCreateClient = async () => {
    if (!newClient.name.trim()) return;
    setCreating(true);
    try {
      const created = await db.createClient({
        trainer_id: user.id,
        name: newClient.name,
        age: newClient.age ? parseInt(newClient.age) : null,
        gender: newClient.gender,
        status: 'active',
        flags: [],
        session_count: 0,
      });
      await db.createAuditLog({ user_id: user.id, user_name: user.name, action: 'client_create', target: created.id, target_label: created.name, details: 'クライアントを新規登録' });
      setClients(prev => [created, ...prev]);
      setShowCreateModal(false);
      setNewClient({ name: '', age: '', gender: '女性' });
      navigate(`/clients/${created.id}`);
    } catch (err) {
      alert('作成に失敗しました: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  let filtered = clients.filter(c => {
    if (search && !c.name.includes(search) && !(c.latest_chief_complaint || '').includes(search)) return false;
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    return true;
  });
  filtered.sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'recent') return (b.last_session_date || '').localeCompare(a.last_session_date || '');
    if (sortBy === 'next') return (a.next_session_date || 'z').localeCompare(b.next_session_date || 'z');
    return 0;
  });

  if (loading) return <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>読み込み中...</div>;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div><h1 className="page-title">クライアント一覧</h1><p className="page-subtitle">{clients.length}名のクライアント</p></div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>＋ 新規クライアント</button>
      </div>

      {/* 新規作成モーダル */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
          onClick={() => setShowCreateModal(false)}>
          <div className="card" style={{ width: 420, maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
            <h3 className="card-title" style={{ marginBottom: 'var(--space-lg)' }}>新規クライアント登録</h3>
            <div className="form-group">
              <label className="form-label">名前 *</label>
              <input className="form-input" value={newClient.name} onChange={e => setNewClient(p => ({ ...p, name: e.target.value }))} placeholder="例: 山田 花子" autoFocus />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="form-label">年齢</label>
                <input className="form-input" type="number" value={newClient.age} onChange={e => setNewClient(p => ({ ...p, age: e.target.value }))} placeholder="32" />
              </div>
              <div className="form-group">
                <label className="form-label">性別</label>
                <select className="form-select" value={newClient.gender} onChange={e => setNewClient(p => ({ ...p, gender: e.target.value }))}>
                  <option>女性</option><option>男性</option><option>その他</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>キャンセル</button>
              <button className="btn btn-primary" onClick={handleCreateClient} disabled={creating || !newClient.name.trim()}>
                {creating ? '作成中...' : '登録する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* フィルタ */}
      <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
          <span className="icon" style={{ fontSize: 13, opacity: 0.5 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="6" cy="6" r="4.5" /><path d="M10 10l3 3" /></svg>
          </span>
          <input type="text" className="form-input" placeholder="名前・主訴で検索..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 38 }} />
        </div>
        <select className="form-select" style={{ width: 'auto', minWidth: 140 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">全ステータス</option><option value="active">アクティブ</option><option value="inactive">非アクティブ</option>
        </select>
        <select className="form-select" style={{ width: 'auto', minWidth: 140 }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="name">名前順</option><option value="recent">最終セッション順</option><option value="next">次回セッション順</option>
        </select>
      </div>

      {filtered.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {filtered.map(client => {
            const trainer = profiles.find(u => u.id === client.trainer_id);
            const flags = typeof client.flags === 'string' ? JSON.parse(client.flags) : (client.flags || []);
            return (
              <Link key={client.id} to={`/clients/${client.id}`} className="card" style={{ textDecoration: 'none', color: 'inherit', padding: '14px var(--space-lg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--color-accent)' }}>
                      {client.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        {client.name}
                        {flags.map((f, i) => <span key={i} className={`badge ${f.type === 'referral' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: 10 }}>{f.label}</span>)}
                      </div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                        {client.age}歳 {client.gender} ・ 担当: {trainer?.name || '—'} ・ セッション {client.session_count || 0}回
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>主訴: {client.latest_chief_complaint || '未入力'}</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>次回: {client.next_session_date || '未定'}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="card"><div className="empty-state"><p>クライアントがまだ登録されていません</p><button className="btn btn-primary" style={{ marginTop: 'var(--space-md)' }} onClick={() => setShowCreateModal(true)}>最初のクライアントを登録する</button></div></div>
      )}
    </div>
  );
}
