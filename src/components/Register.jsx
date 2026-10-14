import { useState } from 'react';
import { Activity, ArrowRight, LockKeyhole, Mail, UserRound } from 'lucide-react';
import api from '../api/axios';

export default function Register({ onRegisterSuccess, onSwitchToLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault(); setError('');
    if (password !== passwordConfirmation) { setError('Your passwords do not match.'); return; }
    setBusy(true);
    try {
      const { data } = await api.post('/v1/register', { name, email, password, password_confirmation: passwordConfirmation });
      const token = data.access_token || data.token;
      if (token) {
        localStorage.setItem('auth_token', token);
        if (data.user?.role) localStorage.setItem('user_role', data.user.role);
        onRegisterSuccess(data.user);
      } else {
        onSwitchToLogin();
      }
    } catch (err) {
      const messages = err.response?.data?.errors;
      setError(messages ? Object.values(messages).flat().join(' ') : err.response?.data?.message || 'Unable to create your account. Please try again.');
    } finally { setBusy(false); }
  };

  return <main className="auth-screen"><div className="auth-glow"/><section className="auth-wrap">
    <a className="auth-brand" href="#home"><span className="brand-mark"><Activity size={21}/></span><span><strong>AGO<span>SENSE</span></strong><small>CALAUAN DRAINAGE NETWORK</small></span></a>
    <div className="auth-card"><div className="auth-heading"><span className="auth-kicker">JOIN THE NETWORK</span><h1>Create your account</h1><p>Set up access to the municipal monitoring center.</p></div>
      {error && <div className="auth-error" role="alert">{error}</div>}
      <form onSubmit={handleSubmit}>
        <label className="field-label" htmlFor="register-name">Full name</label><div className="input-wrap"><UserRound size={17}/><input id="register-name" type="text" autoComplete="name" placeholder="Your name" value={name} onChange={(event) => setName(event.target.value)} required/></div>
        <label className="field-label" htmlFor="register-email">Email address</label><div className="input-wrap"><Mail size={17}/><input id="register-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required/></div>
        <label className="field-label" htmlFor="register-password">Password</label><div className="input-wrap"><LockKeyhole size={17}/><input id="register-password" type="password" autoComplete="new-password" minLength={8} placeholder="At least 8 characters" value={password} onChange={(event) => setPassword(event.target.value)} required/></div>
        <label className="field-label" htmlFor="register-confirm">Confirm password</label><div className="input-wrap"><LockKeyhole size={17}/><input id="register-confirm" type="password" autoComplete="new-password" minLength={8} placeholder="Enter your password again" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} required/></div>
        <button className="auth-submit" disabled={busy}>{busy ? 'Creating account…' : <>Create account <ArrowRight size={17}/></>}</button>
      </form><p className="auth-switch">Already have an account? <button type="button" onClick={onSwitchToLogin}>Sign in</button></p>
    </div><p className="auth-footnote"><span/> Secure municipal monitoring · Calauan, Laguna</p>
  </section></main>;
}
