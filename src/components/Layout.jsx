import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../App';

const NAV_ITEMS = [
  { label: 'メイン', items: [
    { to: '/', icon: '◻', label: 'ダッシュボード' },
    { to: '/clients', icon: '◻', label: 'クライアント一覧' },
    { to: '/review', icon: '◻', label: 'スタッフレビュー' },
  ]},
  { label: '管理', adminOnly: true, items: [
    { to: '/kb', icon: '◻', label: '知識ベース', adminOnly: true },
    { to: '/audit', icon: '◻', label: '監査ログ', adminOnly: true },
  ]},
  { label: '設定', items: [
    { to: '/settings', icon: '◻', label: '設定' },
  ]},
];

// Simple SVG icons for a clean, professional look
const ICONS = {
  '/': (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="5" height="5" rx="1" />
      <rect x="9" y="2" width="5" height="5" rx="1" />
      <rect x="2" y="9" width="5" height="5" rx="1" />
      <rect x="9" y="9" width="5" height="5" rx="1" />
    </svg>
  ),
  '/clients': (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="5" r="3" />
      <path d="M2 14c0-3 2.5-5 6-5s6 2 6 5" />
    </svg>
  ),
  '/review': (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" />
      <path d="M5 6h6M5 8.5h6M5 11h3" />
    </svg>
  ),
  '/audit': (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2h8a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" />
      <path d="M6 5h4M6 7.5h4M6 10h2" />
    </svg>
  ),
  '/settings': (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2.5" />
      <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M3.1 12.9l1.4-1.4M11.5 4.5l1.4-1.4" />
    </svg>
  ),
  '/kb': (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12.5A1.5 1.5 0 013.5 11H14" />
      <path d="M3.5 1H14v14H3.5A1.5 1.5 0 012 13.5v-12A1.5 1.5 0 013.5 1z" />
      <path d="M5 5h6M5 8h4" />
    </svg>
  ),
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isAdmin = user?.role === 'admin';

  // Filter nav items based on role
  const visibleNav = NAV_ITEMS
    .filter(section => !section.adminOnly || isAdmin)
    .map(section => ({
      ...section,
      items: section.items.filter(item => !item.adminOnly || isAdmin),
    }))
    .filter(section => section.items.length > 0);

  return (
    <div className="app-layout">
      <aside className="app-sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">H</div>
          <div>
            <div className="sidebar-logo-text">Hypothesis</div>
            <div className="sidebar-logo-sub">Session Tool</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {visibleNav.map(section => (
            <div key={section.label}>
              <div className="sidebar-section-label">{section.label}</div>
              {section.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `sidebar-link ${isActive ? 'active' : ''}`
                  }
                >
                  <span className="icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {ICONS[item.to] || item.icon}
                  </span>
                  <span>{item.label}</span>
                  {item.badge && <span className="badge">{item.badge}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="sidebar-avatar">
            {user?.name?.charAt(0)}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name}</div>
            <div className="sidebar-user-role">
              {user?.role === 'admin' ? '管理者' : 'トレーナー'}
            </div>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={logout}
            title="ログアウト"
            style={{ padding: '4px 8px', fontSize: '13px' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M11 11l3-3-3-3M14 8H6" />
            </svg>
          </button>
        </div>
      </aside>

      <main className="app-main">
        <header className="app-header">
          <div>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', fontWeight: 400 }}>
              {new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <div className="ai-disclaimer" style={{ margin: 0, background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-tertiary)' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
                <circle cx="7" cy="7" r="6" />
                <path d="M7 4v3M7 9.5v.5" />
              </svg>
              AI提案は診断ではありません
            </div>
          </div>
        </header>
        <div className="app-content fade-in" key={location.pathname}>
          {children}
        </div>
      </main>
    </div>
  );
}
