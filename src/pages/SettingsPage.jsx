import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../App';
import * as db from '../lib/database';

export default function SettingsPage() {
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState(null);

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('*').eq('id', user.id).single()
        .then(({ data }) => {
          if (data) {
            setProfileData(data);
            setApiKey(data.openai_api_key || '');
          }
        });
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await db.updateProfile(user.id, { openai_api_key: apiKey });
      // Also store in localStorage as fallback
      localStorage.setItem('hst_openai_key', apiKey);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      alert('保存に失敗: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">設定</h1>
        <p className="page-subtitle">AI機能とアプリケーションの設定</p>
      </div>

      <div style={{ maxWidth: 600 }}>
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 'var(--space-lg)' }}>AI設定</h3>

          <div className="form-group">
            <label className="form-label">OpenAI APIキー</label>
            <input
              type="password"
              className="form-input"
              placeholder="sk-..."
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
            />
            <div className="form-hint">
              AI機能（問診整理、仮説生成、介入候補、説明文生成）を使用するにはOpenAI APIキーが必要です。
              キーはSupabaseのプロフィールに安全に保存されます。
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </button>
            {saved && <span style={{ color: 'var(--color-success)', fontSize: 'var(--font-size-sm)' }}>保存しました</span>}
          </div>
        </div>

        <div className="card" style={{ marginTop: 'var(--space-lg)' }}>
          <h3 className="card-title" style={{ marginBottom: 'var(--space-lg)' }}>アカウント情報</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <InfoItem label="ユーザー名" value={user?.name} />
            <InfoItem label="メールアドレス" value={user?.email} />
            <InfoItem label="ロール" value={user?.role === 'admin' ? '管理者' : 'トレーナー'} />
          </div>
        </div>

        <div className="card" style={{ marginTop: 'var(--space-lg)' }}>
          <h3 className="card-title" style={{ marginBottom: 'var(--space-lg)' }}>アプリケーション情報</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <InfoItem label="バージョン" value="1.0.0" />
            <InfoItem label="仮説カテゴリ" value="6種類（構造・可動性、筋機能、運動制御、感覚入力、呼吸・圧、生活背景）" />
            <InfoItem label="AIモデル" value="GPT-4（APIキー設定済みの場合）" />
            <InfoItem label="データベース" value="Supabase (PostgreSQL)" />
          </div>
          <div className="ai-disclaimer" style={{ marginTop: 'var(--space-lg)' }}>
            ⚠ このツールのAI機能は診断を目的としていません。全ての判断は有資格の指導者が行ってください。
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div style={{ paddingBottom: 'var(--space-sm)', borderBottom: '1px solid var(--color-border-light)' }}>
      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontWeight: 500, marginBottom: 3, letterSpacing: '0.03em' }}>{label}</div>
      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{value || '—'}</div>
    </div>
  );
}
