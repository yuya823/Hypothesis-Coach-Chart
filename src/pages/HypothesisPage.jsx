import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as db from '../lib/database';
import { useAuth } from '../App';
import { promptB_HypothesisGeneration } from '../services/aiService';

const CATEGORIES = ['構造・可動性仮説', '筋機能仮説', '運動制御仮説', '感覚入力仮説', '呼吸・圧仮説', '生活背景仮説'];
const CAT_INDEX = (cat) => CATEGORIES.indexOf(cat) + 1;

export default function HypothesisPage() {
  const { id: sessionId } = useParams();
  const { user } = useAuth();
  const [session, setSession] = useState(null);
  const [client, setClient] = useState(null);
  const [hypotheses, setHypotheses] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  useEffect(() => { loadData(); }, [sessionId]);

  async function loadData() {
    try {
      const s = await db.getSessionById(sessionId);
      setSession(s);
      const c = await db.getClientById(s.client_id);
      setClient(c);
      const h = await db.getHypothesesBySessionId(sessionId);
      setHypotheses(h);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }

  const handleAIGenerate = async () => {
    setAiLoading(true);
    try {
      const obs = session?.observations || {};
      const intake = await db.getIntakeByClientId(client.id);
      const bgFactors = intake ? [intake.occupation, intake.sleep, intake.stress, intake.exercise_history].filter(Boolean) : [];
      const result = await promptB_HypothesisGeneration(
        [...(obs.static || []).map(o => o.text), ...(obs.dynamic || []).map(o => o.text)],
        (obs.assessments || []).map(a => a.text),
        bgFactors
      );
      if (result.success && result.data.hypotheses) {
        for (const h of result.data.hypotheses) {
          const created = await db.createHypothesis({
            session_id: sessionId, category: h.category,
            description: h.description, rationale: h.rationale,
            priority: h.priority || 0, status: 'pending', source: 'ai',
            next_check: (h.next_checks || []).join('、'),
          });
          setHypotheses(prev => [...prev, created]);
        }
        await db.createAuditLog({ user_id: user.id, user_name: user.name, action: 'ai_generate', target: sessionId, target_label: `${client?.name} - 仮説生成`, details: 'AI仮説候補を生成（Prompt-B）' });
      } else {
        alert('AI生成エラー: ' + (result.error || '不明なエラー'));
      }
    } catch (err) { alert('エラー: ' + err.message); } finally { setAiLoading(false); }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await db.updateHypothesis(id, { status: newStatus });
      setHypotheses(prev => prev.map(h => h.id === id ? { ...h, status: newStatus } : h));
      await db.createAuditLog({ user_id: user.id, user_name: user.name, action: 'hypothesis_update', target: id, target_label: hypotheses.find(h => h.id === id)?.category || '', details: `ステータスを「${newStatus === 'adopted' ? '採用' : newStatus === 'pending' ? '保留' : '除外'}」に変更` });
    } catch (err) { alert('更新エラー: ' + err.message); }
  };

  const handleEdit = (h) => { setEditingId(h.id); setEditText(h.description); };

  const handleSaveEdit = async (id) => {
    try {
      await db.updateHypothesis(id, { description: editText });
      setHypotheses(prev => prev.map(h => h.id === id ? { ...h, description: editText } : h));
      setEditingId(null);
      await db.createAuditLog({ user_id: user.id, user_name: user.name, action: 'hypothesis_edit', target: id, target_label: hypotheses.find(h => h.id === id)?.category || '', details: 'テキストを手修正' });
    } catch (err) { alert('保存エラー'); }
  };

  const filtered = filter === 'all' ? hypotheses : hypotheses.filter(h => h.category === filter);

  if (loading) return <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>読み込み中...</div>;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Link to={`/clients/${client?.id}`} className="btn btn-ghost btn-sm" style={{ marginBottom: 'var(--space-sm)' }}>← 戻る</Link>
          <h1 className="page-title">問題リスト・仮説</h1>
          <p className="page-subtitle">観察・評価から導出された仮説候補を確認し、採用 / 保留 / 除外を判断してください</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button className="btn btn-secondary" onClick={handleAIGenerate} disabled={aiLoading}>
            {aiLoading ? 'AI生成中...' : 'AI仮説候補を追加'}
          </button>
          <Link to={`/sessions/${sessionId}/intervention`} className="btn btn-primary">介入画面へ →</Link>
        </div>
      </div>

      <div className="tab-bar" style={{ marginBottom: 'var(--space-lg)' }}>
        <button className={`tab-item ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>全て ({hypotheses.length})</button>
        {CATEGORIES.map(cat => {
          const count = hypotheses.filter(h => h.category === cat).length;
          return <button key={cat} className={`tab-item ${filter === cat ? 'active' : ''}`} onClick={() => setFilter(cat)}>{cat} ({count})</button>;
        })}
      </div>

      {filtered.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {filtered.map((h, idx) => (
            <div key={h.id} className="card" style={{ borderLeft: `3px solid ${h.status === 'adopted' ? 'var(--color-success)' : h.status === 'excluded' ? 'var(--color-text-muted)' : 'var(--color-accent)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--color-accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 700 }}>
                    {String(CAT_INDEX(h.category)).padStart(2, '0')}
                  </div>
                  <span className="badge badge-accent">{h.category}</span>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>優先度 {h.priority}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  {h.source === 'ai' && <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-accent)' }}>AI提案</span>}
                  <button className={`btn btn-sm ${h.status === 'adopted' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => handleStatusChange(h.id, 'adopted')}>採用</button>
                  <button className={`btn btn-sm ${h.status === 'pending' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => handleStatusChange(h.id, 'pending')}>保留</button>
                  <button className={`btn btn-sm ${h.status === 'excluded' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => handleStatusChange(h.id, 'excluded')}>除外</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(h)}>編集</button>
                </div>
              </div>
              {editingId === h.id ? (
                <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                  <textarea className="form-textarea" value={editText} onChange={e => setEditText(e.target.value)} rows={2} style={{ flex: 1 }} />
                  <button className="btn btn-primary btn-sm" onClick={() => handleSaveEdit(h.id)}>保存</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>取消</button>
                </div>
              ) : (
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', lineHeight: 1.7, marginBottom: 'var(--space-sm)' }}>{h.description}</div>
              )}
              {h.rationale && <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: 4 }}>根拠: {h.rationale}</div>}
              {h.next_check && (
                <div style={{ fontSize: 'var(--font-size-xs)', padding: '4px 8px', background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-secondary)' }}>
                  次に確認: {h.next_check}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card"><div className="empty-state"><p>仮説がまだありません</p><button className="btn btn-primary" onClick={handleAIGenerate} disabled={aiLoading} style={{ marginTop: 'var(--space-md)' }}>{aiLoading ? 'AI生成中...' : 'AIで仮説候補を生成する'}</button></div></div>
      )}
    </div>
  );
}
