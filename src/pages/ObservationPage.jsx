import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import * as db from '../lib/database';
import { useAuth } from '../App';

const OBSERVATION_TABS = ['静的観察', '動的観察', '評価テスト', '自由メモ'];

export default function ObservationPage() {
  const { id: sessionId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [client, setClient] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [observations, setObservations] = useState({ static: [], dynamic: [], assessments: [], freeNote: '' });
  const [newItem, setNewItem] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, [sessionId]);

  async function loadData() {
    try {
      const s = await db.getSessionById(sessionId);
      setSession(s);
      const c = await db.getClientById(s.client_id);
      setClient(c);
      if (s.observations && Object.keys(s.observations).length > 0) {
        setObservations({
          static: s.observations.static || [],
          dynamic: s.observations.dynamic || [],
          assessments: s.observations.assessments || [],
          freeNote: s.observations.freeNote || s.free_note || '',
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const getTabKey = () => ['static', 'dynamic', 'assessments', 'freeNote'][activeTab];

  const addItem = () => {
    if (!newItem.trim()) return;
    const key = getTabKey();
    if (key === 'freeNote') return;
    setObservations(prev => ({ ...prev, [key]: [...prev[key], { text: newItem, timestamp: new Date().toLocaleTimeString('ja-JP') }] }));
    setNewItem('');
  };

  const removeItem = (key, index) => {
    setObservations(prev => ({ ...prev, [key]: prev[key].filter((_, i) => i !== index) }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await db.updateSession(sessionId, {
        observations: observations,
        free_note: observations.freeNote,
      });
      await db.createAuditLog({ user_id: user.id, user_name: user.name, action: 'observation_save', target: sessionId, target_label: `${client?.name} - 観察・評価`, details: '観察・評価を保存' });
      alert('保存しました');
    } catch (err) {
      alert('保存に失敗: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>読み込み中...</div>;

  const tabKey = getTabKey();

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Link to={`/clients/${client?.id}`} className="btn btn-ghost btn-sm" style={{ marginBottom: 'var(--space-sm)' }}>← 戻る</Link>
          <h1 className="page-title">観察・評価</h1>
          <p className="page-subtitle">{client?.name} ・ 第{session?.session_number}回セッション ({session?.date})</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存'}
          </button>
          <Link to={`/sessions/${sessionId}/hypothesis`} className="btn btn-secondary">仮説へ →</Link>
        </div>
      </div>

      <div className="tab-bar" style={{ marginBottom: 'var(--space-lg)' }}>
        {OBSERVATION_TABS.map((tab, i) => (
          <button key={i} className={`tab-item ${activeTab === i ? 'active' : ''}`} onClick={() => setActiveTab(i)}>{tab}</button>
        ))}
      </div>

      {tabKey === 'freeNote' ? (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 'var(--space-md)' }}>自由メモ</h3>
          <textarea className="form-textarea" rows={10} placeholder="セッション中の気づき、特記事項などを自由に記録..."
            value={observations.freeNote} onChange={e => setObservations(prev => ({ ...prev, freeNote: e.target.value }))} />
        </div>
      ) : (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 'var(--space-md)' }}>{OBSERVATION_TABS[activeTab]}</h3>
          <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
            <input className="form-input" placeholder={`${OBSERVATION_TABS[activeTab]}の項目を追加...`}
              value={newItem} onChange={e => setNewItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem()} style={{ flex: 1 }} />
            <button className="btn btn-primary" onClick={addItem}>追加</button>
          </div>
          {observations[tabKey].length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {observations[tabKey].map((item, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: 'var(--space-sm) var(--space-md)', background: 'var(--color-bg-primary)',
                  borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-light)',
                }}>
                  <div>
                    <span style={{ fontSize: 'var(--font-size-sm)' }}>{item.text}</span>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginLeft: 'var(--space-sm)' }}>{item.timestamp}</span>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => removeItem(tabKey, i)} style={{ color: 'var(--color-danger)' }}>×</button>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state"><p>{OBSERVATION_TABS[activeTab]}の記録がまだありません</p></div>
          )}
        </div>
      )}
    </div>
  );
}
