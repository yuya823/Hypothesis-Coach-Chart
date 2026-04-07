import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as db from '../lib/database';

export default function StaffReviewPage() {
  const [clients, setClients] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTrainer, setFilterTrainer] = useState('all');
  const [selectedCase, setSelectedCase] = useState(null);
  const [caseDetails, setCaseDetails] = useState({ intake: null, sessions: [], hypotheses: [] });

  useEffect(() => {
    Promise.all([db.getClients(), db.getAllProfiles()])
      .then(([c, p]) => { setClients(c); setProfiles(p); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const selectCase = async (client) => {
    if (selectedCase?.id === client.id) { setSelectedCase(null); return; }
    setSelectedCase(client);
    const [intake, sessions] = await Promise.all([
      db.getIntakeByClientId(client.id),
      db.getSessionsByClientId(client.id),
    ]);
    let hyps = [];
    if (sessions.length > 0) {
      hyps = await db.getHypothesesBySessionId(sessions[0].id);
    }
    setCaseDetails({ intake, sessions, hypotheses: hyps.filter(h => h.status === 'adopted') });
  };

  const filtered = filterTrainer === 'all' ? clients : clients.filter(c => c.trainer_id === filterTrainer);

  if (loading) return <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>読み込み中...</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">スタッフレビュー</h1>
        <p className="page-subtitle">ケースの共有とスーパーバイズ用の確認画面</p>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
        <select className="form-select" style={{ width: 'auto', minWidth: 160 }}
          value={filterTrainer} onChange={e => setFilterTrainer(e.target.value)}>
          <option value="all">全トレーナー</option>
          {profiles.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedCase ? '1fr 1fr' : '1fr', gap: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {filtered.map(client => {
            const trainer = profiles.find(u => u.id === client.trainer_id);
            const flags = typeof client.flags === 'string' ? JSON.parse(client.flags) : (client.flags || []);
            return (
              <div key={client.id} className="card" style={{ cursor: 'pointer', borderColor: selectedCase?.id === client.id ? 'var(--color-accent)' : undefined, padding: '14px var(--space-lg)' }}
                onClick={() => selectCase(client)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                      <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{client.name}</span>
                      {flags.map((f, i) => <span key={i} className={`badge ${f.type === 'referral' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: 10 }}>{f.label}</span>)}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                      担当: {trainer?.name || '—'} ・ 主訴: {client.latest_chief_complaint || '未入力'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <div className="card"><div className="empty-state"><p>クライアントが登録されていません</p></div></div>}
        </div>

        {selectedCase && (
          <div className="fade-in">
            <div className="card" style={{ position: 'sticky', top: 'calc(var(--header-height) + var(--space-lg))' }}>
              <div className="card-header">
                <h3 className="card-title">{selectedCase.name} のケース概要</h3>
                <Link to={`/clients/${selectedCase.id}`} className="btn btn-ghost btn-sm">詳細へ →</Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <InfoItem label="主訴" value={selectedCase.latest_chief_complaint} />
                <InfoItem label="目標" value={selectedCase.latest_goal} />
                {caseDetails.hypotheses.length > 0 && (
                  <div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontWeight: 600, marginBottom: 4 }}>採用仮説</div>
                    {caseDetails.hypotheses.map(h => (
                      <div key={h.id} style={{ fontSize: 'var(--font-size-sm)', padding: '6px 10px', background: 'var(--color-bg-primary)', borderRadius: 'var(--radius-sm)', marginBottom: 4, borderLeft: '3px solid var(--color-success)' }}>
                        <span className="badge badge-accent" style={{ fontSize: 10, marginRight: 6 }}>{h.category}</span>
                        {h.description.substring(0, 60)}...
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div style={{ paddingBottom: 'var(--space-sm)', borderBottom: '1px solid var(--color-border-light)' }}>
      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', lineHeight: 1.7 }}>{value || '—'}</div>
    </div>
  );
}
