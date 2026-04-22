import Logo from './Logo';

export default function AboutPage() {

  const services = [
    {
      title: 'Live Monitoring',
      desc: 'All vehicles tracked in real-time. Speed, temperature and location refresh every 15 seconds automatically — no manual reload needed.',
      img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=340&fit=crop&auto=format',
      color: '#2563eb',
    },
    {
      title: 'Speed Analytics',
      desc: 'Multi-vehicle speed trend charts plot the last 20 readings per vehicle side by side. Spot overspeed events and patterns instantly.',
      img: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600&h=340&fit=crop&auto=format',
      color: '#7c3aed',
    },
    {
      title: 'Engine Temperature',
      desc: 'Radial arc gauges show live engine temperature per vehicle with colour-coded thresholds — green Normal, amber Warning, red Critical.',
      img: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600&h=340&fit=crop&auto=format',
      color: '#f59e0b',
    },
    {
      title: 'GPS Tracking',
      desc: 'Live latitude and longitude coordinates for every vehicle update with each data refresh, showing the last known position across the Chennai fleet.',
      img: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=600&h=340&fit=crop&auto=format',
      color: '#16a34a',
    },
    {
      title: 'Smart Alerts',
      desc: 'Automatic alerts fire when engine temperature exceeds 100 °C, speed exceeds 100 km/h, or a vehicle goes offline for more than 15 minutes.',
      img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=340&fit=crop&auto=format',
      color: '#dc2626',
    },
    {
      title: 'Detailed Reports',
      desc: 'Generate a Vehicle Summary or Top Speed report with one click and download it as a clean CSV file ready for analysis or presentation.',
      img: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=340&fit=crop&auto=format',
      color: '#6366f1',
    },
  ];

  const highlights = [
    { value: '15s',  label: 'Auto-refresh interval',   color: '#2563eb' },
    { value: '24 h', label: 'Rolling data window',      color: '#7c3aed' },
    { value: '3',    label: 'Vehicles tracked live',    color: '#16a34a' },
    { value: '100%', label: 'Simulated real-time data', color: '#f59e0b' },
  ];

  const stack = [
    'React 19', 'Recharts', 'Vite', 'ASP.NET Core',
    'Entity Framework Core', 'SQL Server', 'Axios',
  ];

  return (
    <div className="about-page">

      {/* ── Hero ── */}
      <div className="about-hero">
        <div className="about-hero-logo">
          <Logo size={80} />
        </div>
        <div className="about-hero-text">
          <h1 className="about-hero-title">VehicleIQ</h1>
          <p className="about-hero-sub">Fleet Intelligence &amp; Telemetry Platform</p>
          <p className="about-hero-tagline">Real‑time fleet intelligence on the move.</p>
          <div className="about-hero-badges">
            <span className="hero-badge hero-badge-live">● Live data</span>
            <span className="hero-badge">Fleet monitoring</span>
            <span className="hero-badge">Chennai simulator</span>
          </div>
        </div>
      </div>

      {/* ── Services ── */}
      <div className="about-section-label">What we provide</div>
      <div className="services-grid">
        {services.map(s => (
          <div key={s.title} className="service-card" style={{ '--sc-clr': s.color }}>

            {/* Photo area */}
            <div className="sc-img-wrap">
              <img src={s.img} alt={s.title} className="sc-img" />
              <div className="sc-img-overlay" />
            </div>

            {/* Text area */}
            <div className="sc-content">
              <div className="sc-color-bar" style={{ background: s.color }} />
              <h4 className="sc-title">{s.title}</h4>
              <p className="sc-desc">{s.desc}</p>
              <span className="sc-readmore" style={{ color: s.color }}>
                 
              </span>
            </div>

          </div>
        ))}
      </div>

      {/* ── Highlights ── */}
      <div className="about-section-label">Platform highlights</div>
      <div className="highlights-grid">
        {highlights.map(h => (
          <div key={h.label} className="highlight-card">
            <span className="hl-value" style={{ color: h.color }}>{h.value}</span>
            <span className="hl-label">{h.label}</span>
          </div>
        ))}
      </div>

      {/* ── Tech stack ── */}
      <div className="about-section-label">Built with</div>
      <div className="stack-row">
        {stack.map(t => (
          <span key={t} className="stack-pill">{t}</span>
        ))}
      </div>

      <p className="about-footer">
        VehicleIQ &mdash; built to demonstrate real-time fleet telemetry &middot; Chennai fleet simulator
      </p>
    </div>
  );
}
