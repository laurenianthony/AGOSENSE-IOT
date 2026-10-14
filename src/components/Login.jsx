import { useState } from 'react';
import { Activity, ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import api from '../api/axios';

export default function Login({ onLoginSuccess, onSwitchToRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      const { data } = await api.post('/v1/login', { email, password });
      const token = data.access_token || data.token;
      if (!token) throw new Error('The server did not return an authentication token.');
      localStorage.setItem('auth_token', token);
      if (data.user?.role) localStorage.setItem('user_role', data.user.role);
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to sign in. Check your email and password.');
    } finally { setBusy(false); }
  };

  return <main className="auth-screen"><div className="auth-glow"/><section className="auth-wrap">
    <a className="auth-brand" href="#home"><span className="brand-mark"><Activity size={21}/></span><span><strong>AGO<span>SENSE</span></strong><small>CALAUAN DRAINAGE NETWORK</small></span></a>
    <div className="auth-card"><div className="auth-heading"><span className="auth-kicker">CONTROL CENTER ACCESS</span><h1>Welcome back</h1><p>Sign in to monitor your drainage network.</p></div>
      {error && <div className="auth-error" role="alert">{error}</div>}
      <form onSubmit={handleSubmit}>
        <label className="field-label" htmlFor="login-email">Email address</label><div className="input-wrap"><Mail size={17}/><input id="login-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required/></div>
        <label className="field-label" htmlFor="login-password">Password</label><div className="input-wrap"><LockKeyhole size={17}/><input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} required/><button type="button" className="reveal-button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div>
        <button className="auth-submit" disabled={busy}>{busy ? 'Signing in…' : <>Sign in to dashboard <ArrowRight size={17}/></>}</button>
      </form><p className="auth-switch">New to AGOSENSE? <button type="button" onClick={onSwitchToRegister}>Create an account</button></p>
    </div><p className="auth-footnote"><span/> Secure municipal monitoring · Calauan, Laguna</p>
  </section></main>;
}
