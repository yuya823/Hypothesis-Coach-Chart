import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as db from '../lib/database';

export default function MediaComparisonPage() {
  const { id: clientId } = useParams();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.getClientById(clientId).then(c => { setClient(c); setLoading(false); }).catch(() => setLoading(false));
  }, [clientId]);

  if (loading) return <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>読み込み中...</div>;

  return (
    <div>
      <div className="page-header">
        <Link to={`/clients/${clientId}`} className="btn btn-ghost btn-sm" style={{ marginBottom: 'var(--space-sm)' }}>← 戻る</Link>
        <h1 className="page-title">写真・動画比較</h1>
        <p className="page-subtitle">{client?.name} のビジュアル記録</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">ビフォー・アフター比較</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
          <MediaPlaceholder label="Before" />
          <MediaPlaceholder label="After" />
        </div>
        <div className="ai-disclaimer" style={{ marginTop: 'var(--space-lg)' }}>
          ⚠ 写真・動画のアップロード機能は今後のアップデートで追加予定です。Supabase Storageを使用して安全にファイルを管理します。
        </div>
      </div>
    </div>
  );
}

function MediaPlaceholder({ label }) {
  return (
    <div style={{
      background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-md)',
      padding: 'var(--space-2xl)', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', minHeight: 240,
      border: '2px dashed var(--color-border)',
    }}>
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5">
        <rect x="4" y="8" width="40" height="32" rx="4" />
        <circle cx="16" cy="20" r="4" />
        <path d="M4 32l12-10 8 6 8-6 12 10" />
      </svg>
      <div style={{ marginTop: 'var(--space-md)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>準備中...</div>
    </div>
  );
}
