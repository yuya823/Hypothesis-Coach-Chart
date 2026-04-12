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
  const [editingDate, setEditingDate] = useState(null);

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

  const handleDateChange = async (sessionId, newDate, e) => {
    if (e) e.stopPropagation();
    try {
      await db.updateSession(sessionId, { date: newDate });
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, date: newDate } : s));
      if (selectedSession?.id === sessionId) {
        setSelectedSession(prev => ({ ...prev, date: newDate }));
      }
      setEditingDate(null);
    } catch (err) {
      alert('日付の更新に失敗: ' + err.message);
    }
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
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 4, marginLeft: 36 }}>
                    {editingDate === s.id ? (
                      <input
                        type="date"
                        className="form-input"
                        defaultValue={s.date}
                        autoFocus
                        onClick={e => e.stopPropagation()}
                        style={{ width: 130, fontSize: 11, padding: '2px 4px' }}
                        onBlur={e => handleDateChange(s.id, e.target.value, e)}
                        onKeyDown={e => { if (e.key === 'Enter') handleDateChange(s.id, e.target.value, e); if (e.key === 'Escape') { e.stopPropagation(); setEditingDate(null); } }}
                      />
                    ) : (
                      <span
                        onClick={e => { e.stopPropagation(); setEditingDate(s.id); }}
                        style={{ cursor: 'pointer', borderBottom: '1px dashed var(--color-border)' }}
                        title="クリックで日付を編集"
                      >{s.date}</span>
                    )}
                  </div>
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
                <h3 className="card-title">第{selectedSession.session_number}回セッション (
                  <input
                    type="date"
                    className="form-input"
                    value={selectedSession.date || ''}
                    onChange={e => handleDateChange(selectedSession.id, e.target.value)}
                    style={{ width: 130, fontSize: 'var(--font-size-xs)', padding: '2px 6px', display: 'inline', border: '1px solid transparent', borderRadius: 'var(--radius-sm)', background: 'transparent', color: 'inherit', cursor: 'pointer' }}
                    onFocus={e => e.target.style.border = '1px solid var(--color-accent)'}
                    onBlur={e => e.target.style.border = '1px solid transparent'}
                  />)
                </h3>
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
