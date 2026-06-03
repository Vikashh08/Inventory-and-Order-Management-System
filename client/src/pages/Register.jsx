import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, Shield, Loader2, Package } from 'lucide-react';
import api from '../utils/api';

export default function Register({ onViewChange, onLoginSuccess, showToast }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('SELLER');
  const [loading, setLoading] = useState(false);

  const handleGoogleCallback = async (response) => {
    setLoading(true);
    try {
      const data = await api.post('/api/auth/google', { credential: response.credential });
      api.setToken(data.token);
      api.setUser(data.user);
      onLoginSuccess(data.user);
      showToast('Account created and logged in with Google!', 'success');
    } catch (err) {
      showToast(err.message || 'Google Sign-Up failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initGoogle = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: "1027859412936-qrcbbomlisq22thsns8ho2lrt6lhn5mk.apps.googleusercontent.com",
          callback: handleGoogleCallback
        });
        window.google.accounts.id.renderButton(
          document.getElementById("googleSignInDiv"),
          { theme: "outline", size: "large", width: "100%", text: "signup_with" }
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
    if (!name || !email || !password || !confirmPassword || !role) return;

    if (password.length < 6) {
      showToast('Password must be at least 6 characters long.', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/auth/register', { name, email, password, role });
      showToast('Registration successful! Please sign in with your credentials.', 'success');
      onViewChange('login');
    } catch (err) {
      showToast(err.message || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex align-center justify-center animate-fade" style={{ minHeight: '100vh', padding: '24px' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '440px', padding: '40px 32px', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div className="flex justify-center align-center" style={{ margin: '0 auto 16px auto', width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)' }}>
            <Package size={28} color="#fff" />
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '6px', background: 'linear-gradient(90deg, #fff 30%, var(--text-secondary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Create Account
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Sign up to access inventory dashboard</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <div style={{ position: 'relative' }}>
              <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                id="name"
                type="text"
                required
                className="glass-input"
                style={{ paddingLeft: '48px' }}
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

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

          <div className="form-group">
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
            <p style={{ fontSize: '11px', color: password.length >= 6 ? 'var(--success)' : 'var(--text-secondary)', marginTop: '6px' }}>
              Requirement: Minimum 6 characters {password.length >= 6 && '✓'}
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                id="confirmPassword"
                type="password"
                required
                className="glass-input"
                style={{ paddingLeft: '48px' }}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            {confirmPassword && (
              <p style={{ 
                fontSize: '11px', 
                color: password === confirmPassword ? 'var(--success)' : 'var(--danger)', 
                marginTop: '6px' 
              }}>
                {password === confirmPassword ? 'Passwords match ✓' : 'Passwords do not match ✗'}
              </p>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: '28px' }}>
            <label htmlFor="role">Account Role</label>
            <div style={{ position: 'relative' }}>
              <Shield size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
              <select 
                id="role"
                className="glass-input"
                style={{ paddingLeft: '48px', background: '#181b2c', color: '#fff' }}
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={loading}
              >
                <option value="SELLER">Seller / Standard User</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </div>
          </div>

          <button 
            type="submit" 
            className="glass-btn primary" 
            style={{ width: '100%', padding: '14px', borderRadius: '8px', fontSize: '15px' }}
            disabled={loading}
          >
            {loading ? <Loader2 size={18} className="spinner" /> : 'Register Account'}
          </button>
        </form>

        <div id="googleSignInDiv" style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}></div>

        <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Already have an account?{' '}
            <button 
              type="button" 
              onClick={() => onViewChange('login')}
              className="glass-btn" 
              style={{ padding: '0', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
