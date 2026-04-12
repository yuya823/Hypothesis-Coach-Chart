import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as db from '../lib/database';
import { useAuth } from '../App';
import { promptA_IntakeSummary, getMockIntakeSummary, promptG_IntakeAutofill } from '../services/aiService';

const SECTIONS = [
  { key: 'chief_complaint', label: '主訴', placeholder: 'クライアントの主な訴えを記録…' },
  { key: 'goal', label: '目標', placeholder: 'クライアントの目標を記録…' },
  { key: 'concerns', label: '困りごと', placeholder: '日常の困りごと…' },
  { key: 'desires', label: '望み・希望', placeholder: 'こうなりたい、という希望…' },
  { key: 'timeline', label: '期間イメージ', placeholder: 'いつまでに改善したいか…' },
  { key: 'history', label: '経緯', placeholder: 'いつ頃から、きっかけなど…' },
  { key: 'medical_history', label: '既往歴・医療情報', placeholder: '過去の怪我や病気、手術歴…' },
  { key: 'medications', label: '服薬', placeholder: '現在服用中の薬…' },
  { key: 'occupation', label: '仕事・生活環境', placeholder: '職業、労働時間、姿勢…' },
  { key: 'sleep', label: '睡眠', placeholder: '睡眠時間、質…' },
  { key: 'nutrition', label: '栄養', placeholder: '食事パターン…' },
  { key: 'stress', label: 'ストレス', placeholder: 'ストレス要因…' },
  { key: 'exercise_history', label: '運動歴', placeholder: '過去・現在の運動習慣…' },
  { key: 'success_experience', label: '成功体験', placeholder: 'うまくいった経験…' },
  { key: 'failure_experience', label: '失敗体験', placeholder: 'うまくいかなかった経験…' },
  { key: 'notes', label: 'メモ', placeholder: '初回評価時のメモ…' },
];

const SECTION_LABELS = Object.fromEntries(SECTIONS.map(s => [s.key, s.label]));

export default function IntakeFormPage() {
  const { id: clientId } = useParams();
  const { user } = useAuth();
  const [client, setClient] = useState(null);
  const [form, setForm] = useState({});
  const [aiSummary, setAiSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState(new Set(['chief_complaint', 'goal']));

  // AI Autofill state
  const [showAutofill, setShowAutofill] = useState(false);
  const [autofillText, setAutofillText] = useState('');
  const [autofillLoading, setAutofillLoading] = useState(false);
  const [autofillResult, setAutofillResult] = useState(null);
  const [autofillAccepted, setAutofillAccepted] = useState({});

  useEffect(() => {
    loadData();
  }, [clientId]);

  async function loadData() {
    try {
      const [c, intake] = await Promise.all([
        db.getClientById(clientId),
        db.getIntakeByClientId(clientId),
      ]);
      setClient(c);
      if (intake) {
        setForm(intake);
        setAiSummary(intake.ai_summary);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const toggleSection = (key) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await db.upsertIntake(clientId, {
        ...form,
        ai_summary: aiSummary,
      });
      setForm(saved);
      // Update client's chief complaint and goal
      await db.updateClient(clientId, {
        latest_chief_complaint: form.chief_complaint || '',
        latest_goal: form.goal || '',
      });
      await db.createAuditLog({ user_id: user.id, user_name: user.name, action: 'intake_save', target: saved.id, target_label: `${client?.name} - 問診`, details: '問診を保存' });
      alert('保存しました');
    } catch (err) {
      alert('保存に失敗: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAISummary = async () => {
    setAiLoading(true);
    try {
      const result = await promptA_IntakeSummary(form);
      if (result.success) {
        setAiSummary(result.data);
        await db.createAuditLog({ user_id: user.id, user_name: user.name, action: 'ai_generate', target: form.id, target_label: `${client?.name} - 問診整理`, details: 'AI問診整理を実行（Prompt-A）' });
      } else {
        // Fallback to mock
        const mock = getMockIntakeSummary(form);
        setAiSummary(mock);
        alert('AI APIエラーのためモックデータを表示: ' + result.error);
      }
    } catch (err) {
      alert('AI実行エラー: ' + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  // ─── AI Auto-fill ───
  const handleAutofill = async () => {
    if (!autofillText.trim()) return;
    setAutofillLoading(true);
    setAutofillResult(null);
    setAutofillAccepted({});
    try {
      const result = await promptG_IntakeAutofill(autofillText);
      if (result.success) {
        setAutofillResult(result.data);
        // Auto-accept all filled fields by default
        const accepted = {};
        if (result.data.fields) {
          for (const [key, val] of Object.entries(result.data.fields)) {
            if (val && val.trim()) accepted[key] = true;
          }
        }
        setAutofillAccepted(accepted);
        await db.createAuditLog({ user_id: user.id, user_name: user.name, action: 'ai_generate', target: form.id || clientId, target_label: `${client?.name} - 問診自動振り分け`, details: 'AI問診自動振り分けを実行（Prompt-G）' });
      } else {
        alert('AI実行エラー: ' + result.error);
      }
    } catch (err) {
      alert('AI実行エラー: ' + err.message);
    } finally {
      setAutofillLoading(false);
    }
  };

  const toggleAutofillAccept = (key) => {
    setAutofillAccepted(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const applyAutofill = () => {
    if (!autofillResult?.fields) return;
    const updates = {};
    for (const [key, val] of Object.entries(autofillResult.fields)) {
      if (autofillAccepted[key] && val && val.trim()) {
        // Merge with existing: append if existing content exists
        const existing = form[key] || '';
        updates[key] = existing
          ? `${existing}\n${val}`
          : val;
      }
    }
    setForm(prev => ({ ...prev, ...updates }));
    // Expand all sections that got new content
    setExpandedSections(prev => {
      const next = new Set(prev);
      Object.keys(updates).forEach(k => next.add(k));
      return next;
    });
    setShowAutofill(false);
    setAutofillResult(null);
    setAutofillText('');
  };

  const filledCount = autofillResult?.fields
    ? Object.values(autofillResult.fields).filter(v => v && v.trim()).length
    : 0;

  if (loading) return <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>読み込み中...</div>;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Link to={`/clients/${clientId}`} className="btn btn-ghost btn-sm" style={{ marginBottom: 'var(--space-sm)' }}>← 戻る</Link>
          <h1 className="page-title">問診票</h1>
          <p className="page-subtitle">{client?.name} の問診情報</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={() => setShowAutofill(!showAutofill)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            自動振り分け
          </button>
          <button className="btn btn-secondary" onClick={handleAISummary} disabled={aiLoading}>
            {aiLoading ? 'AI分析中...' : 'AI問診整理'}
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      {/* ─── AI Auto-fill Panel ─── */}
      {showAutofill && (
        <div className="intake-autofill-panel">
          <div className="intake-autofill-header">
            <div className="intake-autofill-title-row">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
              <h3 className="intake-autofill-title">自由記述・文字起こしから自動振り分け</h3>
            </div>
            <p className="intake-autofill-desc">
              問診時のメモや音声文字起こしを貼り付けると、AIが各項目に自動振り分けします。
              振り分け結果を確認・選択してから反映できます。
            </p>
          </div>

          {!autofillResult ? (
            /* ── Input phase ── */
            <div className="intake-autofill-input">
              <textarea
                className="form-textarea intake-autofill-textarea"
                rows={8}
                placeholder="ここに問診の自由記述、文字起こし、メモなどを貼り付けてください…&#10;&#10;例：&#10;「40代女性、デスクワーク8時間。3ヶ月前から右肩が痛くて腕が上がりにくい。整形外科でレントゲン撮ったけど異常なし。ロキソニン飲んでる。夜寝るとき痛くて目が覚める。週1でヨガ通ってたけど最近行けてない。仕事のストレスが多い。」"
                value={autofillText}
                onChange={e => setAutofillText(e.target.value)}
              />
              <div className="intake-autofill-actions">
                <span className="intake-autofill-charcount">{autofillText.length} 文字</span>
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowAutofill(false)}>キャンセル</button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleAutofill}
                    disabled={autofillLoading || !autofillText.trim()}
                  >
                    {autofillLoading ? (
                      <>
                        <span className="intake-autofill-spinner"></span>
                        AI解析中...
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
                          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                        </svg>
                        AI振り分け開始
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ── Review phase ── */
            <div className="intake-autofill-review">
              <div className="intake-autofill-review-header">
                <div className="intake-autofill-review-stats">
                  <span className="intake-autofill-stat intake-autofill-stat--filled">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    {filledCount}項目 抽出
                  </span>
                  {autofillResult.unclassified?.length > 0 && (
                    <span className="intake-autofill-stat intake-autofill-stat--unclassified">
                      未分類: {autofillResult.unclassified.length}件
                    </span>
                  )}
                </div>
                {autofillResult.source_summary && (
                  <div className="intake-autofill-summary">{autofillResult.source_summary}</div>
                )}
              </div>

              <div className="intake-autofill-fields">
                {SECTIONS.map(s => {
                  const val = autofillResult.fields?.[s.key];
                  if (!val || !val.trim()) return null;
                  const accepted = autofillAccepted[s.key];
                  const hasExisting = form[s.key] && form[s.key].trim();

                  return (
                    <div
                      key={s.key}
                      className={`intake-autofill-field ${accepted ? 'intake-autofill-field--accepted' : 'intake-autofill-field--rejected'}`}
                      onClick={() => toggleAutofillAccept(s.key)}
                    >
                      <div className="intake-autofill-field-header">
                        <div className="intake-autofill-checkbox">
                          {accepted ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--color-accent)" stroke="white" strokeWidth="2.5">
                              <rect x="2" y="2" width="20" height="20" rx="4" fill="var(--color-accent)"/>
                              <polyline points="17 8 10 16 7 13"/>
                            </svg>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-border)" strokeWidth="2">
                              <rect x="2" y="2" width="20" height="20" rx="4"/>
                            </svg>
                          )}
                        </div>
                        <span className="intake-autofill-field-label">{s.label}</span>
                        {hasExisting && (
                          <span className="intake-autofill-field-badge">追記</span>
                        )}
                      </div>
                      <div className="intake-autofill-field-value">{val}</div>
                      {hasExisting && (
                        <div className="intake-autofill-field-existing">
                          既存: {form[s.key].substring(0, 40)}{form[s.key].length > 40 ? '…' : ''}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Unclassified */}
              {autofillResult.unclassified?.length > 0 && (
                <div className="intake-autofill-unclassified">
                  <div className="intake-autofill-unclassified-title">未分類テキスト</div>
                  {autofillResult.unclassified.map((u, i) => (
                    <div key={i} className="intake-autofill-unclassified-item">
                      <div className="intake-autofill-unclassified-text">"{u.text}"</div>
                      <div className="intake-autofill-unclassified-reason">{u.reason}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="intake-autofill-review-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => { setAutofillResult(null); setAutofillAccepted({}); }}>
                  やり直す
                </button>
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => {
                    // Select all / deselect all
                    if (Object.values(autofillAccepted).every(v => v)) {
                      setAutofillAccepted({});
                    } else {
                      const all = {};
                      for (const [k, v] of Object.entries(autofillResult.fields || {})) {
                        if (v && v.trim()) all[k] = true;
                      }
                      setAutofillAccepted(all);
                    }
                  }}>
                    {Object.values(autofillAccepted).every(v => v) ? '全て解除' : '全て選択'}
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={applyAutofill}
                    disabled={Object.values(autofillAccepted).filter(v => v).length === 0}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    選択した{Object.values(autofillAccepted).filter(v => v).length}項目を反映
                  </button>
                </div>
              </div>

              <div className="ai-disclaimer" style={{ marginTop: 'var(--space-sm)' }}>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ flexShrink: 0 }}>
                  <circle cx="7" cy="7" r="6"/><path d="M7 4v3M7 9.5v.5"/>
                </svg>
                AIが振り分けた内容は、必ず確認してから反映してください。推測で埋めた項目はありません。
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid-2">
        <div>
          {SECTIONS.map(s => (
            <div key={s.key} className="card" style={{ marginBottom: 'var(--space-sm)', padding: 0 }}>
              <button onClick={() => toggleSection(s.key)} style={{
                width: '100%', padding: '12px var(--space-lg)', display: 'flex',
                justifyContent: 'space-between', alignItems: 'center', background: 'none',
                border: 'none', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--color-text-primary)',
                fontWeight: 500, fontSize: 'var(--font-size-sm)',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {form[s.key] && form[s.key].trim() && (
                    <svg width="6" height="6" viewBox="0 0 6 6" fill="var(--color-accent)"><circle cx="3" cy="3" r="3"/></svg>
                  )}
                  {s.label}
                </span>
                <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                  {expandedSections.has(s.key) ? '▲' : '▼'}
                </span>
              </button>
              {expandedSections.has(s.key) && (
                <div style={{ padding: '0 var(--space-lg) var(--space-lg)' }}>
                  <textarea className="form-textarea" rows={3} placeholder={s.placeholder}
                    value={form[s.key] || ''} onChange={e => handleChange(s.key, e.target.value)} />
                </div>
              )}
            </div>
          ))}
        </div>

        <div>
          {aiSummary && (
            <div className="card card-ai" style={{ position: 'sticky', top: 'calc(var(--header-height) + var(--space-lg))' }}>
              <h3 className="card-title" style={{ marginBottom: 'var(--space-lg)' }}>AI問診整理結果</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <SummaryItem label="主訴要約" value={aiSummary.chief_complaint || aiSummary.chiefComplaint} />
                <SummaryItem label="目標要約" value={aiSummary.goal} />
                <div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontWeight: 500, marginBottom: 4 }}>困りごと</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {(aiSummary.concerns || []).map((c, i) => <span key={i} className="badge badge-info">{c}</span>)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontWeight: 500, marginBottom: 4 }}>背景因子</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {(aiSummary.background_factors || aiSummary.backgroundFactors || []).map((f, i) => <span key={i} className="badge badge-ai">{f}</span>)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontWeight: 500, marginBottom: 4 }}>追加確認質問</div>
                  {(aiSummary.follow_up_questions || aiSummary.followUpQuestions || []).map((q, i) => (
                    <div key={i} style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-accent)', padding: '4px 0' }}>▸ {q}</div>
                  ))}
                </div>
                <div className="ai-disclaimer">⚠ {aiSummary.disclaimer || 'これは診断ではありません。'}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div style={{ paddingBottom: 'var(--space-sm)', borderBottom: '1px solid var(--color-border-light)' }}>
      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontWeight: 500, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', lineHeight: 1.7 }}>{value || '—'}</div>
    </div>
  );
}
