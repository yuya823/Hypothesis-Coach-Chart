import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as db from '../lib/database';
import { useAuth } from '../App';
import { promptC_InterventionGeneration } from '../services/aiService';

export default function InterventionPage() {
  const { id: sessionId } = useParams();
  const { user } = useAuth();
  const [session, setSession] = useState(null);
  const [client, setClient] = useState(null);
  const [hypotheses, setHypotheses] = useState([]);
  const [interventions, setInterventions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, [sessionId]);

  async function loadData() {
    try {
      const s = await db.getSessionById(sessionId);
      setSession(s);
      const c = await db.getClientById(s.client_id);
      setClient(c);
      const [h, iv] = await Promise.all([
        db.getHypothesesBySessionId(sessionId),
        db.getInterventionsBySessionId(sessionId),
      ]);
      setHypotheses(h);
      setInterventions(iv);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }

  const adoptedHyps = hypotheses.filter(h => h.status === 'adopted');

  const handleAIGenerate = async () => {
    setAiLoading(true);
    try {
      const result = await promptC_InterventionGeneration(adoptedHyps.map(h => ({
        category: h.category, description: h.description, rationale: h.rationale,
      })));
      if (result.success && result.data.interventions) {
        for (const iv of result.data.interventions) {
          const targetHyp = hypotheses.find(h => h.category === iv.target_hypothesis_category);
          const created = await db.createIntervention({
            session_id: sessionId, name: iv.name, intent: iv.intent,
            target_hypothesis_id: targetHyp?.id || null,
            reevaluation_items: iv.reevaluation_items || [],
            next_session_note: iv.next_session_note || '', source: 'ai',
          });
          setInterventions(prev => [...prev, created]);
        }
        await db.createAuditLog({ user_id: user.id, user_name: user.name, action: 'ai_generate', target: sessionId, target_label: `${client?.name} - 介入候補生成`, details: 'AI介入候補を生成（Prompt-C）' });
      } else {
        alert('AI生成エラー: ' + (result.error || '不明'));
      }
    } catch (err) { alert('エラー: ' + err.message); } finally { setAiLoading(false); }
  };

  const handleReactionChange = async (ivId, reaction) => {
    try {
      await db.updateIntervention(ivId, { immediate_reaction: reaction });
      setInterventions(prev => prev.map(iv => iv.id === ivId ? { ...iv, immediate_reaction: reaction } : iv));
    } catch (err) { console.error(err); }
  };

  const handleCompleteSession = async () => {
    setSaving(true);
    try {
      await db.updateSession(sessionId, { status: 'completed' });
      await db.createAuditLog({ user_id: user.id, user_name: user.name, action: 'session_complete', target: sessionId, target_label: `${client?.name} - 第${session.session_number}回セッション`, details: 'セッション完了として保存' });
      alert('セッションを完了しました');
      setSession(prev => ({ ...prev, status: 'completed' }));
    } catch (err) { alert('エラー: ' + err.message); } finally { setSaving(false); }
  };

  if (loading) return <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>読み込み中...</div>;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Link to={`/sessions/${sessionId}/hypothesis`} className="btn btn-ghost btn-sm" style={{ marginBottom: 'var(--space-sm)' }}>← 仮説に戻る</Link>
          <h1 className="page-title">介入・再評価</h1>
          <p className="page-subtitle">{client?.name} ・ 第{session?.session_number}回セッション</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button className="btn btn-secondary" onClick={handleAIGenerate} disabled={aiLoading || adoptedHyps.length === 0}>
            {aiLoading ? 'AI生成中...' : 'AI介入候補を追加'}
          </button>
          <button className="btn btn-primary" onClick={handleCompleteSession} disabled={saving || session?.status === 'completed'}>
            {session?.status === 'completed' ? '完了済み' : saving ? '保存中...' : 'セッションを完了'}
          </button>
        </div>
      </div>

      {/* 採用仮説 */}
      {adoptedHyps.length > 0 && (
        <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
          <h3 className="card-title" style={{ marginBottom: 'var(--space-md)' }}>採用された仮説</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
            {adoptedHyps.map(h => (
              <div key={h.id} style={{
                padding: '6px 12px', background: 'var(--color-accent-subtle)',
                borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--color-success)',
                fontSize: 'var(--font-size-sm)',
              }}>
                <span className="badge badge-accent" style={{ fontSize: 10, marginRight: 6 }}>{h.category}</span>
                {h.description.substring(0, 50)}...
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 介入一覧 */}
      {interventions.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {interventions.map(iv => {
            const targetHyp = hypotheses.find(h => h.id === iv.target_hypothesis_id);
            const reItems = typeof iv.reevaluation_items === 'string' ? JSON.parse(iv.reevaluation_items) : (iv.reevaluation_items || []);
            return (
              <div key={iv.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                  <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>{iv.name}</h3>
                  {iv.source === 'ai' && <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-accent)' }}>AI提案</span>}
                </div>
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-md)', lineHeight: 1.7 }}>
                  意図: {iv.intent}
                </div>
                {targetHyp && (
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-md)' }}>
                    対象仮説: <span className="badge badge-accent" style={{ fontSize: 10 }}>{targetHyp.category}</span>
                  </div>
                )}

                {/* 再評価項目 */}
                <div style={{ border: '1px solid var(--color-border-light)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', marginBottom: 'var(--space-sm)' }}>
                  <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-sm)' }}>再評価項目</div>
                  {reItems.map((item, j) => (
                    <div key={j} style={{ fontSize: 'var(--font-size-sm)', padding: '4px 0', borderBottom: '1px solid var(--color-border-light)' }}>
                      ▸ {item}
                    </div>
                  ))}
                </div>

                {/* 即時反応 */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 'var(--font-size-xs)' }}>即時反応メモ</label>
                  <textarea className="form-textarea" rows={2} placeholder="介入後の即時反応を記録..."
                    value={iv.immediate_reaction || ''}
                    onChange={e => handleReactionChange(iv.id, e.target.value)} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <p>介入記録がまだありません</p>
            {adoptedHyps.length > 0 ? (
              <button className="btn btn-primary" onClick={handleAIGenerate} disabled={aiLoading} style={{ marginTop: 'var(--space-md)' }}>
                {aiLoading ? 'AI生成中...' : 'AIで介入候補を生成する'}
              </button>
            ) : (
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-sm)' }}>
                先に仮説ページで仮説を「採用」してください
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
