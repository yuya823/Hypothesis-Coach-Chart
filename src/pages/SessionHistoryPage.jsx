import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as db from '../lib/database';

export default function SessionHistoryPage() {
  const { id: clientId } = useParams();
  const [client, setClient] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [hypotheses, setHypotheses] = useState([]);
  const [interventions, setInterventions] = useState([]);

  useEffect(() => { loadData(); }, [clientId]);

  async function loadData() {
    try {
      const [c, s] = await Promise.all([db.getClientById(clientId), db.getSessionsByClientId(clientId)]);
      setClient(c);
      setSessions(s);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }

  const selectSession = async (session) => {
    setSelectedSession(session);
    const [h, iv] = await Promise.all([
      db.getHypothesesBySessionId(session.id),
      db.getInterventionsBySessionId(session.id),
    ]);
    setHypotheses(h);
    setInterventions(iv);
  };

  if (loading) return <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>読み込み中...</div>;

  return (
    <div>
      <div className="page-header">
        <Link to={`/clients/${clientId}`} className="btn btn-ghost btn-sm" style={{ marginBottom: 'var(--space-sm)' }}>← 戻る</Link>
        <h1 className="page-title">セッション履歴</h1>
        <p className="page-subtitle">{client?.name} の全セッション</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedSession ? '300px 1fr' : '1fr', gap: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {sessions.length > 0 ? sessions.map(s => (
            <div key={s.id} className="card" style={{ cursor: 'pointer', borderColor: selectedSession?.id === s.id ? 'var(--color-accent)' : undefined, padding: '12px var(--space-md)' }}
              onClick={() => selectSession(s)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--color-accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-accent)' }}>{s.session_number}</span>
                    <span style={{ fontWeight: 500 }}>第{s.session_number}回</span>
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 4, marginLeft: 36 }}>{s.date}</div>
                </div>
                <span className={`badge ${s.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>{s.status === 'completed' ? '完了' : '進行中'}</span>
              </div>
            </div>
          )) : (
            <div className="card"><div className="empty-state"><p>セッションがまだありません</p></div></div>
          )}
        </div>

        {selectedSession && (
          <div className="fade-in">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">第{selectedSession.session_number}回セッション ({selectedSession.date})</h3>
                <Link to={`/sessions/${selectedSession.id}/observation`} className="btn btn-ghost btn-sm">開く →</Link>
              </div>

              {hypotheses.length > 0 && (
                <div style={{ marginBottom: 'var(--space-lg)' }}>
                  <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-sm)' }}>仮説</div>
                  {hypotheses.map(h => (
                    <div key={h.id} style={{
                      padding: '6px 10px', marginBottom: 4, fontSize: 'var(--font-size-sm)',
                      borderLeft: `3px solid ${h.status === 'adopted' ? 'var(--color-success)' : 'var(--color-text-muted)'}`,
                      background: 'var(--color-bg-primary)', borderRadius: 'var(--radius-sm)',
                    }}>
                      <span className="badge badge-accent" style={{ fontSize: 10, marginRight: 6 }}>{h.category}</span>
                      {h.description.substring(0, 60)}...
                    </div>
                  ))}
                </div>
              )}

              {interventions.length > 0 && (
                <div>
                  <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-sm)' }}>介入</div>
                  {interventions.map(iv => (
                    <div key={iv.id} style={{
                      padding: '8px 10px', marginBottom: 4, fontSize: 'var(--font-size-sm)',
                      border: '1px solid var(--color-border-light)',
                      borderRadius: 'var(--radius-sm)',
                    }}>
                      <div style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{iv.name}</div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>{iv.intent}</div>
                      {iv.immediate_reaction && (
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-success)', marginTop: 4 }}>反応: {iv.immediate_reaction}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {hypotheses.length === 0 && interventions.length === 0 && (
                <div className="empty-state"><p>このセッションにはまだデータがありません</p></div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
