import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Logo from './Logo';

export default function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');

  const [form, setForm] = useState({
    username: '', email: '', password: '', confirm: '', role: 'Viewer', roleCode: ''
  });
  const [error, setError]     = useState('');
  const [info, setInfo]       = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const switchMode = (m) => {
    setMode(m);
    setError('');
    setInfo('');
    setForm({ username: '', email: '', password: '', confirm: '', role: 'Viewer', roleCode: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (mode === 'register') {
      if (!form.username.trim())        return setError('Username is required.');
      if (!form.email.trim())           return setError('Email is required.');
      if (form.password.length < 6)     return setError('Password must be at least 6 characters.');
      if (form.password !== form.confirm) return setError('Passwords do not match.');
      if ((form.role === 'Operator' || form.role === 'Admin') && !form.roleCode.trim())
        return setError(`Please enter the ${form.role} access code.`);

      setLoading(true);
      try {
        await register(form.username.trim(), form.email.trim(), form.password, form.role, form.roleCode.trim());
        setInfo('Account created! Please sign in.');
        switchMode('login');
      } catch (err) {
        setError(err.response?.data?.message || 'Registration failed. Please try again.');
      } finally {
        setLoading(false);
      }
    } else {
      if (!form.email.trim()) return setError('Email is required.');
      if (!form.password)     return setError('Password is required.');

      setLoading(true);
      try {
        await login(form.email.trim(), form.password);
      } catch (err) {
        setError(err.response?.data?.message || 'Invalid email or password.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="auth-root">
      <div className="auth-card">

        {/* Left panel */}
        <div className="auth-brand">
          <div className="auth-brand-inner">
            <Logo size={52} />
            <h1 className="auth-brand-title">VehicleIQ</h1>
            <p className="auth-brand-sub">Fleet Intelligence Platform</p>
            <ul className="auth-feature-list">
              <li><span className="auth-feature-dot" />Real-time telemetry monitoring</li>
              <li><span className="auth-feature-dot" />Advanced fleet analytics</li>
              <li><span className="auth-feature-dot" />Smart alert management</li>
              <li><span className="auth-feature-dot" />Comprehensive reporting</li>
            </ul>
          </div>
        </div>

        {/* Right panel */}
        <div className="auth-form-panel">
          <div className="auth-form-inner">

            {/* Tab switcher */}
            <div className="auth-tabs">
              <button
                className={`auth-tab${mode === 'login' ? ' active' : ''}`}
                onClick={() => switchMode('login')}>
                Sign In
              </button>
              <button
                className={`auth-tab${mode === 'register' ? ' active' : ''}`}
                onClick={() => switchMode('register')}>
                Create Account
              </button>
            </div>

            <h2 className="auth-form-title">
              {mode === 'login' ? 'Welcome back' : 'Get started'}
            </h2>
            <p className="auth-form-sub">
              {mode === 'login'
                ? 'Sign in to your fleet dashboard'
                : 'Create your VehicleIQ account'}
            </p>

            {info  && <div className="auth-info-banner">{info}</div>}
            {error && <div className="auth-error-banner">{error}</div>}

            <form onSubmit={handleSubmit} className="auth-form" noValidate>

              {mode === 'register' && (
                <div className="form-group">
                  <label className="form-label">Username</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="johndoe"
                    value={form.username}
                    onChange={set('username')}
                    autoComplete="username"
                    autoFocus
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={set('email')}
                  autoComplete="email"
                  autoFocus={mode === 'login'}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  className="form-input"
                  type="password"
                  placeholder={mode === 'register' ? 'Min. 6 characters' : '••••••••'}
                  value={form.password}
                  onChange={set('password')}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
              </div>

              {mode === 'register' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Confirm Password</label>
                    <input
                      className="form-input"
                      type="password"
                      placeholder="Repeat password"
                      value={form.confirm}
                      onChange={set('confirm')}
                      autoComplete="new-password"
                    />
                  </div>

                  {/* Role dropdown */}
                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <select
                      className="form-input"
                      value={form.role}
                      onChange={set('role')}
                    >
                      <option value="Viewer">Viewer </option>
                      <option value="Operator">Operator </option>
                      <option value="Admin">Admin </option>
                    </select>
                  </div>

                  {/* Secret code field — only shows for Operator or Admin */}
                  {(form.role === 'Operator' || form.role === 'Admin') && (
                    <div className="form-group">
                      <label className="form-label">
                        {form.role === 'Admin' ? 'Admin Access Code' : 'Operator Access Code'}
                      </label>
                      <input
                        className="form-input"
                        type="password"
                        placeholder={`Enter ${form.role.toLowerCase()} access code`}
                        value={form.roleCode}
                        onChange={set('roleCode')}
                        autoComplete="off"
                      />
                      <p className="auth-role-hint">
                        {form.role === 'Admin'
                          ? 'Contact your system administrator for the Admin access code.'
                          : 'Contact your system administrator for the Operator access code.'}
                      </p>
                    </div>
                  )}
                </>
              )}

              <button className="auth-submit-btn" type="submit" disabled={loading}>
                {loading
                  ? <span className="auth-spinner" />
                  : mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <p className="auth-switch-hint">
              {mode === 'login'
                ? <>Don&apos;t have an account?{' '}
                    <button className="auth-link" onClick={() => switchMode('register')}>Create one</button></>
                : <>Already have an account?{' '}
                    <button className="auth-link" onClick={() => switchMode('login')}>Sign in</button></>}
            </p>

          </div>
        </div>
      </div>
    </div>
  );
}