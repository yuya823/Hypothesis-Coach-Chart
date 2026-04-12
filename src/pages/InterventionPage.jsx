import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as db from '../lib/database';
import { useAuth } from '../App';
import { promptC_InterventionGeneration } from '../services/aiService';
import ExportModal from '../components/ExportModal';

const REACTION_OPTIONS = [
  { value: 'improved', label: '改善', color: '#3a8a6a' },
  { value: 'slightly_improved', label: 'やや改善', color: '#5ba88a' },
  { value: 'unchanged', label: '変化なし', color: '#8a8a8a' },
  { value: 'slightly_worse', label: 'やや悪化', color: '#c0852b' },
  { value: 'worse', label: '悪化', color: '#c0392b' },
];

const REEVAL_METRIC_TYPES = [
  { value: 'rom', label: '可動域 (°)', unit: '°' },
  { value: 'pain', label: '痛み (0-10)', unit: '/10' },
  { value: 'stability', label: '安定性', unit: '' },
  { value: 'quality', label: '動作の質', unit: '' },
  { value: 'score', label: 'スコア/数値', unit: '' },
  { value: 'finding', label: '所見', unit: '' },
];

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
  const [showExport, setShowExport] = useState(false);

  // Manual add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIntent, setNewIntent] = useState('');
  const [newTargetHypId, setNewTargetHypId] = useState('');
  const [newRevalItems, setNewRevalItems] = useState('');

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

  // ─── AI Generate ───
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

  // ─── Manual Add ───
  const handleManualAdd = async () => {
    if (!newName.trim()) { alert('介入名を入力してください'); return; }
    try {
      const reItems = newRevalItems.split('\n').map(s => s.trim()).filter(Boolean);
      const created = await db.createIntervention({
        session_id: sessionId,
        name: newName.trim(),
        intent: newIntent.trim(),
        target_hypothesis_id: newTargetHypId || null,
        reevaluation_items: reItems,
        next_session_note: '',
        source: 'manual',
      });
      setInterventions(prev => [...prev, created]);
      setNewName(''); setNewIntent(''); setNewTargetHypId(''); setNewRevalItems('');
      setShowAddForm(false);
      await db.createAuditLog({ user_id: user.id, user_name: user.name, action: 'intervention_add', target: sessionId, target_label: `${client?.name} - 介入追加`, details: `「${newName.trim()}」を手動追加` });
    } catch (err) { alert('追加エラー: ' + err.message); }
  };

  // ─── Reaction change (select) ───
  const handleReactionChange = async (ivId, reaction) => {
    try {
      await db.updateIntervention(ivId, { immediate_reaction: reaction });
      setInterventions(prev => prev.map(iv => iv.id === ivId ? { ...iv, immediate_reaction: reaction } : iv));
    } catch (err) { console.error(err); }
  };

  // ─── Reevaluation results (structured) ───
  const handleRevalResultChange = async (ivId, itemIdx, field, value) => {
    const iv = interventions.find(i => i.id === ivId);
    if (!iv) return;
    const results = typeof iv.reevaluation_results === 'string'
      ? JSON.parse(iv.reevaluation_results || '{}')
      : (iv.reevaluation_results || {});

    const key = `item_${itemIdx}`;
    results[key] = { ...(results[key] || {}), [field]: value };

    try {
      await db.updateIntervention(ivId, { reevaluation_results: results });
      setInterventions(prev => prev.map(i => i.id === ivId ? { ...i, reevaluation_results: results } : i));
    } catch (err) { console.error(err); }
  };

  // ─── Delete intervention ───
  const handleDelete = async (ivId) => {
    if (!confirm('この介入を削除しますか？')) return;
    try {
      const { supabase } = await import('../lib/supabase');
      const { error } = await supabase
        .from('interventions').delete().eq('id', ivId);
      if (error) throw error;
      setInterventions(prev => prev.filter(i => i.id !== ivId));
    } catch (err) { alert('削除エラー: ' + err.message); }
  };

  // ─── Complete session ───
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
    <div className="intervention-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
            <Link to={`/sessions/${sessionId}/hypothesis`} className="btn btn-ghost btn-sm">← 仮説に戻る</Link>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowExport(true)}>📤 エクスポート</button>
          </div>
          <h1 className="page-title">介入・再評価</h1>
          <p className="page-subtitle">{client?.name} ・ 第{session?.session_number}回セッション</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? '✕ 閉じる' : '＋ 手動追加'}
          </button>
          <button className="btn btn-secondary" onClick={handleAIGenerate} disabled={aiLoading || adoptedHyps.length === 0}>
            {aiLoading ? 'AI生成中...' : 'AI介入候補を追加'}
          </button>
          <button className="btn btn-primary" onClick={handleCompleteSession} disabled={saving || session?.status === 'completed'}>
            {session?.status === 'completed' ? '完了済み' : saving ? '保存中...' : 'セッションを完了'}
          </button>
        </div>
      </div>

      {showExport && (
        <ExportModal
          sessionId={sessionId}
          clientName={client?.name}
          sessionNumber={session?.session_number}
          onClose={() => setShowExport(false)}
        />
      )}

      {/* Manual add form */}
      {showAddForm && (
        <div className="card iv-add-form" style={{ marginBottom: 'var(--space-lg)' }}>
          <h3 className="card-title" style={{ marginBottom: 'var(--space-md)' }}>介入を手動追加</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
            <div className="form-group">
              <label className="form-label">介入名 *</label>
              <input className="form-input" placeholder="例: 腹式呼吸エクササイズ" value={newName} onChange={e => setNewName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">対象仮説</label>
              <select className="form-input" value={newTargetHypId} onChange={e => setNewTargetHypId(e.target.value)}>
                <option value="">未指定</option>
                {hypotheses.map(h => <option key={h.id} value={h.id}>{h.category}: {h.description.substring(0, 40)}...</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">意図・目的</label>
            <input className="form-input" placeholder="例: 呼吸圧を通じた体幹安定性の確認" value={newIntent} onChange={e => setNewIntent(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">再評価項目（改行区切り）</label>
            <textarea className="form-textarea" rows={3} placeholder={'例:\n足関節背屈角度\n膝内側偏位の変化\n呼気維持能力'} value={newRevalItems} onChange={e => setNewRevalItems(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => setShowAddForm(false)}>キャンセル</button>
            <button className="btn btn-primary" onClick={handleManualAdd}>追加する</button>
          </div>
        </div>
      )}

      {/* Adopted hypotheses */}
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

      {/* Intervention list */}
      {interventions.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {interventions.map(iv => {
            const targetHyp = hypotheses.find(h => h.id === iv.target_hypothesis_id);
            const reItems = typeof iv.reevaluation_items === 'string' ? JSON.parse(iv.reevaluation_items) : (iv.reevaluation_items || []);
            const reResults = typeof iv.reevaluation_results === 'string' ? JSON.parse(iv.reevaluation_results || '{}') : (iv.reevaluation_results || {});

            return (
              <div key={iv.id} className="card iv-card">
                {/* Header */}
                <div className="iv-card-header">
                  <div>
                    <h3 className="iv-card-title">{iv.name}</h3>
                    <div className="iv-card-meta">
                      {iv.source === 'ai' && <span className="iv-badge iv-badge--ai">AI提案</span>}
                      {targetHyp && <span className="iv-badge iv-badge--hyp">{targetHyp.category}</span>}
                    </div>
                  </div>
                  <button className="ote-item-btn ote-item-btn--danger" style={{ width: 28, height: 28 }} title="削除" onClick={() => handleDelete(iv.id)}>✕</button>
                </div>

                {iv.intent && (
                  <div className="iv-intent">
                    <span className="iv-intent-label">意図:</span> {iv.intent}
                  </div>
                )}

                {/* Immediate reaction */}
                <div className="iv-section">
                  <div className="iv-section-title">介入後の即時反応</div>
                  <div className="iv-reaction-grid">
                    {REACTION_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        className={`iv-reaction-btn ${iv.immediate_reaction === opt.value ? 'active' : ''}`}
                        style={iv.immediate_reaction === opt.value ? { borderColor: opt.color, color: opt.color, background: `${opt.color}08` } : {}}
                        onClick={() => handleReactionChange(iv.id, opt.value)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reevaluation items - structured */}
                {reItems.length > 0 && (
                  <div className="iv-section">
                    <div className="iv-section-title">再評価記録</div>
                    <div className="iv-reeval-list">
                      {reItems.map((item, j) => {
                        const result = reResults[`item_${j}`] || {};
                        return (
                          <div key={j} className="iv-reeval-item">
                            <div className="iv-reeval-item-name">{item}</div>
                            <div className="iv-reeval-fields">
                              <div className="iv-reeval-field">
                                <label>種類</label>
                                <select
                                  value={result.metric_type || ''}
                                  onChange={e => handleRevalResultChange(iv.id, j, 'metric_type', e.target.value)}
                                >
                                  <option value="">選択...</option>
                                  {REEVAL_METRIC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                              </div>

                              {(result.metric_type === 'rom' || result.metric_type === 'pain' || result.metric_type === 'score') && (
                                <>
                                  <div className="iv-reeval-field">
                                    <label>Before</label>
                                    <input
                                      type="text"
                                      placeholder="介入前"
                                      value={result.before || ''}
                                      onChange={e => handleRevalResultChange(iv.id, j, 'before', e.target.value)}
                                    />
                                  </div>
                                  <div className="iv-reeval-field">
                                    <label>After</label>
                                    <input
                                      type="text"
                                      placeholder="介入後"
                                      value={result.after || ''}
                                      onChange={e => handleRevalResultChange(iv.id, j, 'after', e.target.value)}
                                    />
                                  </div>
                                  {result.before && result.after && (
                                    <div className="iv-reeval-change">
                                      {(() => {
                                        const b = parseFloat(result.before);
                                        const a = parseFloat(result.after);
                                        if (isNaN(b) || isNaN(a)) return null;
                                        const diff = a - b;
                                        const color = diff > 0 ? '#3a8a6a' : diff < 0 ? '#c0392b' : '#8a8a8a';
                                        return <span style={{ color, fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                                          {diff > 0 ? '+' : ''}{diff.toFixed(1)}{REEVAL_METRIC_TYPES.find(t => t.value === result.metric_type)?.unit || ''}
                                        </span>;
                                      })()}
                                    </div>
                                  )}
                                </>
                              )}

                              {(result.metric_type === 'stability' || result.metric_type === 'quality') && (
                                <div className="iv-reeval-field iv-reeval-field--wide">
                                  <label>結果</label>
                                  <select
                                    value={result.grade || ''}
                                    onChange={e => handleRevalResultChange(iv.id, j, 'grade', e.target.value)}
                                  >
                                    <option value="">選択...</option>
                                    <option value="excellent">優良</option>
                                    <option value="good">良好</option>
                                    <option value="fair">普通</option>
                                    <option value="poor">不良</option>
                                    <option value="na">評価不能</option>
                                  </select>
                                </div>
                              )}

                              {result.metric_type === 'finding' && (
                                <div className="iv-reeval-field iv-reeval-field--wide">
                                  <label>所見</label>
                                  <input
                                    type="text"
                                    placeholder="所見を記述..."
                                    value={result.finding || ''}
                                    onChange={e => handleRevalResultChange(iv.id, j, 'finding', e.target.value)}
                                  />
                                </div>
                              )}

                              <div className="iv-reeval-field iv-reeval-field--wide">
                                <label>メモ</label>
                                <input
                                  type="text"
                                  placeholder="補足..."
                                  value={result.note || ''}
                                  onChange={e => handleRevalResultChange(iv.id, j, 'note', e.target.value)}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Next session note */}
                {iv.next_session_note && (
                  <div className="iv-next-note">
                    <span className="iv-next-note-label">次回の観点:</span> {iv.next_session_note}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <p>介入記録がまだありません</p>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center', marginTop: 'var(--space-md)' }}>
              <button className="btn btn-ghost" onClick={() => setShowAddForm(true)}>手動で追加</button>
              {adoptedHyps.length > 0 ? (
                <button className="btn btn-primary" onClick={handleAIGenerate} disabled={aiLoading}>
                  {aiLoading ? 'AI生成中...' : 'AIで介入候補を生成する'}
                </button>
              ) : (
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-sm)' }}>
                  先に仮説ページで仮説を「採用」してください
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
