import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import AlertsPage from './components/AlertsPage';
import ReportsPage from './components/ReportsPage';
import AboutPage from './components/AboutPage';
import Logo from './components/Logo';
import { getVehicles, getLatestReading } from './services/api';
import './App.css';

function NavIcon({ name }) {
  const icons = {
    grid: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    alert: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    chart: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    file: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" />
      </svg>
    ),
    info: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  };
  return icons[name] || null;
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  );
}

export default function App() {
  const [page, setPage]             = useState('dashboard');
  const [theme, setTheme]           = useState(() => localStorage.getItem('theme') || 'light');
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Compute active alert count from live data
  useEffect(() => {
    async function fetchAlertCount() {
      try {
        const { data: vehicles } = await getVehicles();
        let count = 0;
        for (const v of vehicles) {
          try {
            const { data: r } = await getLatestReading(v.vehicleId);
            const minutesAgo = (Date.now() - new Date(r.timestamp).getTime()) / 60000;
            if (r.engineTemp > 100) count++;
            if (r.speed > 100) count++;
            if (minutesAgo > 15) count++;
          } catch { /* skip */ }
        }
        setAlertCount(count);
      } catch { /* skip */ }
    }
    fetchAlertCount();
  }, []);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  const NAV = [
    {
      section: 'MONITOR',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
        { id: 'alerts',    label: 'Alerts',    icon: 'alert', badge: alertCount || null },
      ],
    },
    {
      section: 'ANALYSE',
      items: [
        { id: 'analytics', label: 'Analytics', icon: 'chart' },
        { id: 'reports',   label: 'Reports',   icon: 'file' },
      ],
    },
    {
      section: 'SYSTEM',
      items: [
        { id: 'about', label: 'About', icon: 'info' },
      ],
    },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-row">
            <Logo size={36} />
            <div>
              <h1>VehicleIQ</h1>
              <p>Fleet Intelligence</p>
            </div>
          </div>
        </div>

        {NAV.map(group => (
          <div className="nav-section" key={group.section}>
            <p className="nav-section-label">{group.section}</p>
            {group.items.map(item => (
              <button key={item.id}
                className={`nav-item${page === item.id ? ' active' : ''}`}
                onClick={() => setPage(item.id)}>
                <NavIcon name={item.icon} />
                {item.label}
                {item.badge != null && <span className="nav-badge">{item.badge}</span>}
              </button>
            ))}
          </div>
        ))}

        <div className="theme-toggle-wrap">
          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === 'light' ? <MoonIcon /> : <SunIcon />}
            {theme === 'light' ? 'Dark mode' : 'Light mode'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        {page === 'dashboard' && <Dashboard />}

        {page === 'alerts' && <AlertsPage />}

        {page === 'analytics' && (
          <div className="placeholder-page">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            <p>Analytics — coming soon</p>
          </div>
        )}

        {page === 'reports' && <ReportsPage />}

        {page === 'about' && <AboutPage />}
      </main>
    </div>
  );
}
