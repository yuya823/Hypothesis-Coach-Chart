import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as db from '../lib/database';
import { useAuth } from '../App';
import { promptA_IntakeSummary, getMockIntakeSummary } from '../services/aiService';

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

  if (loading) return <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>読み込み中...</div>;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Link to={`/clients/${clientId}`} className="btn btn-ghost btn-sm" style={{ marginBottom: 'var(--space-sm)' }}>← 戻る</Link>
          <h1 className="page-title">問診票</h1>
          <p className="page-subtitle">{client?.name} の問診情報</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button className="btn btn-secondary" onClick={handleAISummary} disabled={aiLoading}>
            {aiLoading ? 'AI分析中...' : 'AI問診整理'}
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

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
                <span>{s.label}</span>
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
