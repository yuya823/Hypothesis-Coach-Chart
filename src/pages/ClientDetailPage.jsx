import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import * as db from '../lib/database';
import { useAuth } from '../App';

export default function ClientDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [intake, setIntake] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [hypotheses, setHypotheses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingDate, setEditingDate] = useState(null);
  const [newSessionDate, setNewSessionDate] = useState(new Date().toISOString().split('T')[0]);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', age: '', gender: '', email: '', status: '' });
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      const [c, i, s] = await Promise.all([
        db.getClientById(id),
        db.getIntakeByClientId(id),
        db.getSessionsByClientId(id),
      ]);
      setClient(c);
      setIntake(i);
      setSessions(s);
      if (s.length > 0) {
        const hyps = await db.getHypothesesBySessionId(s[0].id);
        setHypotheses(hyps);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateSession = async () => {
    try {
      const sessionNumber = (client.session_count || 0) + 1;
      const session = await db.createSession({
        client_id: id,
        trainer_id: user.id,
        session_number: sessionNumber,
        session_type: sessionNumber === 1 ? 'initial' : 'followup',
        status: 'in_progress',
        date: newSessionDate,
      });
      await db.updateClient(id, { session_count: sessionNumber, last_session_date: session.date });
      await db.createAuditLog({ user_id: user.id, user_name: user.name, action: 'session_create', target: session.id, target_label: `${client.name} - 第${sessionNumber}回セッション`, details: 'セッションを開始' });
      navigate(`/sessions/${session.id}/observation`);
    } catch (err) {
      alert('セッション作成に失敗: ' + err.message);
    }
  };

  const handleDateChange = async (sessionId, newDate) => {
    try {
      await db.updateSession(sessionId, { date: newDate });
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, date: newDate } : s));
      setEditingDate(null);
    } catch (err) {
      alert('日付の更新に失敗: ' + err.message);
    }
  };

  // ── Edit handlers ──
  const openEditModal = () => {
    setEditForm({
      name: client.name || '',
      age: client.age?.toString() || '',
      gender: client.gender || '',
      email: client.email || '',
      status: client.status || 'active',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm.name.trim()) { alert('名前は必須です'); return; }
    setSaving(true);
    try {
      const updates = {
        name: editForm.name.trim(),
        age: editForm.age ? parseInt(editForm.age) : null,
        gender: editForm.gender,
        email: editForm.email.trim() || null,
        status: editForm.status,
      };
      const updated = await db.updateClient(id, updates);
      setClient(updated);
      setShowEditModal(false);
      await db.createAuditLog({
        user_id: user.id, user_name: user.name,
        action: 'client_update', target: id,
        target_label: updates.name,
        details: 'クライアント情報を編集',
      });
    } catch (err) {
      alert('保存に失敗しました: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete handler ──
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await db.createAuditLog({
        user_id: user.id, user_name: user.name,
        action: 'client_delete', target: id,
        target_label: client.name,
        details: `クライアント「${client.name}」を削除`,
      });
      await db.deleteClient(id);
      navigate('/clients');
    } catch (err) {
      alert('削除に失敗しました: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>読み込み中...</div>;
  if (!client) return <div className="empty-state"><p>クライアントが見つかりません</p></div>;

  const flags = typeof client.flags === 'string' ? JSON.parse(client.flags) : (client.flags || []);
  const latestSession = sessions[0];

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Link to="/clients" className="btn btn-ghost btn-sm" style={{ marginBottom: 'var(--space-sm)' }}>← 戻る</Link>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            {client.name}
            {flags.map((f, i) => <span key={i} className={`badge ${f.type === 'referral' ? 'badge-danger' : 'badge-warning'}`}>{f.label}</span>)}
            {client.status === 'inactive' && <span className="badge" style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)' }}>非アクティブ</span>}
          </h1>
          <p className="page-subtitle">
            {client.age}歳 {client.gender} ・ {client.session_count || 0}回 ・ {client.created_at?.split('T')[0]}
            {client.email && <span style={{ marginLeft: 'var(--space-sm)' }}>・ ✉ {client.email}</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={openEditModal} title="クライアント情報を編集">✏️ 編集</button>
          <button className="btn btn-danger btn-sm" onClick={() => setShowDeleteConfirm(true)} title="クライアントを削除">🗑 削除</button>
          <Link to={`/clients/${id}/intake`} className="btn btn-secondary">問診</Link>
          <Link to={`/clients/${id}/history`} className="btn btn-secondary">履歴</Link>
          <input
            type="date"
            className="form-input"
            value={newSessionDate}
            onChange={e => setNewSessionDate(e.target.value)}
          />
          <button className="btn btn-primary" onClick={handleCreateSession}>＋ 新規セッション</button>
        </div>
      </div>

      {/* ── 編集モーダル ── */}
      {showEditModal && (
        <div className="client-modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="client-modal" onClick={e => e.stopPropagation()}>
            <div className="client-modal-header">
              <h2 className="client-modal-title">クライアント情報を編集</h2>
              <button className="export-modal-close" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <div className="client-modal-body">
              <div className="form-group">
                <label className="form-label">名前 *</label>
                <input
                  className="form-input"
                  value={editForm.name}
                  onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                  autoFocus
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                <div className="form-group">
                  <label className="form-label">年齢</label>
                  <input
                    className="form-input"
                    type="number"
                    value={editForm.age}
                    onChange={e => setEditForm(p => ({ ...p, age: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">性別</label>
                  <select
                    className="form-select"
                    value={editForm.gender}
                    onChange={e => setEditForm(p => ({ ...p, gender: e.target.value }))}
                  >
                    <option>女性</option>
                    <option>男性</option>
                    <option>その他</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">メールアドレス</label>
                <input
                  className="form-input"
                  type="email"
                  value={editForm.email}
                  onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="example@email.com"
                />
                <div className="form-hint">セッション記録の送信に使用します</div>
              </div>
              <div className="form-group">
                <label className="form-label">ステータス</label>
                <select
                  className="form-select"
                  value={editForm.status}
                  onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}
                >
                  <option value="active">アクティブ</option>
                  <option value="inactive">非アクティブ</option>
                </select>
              </div>
            </div>
            <div className="client-modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowEditModal(false)}>キャンセル</button>
              <button className="btn btn-primary" onClick={handleSaveEdit} disabled={saving || !editForm.name.trim()}>
                {saving ? '保存中...' : '保存する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 削除確認モーダル ── */}
      {showDeleteConfirm && (
        <div className="client-modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="client-modal client-modal--danger" onClick={e => e.stopPropagation()}>
            <div className="client-modal-header">
              <h2 className="client-modal-title" style={{ color: 'var(--color-danger)' }}>⚠ クライアントを削除</h2>
            </div>
            <div className="client-modal-body">
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
                <strong>{client.name}</strong> の情報をすべて削除します。<br />
                関連するセッション記録・問診データ・仮説・介入記録もすべて削除されます。
              </p>
              <div className="ai-disclaimer" style={{ marginTop: 'var(--space-md)', borderColor: 'rgba(192, 57, 43, 0.2)', background: 'rgba(192, 57, 43, 0.04)', color: 'var(--color-danger)' }}>
                ⚠ この操作は取り消せません。本当に削除しますか？
              </div>
            </div>
            <div className="client-modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowDeleteConfirm(false)}>キャンセル</button>
              <button
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={deleting}
                style={{ background: 'var(--color-danger)', color: 'white', borderColor: 'var(--color-danger)' }}
              >
                {deleting ? '削除中...' : '削除する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {flags.length > 0 && (
        <div style={{ background: 'rgba(192,57,43,0.04)', border: '1px solid rgba(192,57,43,0.12)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md) var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
          {flags.map((f, i) => (
            <div key={i}><strong style={{ color: 'var(--color-danger)' }}>{f.label}</strong><span style={{ color: 'var(--color-text-secondary)', marginLeft: 'var(--space-sm)', fontSize: 'var(--font-size-sm)' }}>{f.note}</span></div>
          ))}
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><h2 className="card-title">問診要約</h2><Link to={`/clients/${id}/intake`} className="btn btn-ghost btn-sm">全文を見る →</Link></div>
          {intake ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <InfoRow label="主訴" value={intake.chief_complaint} />
              <InfoRow label="目標" value={intake.goal} />
              <InfoRow label="困りごと" value={intake.concerns} />
              <InfoRow label="既往歴" value={intake.medical_history} />
              <InfoRow label="仕事" value={intake.occupation} />
              <InfoRow label="運動歴" value={intake.exercise_history} />
            </div>
          ) : (
            <div className="empty-state"><p>問診未入力</p><Link to={`/clients/${id}/intake`} className="btn btn-primary" style={{ marginTop: 'var(--space-md)' }}>問診を入力する</Link></div>
          )}
        </div>

        {intake?.ai_summary && (
          <div className="card card-ai">
            <div className="card-header" style={{ marginTop: 'var(--space-md)' }}><h2 className="card-title">問診AI要約</h2></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: 4, fontWeight: 500 }}>背景因子</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {(intake.ai_summary.backgroundFactors || intake.ai_summary.background_factors || []).map((f, i) => <span key={i} className="badge badge-ai">{f}</span>)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: 4, fontWeight: 500 }}>追加確認質問候補</div>
                {(intake.ai_summary.followUpQuestions || intake.ai_summary.follow_up_questions || []).map((q, i) => (
                  <div key={i} style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-accent)', padding: '4px 0' }}>▸ {q}</div>
                ))}
              </div>
              <div className="ai-disclaimer">⚠ これは診断ではありません。</div>
            </div>
          </div>
        )}
      </div>

      {hypotheses.length > 0 && (
        <div className="card" style={{ marginTop: 'var(--space-lg)' }}>
          <div className="card-header"><h2 className="card-title">前回の仮説</h2>{latestSession && <span className="badge badge-info">第{latestSession.session_number}回 ({latestSession.date})</span>}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {hypotheses.map(h => (
              <div key={h.id} style={{ padding: 'var(--space-md)', background: 'var(--color-bg-primary)', borderRadius: 'var(--radius-md)', borderLeft: `3px solid ${h.status === 'adopted' ? 'var(--color-success)' : h.status === 'pending' ? 'var(--color-warning)' : 'var(--color-text-muted)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span className="badge badge-accent" style={{ fontSize: 10 }}>{h.category}</span>
                  <span className={`status-tag ${h.status === 'adopted' ? 'status-adopted' : h.status === 'pending' ? 'status-pending' : 'status-excluded'}`}>{h.status === 'adopted' ? '採用' : h.status === 'pending' ? '保留' : '除外'}</span>
                </div>
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>{h.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 'var(--space-lg)' }}>
        <div className="card-header"><h2 className="card-title">セッション履歴</h2><Link to={`/clients/${id}/history`} className="btn btn-ghost btn-sm">全て見る →</Link></div>
        {sessions.length > 0 ? (
          <div className="table-container">
            <table>
              <thead><tr><th>日付</th><th>回数</th><th>種別</th><th>ステータス</th><th></th></tr></thead>
              <tbody>
                {sessions.map(s => (
                  <tr key={s.id}>
                    <td>
                      {editingDate === s.id ? (
                        <input
                          type="date"
                          className="form-input"
                          defaultValue={s.date}
                          autoFocus
                          style={{ width: 140, fontSize: 'var(--font-size-xs)', padding: '3px 6px' }}
                          onBlur={e => handleDateChange(s.id, e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { handleDateChange(s.id, e.target.value); } if (e.key === 'Escape') setEditingDate(null); }}
                        />
                      ) : (
                        <span onClick={() => setEditingDate(s.id)} style={{ cursor: 'pointer', borderBottom: '1px dashed var(--color-border)' }} title="クリックで日付を編集">
                          {s.date}
                        </span>
                      )}
                    </td><td>第{s.session_number}回</td>
                    <td>{s.session_type === 'initial' ? '初回' : '継続'}</td>
                    <td><span className={`badge ${s.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>{s.status === 'completed' ? '完了' : '進行中'}</span></td>
                    <td><Link to={`/sessions/${s.id}/observation`} className="btn btn-ghost btn-sm">開く →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state"><p>セッションがまだありません</p></div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ paddingBottom: 'var(--space-sm)', borderBottom: '1px solid var(--color-border-light)' }}>
      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: 3, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', lineHeight: 1.7 }}>{value || '—'}</div>
    </div>
  );
}
