import React, { useState, useEffect } from 'react';
import { Lock, Mail, Loader2, Package } from 'lucide-react';
import api from '../utils/api';

export default function Login({ onViewChange, onLoginSuccess, showToast }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleCallback = async (response) => {
    setLoading(true);
    try {
      const data = await api.post('/api/auth/google', { credential: response.credential });
      api.setToken(data.token);
      api.setUser(data.user);
      onLoginSuccess(data.user);
      showToast('Logged in with Google!', 'success');
    } catch (err) {
      showToast(err.message || 'Google Sign-In failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initGoogle = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
          callback: handleGoogleCallback
        });
        window.google.accounts.id.renderButton(
          document.getElementById("googleSignInDiv"),
          { theme: "outline", size: "large", width: "100%", text: "continue_with" }
        );
      }
    };

    if (window.google) {
      initGoogle();
    } else {
      const checkScript = setInterval(() => {
        if (window.google) {
          initGoogle();
          clearInterval(checkScript);
        }
      }, 500);
      return () => clearInterval(checkScript);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    try {
      const data = await api.post('/api/auth/login', { email, password });
      api.setToken(data.token);
      api.setUser(data.user);
      onLoginSuccess(data.user);
      showToast('Logged in successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (role) => {
    const creds = {
      admin: { email: 'admin@inventory.com', pass: 'password123' },
      seller: { email: 'seller@inventory.com', pass: 'password123' }
    };
    const selected = creds[role];
    setEmail(selected.email);
    setPassword(selected.pass);
  };

  return (
    <div className="flex align-center justify-center animate-fade" style={{ minHeight: '100vh', padding: '24px' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '440px', padding: '40px 32px', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div className="flex justify-center align-center" style={{ margin: '0 auto 16px auto', width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)' }}>
            <Package size={28} color="#fff" />
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '6px', background: 'linear-gradient(90deg, #fff 30%, var(--text-secondary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ApexInventory
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Sign in to manage stock and create quotations</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                id="email"
                type="email"
                required
                className="glass-input"
                style={{ paddingLeft: '48px' }}
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '28px' }}>
            <label htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                id="password"
                type="password"
                required
                className="glass-input"
                style={{ paddingLeft: '48px' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="glass-btn primary" 
            style={{ width: '100%', padding: '14px', borderRadius: '8px', fontSize: '15px' }}
            disabled={loading}
          >
            {loading ? <Loader2 size={18} className="spinner" /> : 'Sign In'}
          </button>
        </form>

        <div id="googleSignInDiv" style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}></div>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Don't have an account?{' '}
            <button 
              type="button" 
              onClick={() => onViewChange('register')}
              className="glass-btn" 
              style={{ padding: '0', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Sign Up
            </button>
          </p>
        </div>

        <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Quick Demo Accounts
          </p>
          <div className="flex gap-16 justify-center">
            <button 
              type="button" 
              onClick={() => handleQuickLogin('admin')} 
              className="glass-btn" 
              style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '20px' }}
              disabled={loading}
            >
              Admin Role
            </button>
            <button 
              type="button" 
              onClick={() => handleQuickLogin('seller')} 
              className="glass-btn" 
              style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '20px' }}
              disabled={loading}
            >
              Seller Role
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
