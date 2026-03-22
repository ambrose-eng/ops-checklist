// src/pages/NameEntry.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function NameEntry() {
  const { currentRole, saveUserName, logout } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  if (!currentRole) { navigate('/'); return null; }

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 2) {
      setError('Please enter your full name (at least 2 characters)');
      return;
    }
    saveUserName(trimmed);
    navigate('/checklist');
  }

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <button style={styles.backBtn} onClick={() => { logout(); navigate('/'); }}>← Back</button>
        <div style={{ ...styles.rolePill, backgroundColor: currentRole.color }}>{currentRole.name}</div>
      </div>

      <div style={styles.card}>
        <div style={styles.icon}>👤</div>
        <h1 style={styles.title}>Who are you?</h1>
        <p style={styles.sub}>Your name will be saved with this checklist submission.</p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); setError(''); }}
            style={styles.input}
            placeholder="e.g. John Kamau"
            autoFocus
          />
          {error && <p style={styles.error}>{error}</p>}
          <button
            type="submit"
            style={{ ...styles.btn, backgroundColor: currentRole.color }}
          >
            Start Checklist →
          </button>
        </form>
      </div>

      <div style={styles.info}>
        <p>📅 {new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        <p>⏰ {new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}</p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f1f5f9',
    padding: 16,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 8,
  },
  backBtn: {
    background: 'white',
    border: '2px solid #e2e8f0',
    borderRadius: 10,
    padding: '8px 14px',
    fontSize: 14,
    fontWeight: 600,
    color: '#64748b',
    cursor: 'pointer',
  },
  rolePill: {
    color: 'white',
    padding: '8px 16px',
    borderRadius: 20,
    fontSize: 14,
    fontWeight: 700,
  },
  card: {
    background: 'white',
    borderRadius: 20,
    padding: '36px 24px',
    maxWidth: 440,
    margin: '0 auto',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    textAlign: 'center',
  },
  icon: { fontSize: 56, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: 800, color: '#0f172a', margin: '0 0 10px' },
  sub: { fontSize: 15, color: '#64748b', margin: '0 0 28px' },
  input: {
    width: '100%',
    padding: '16px',
    border: '2px solid #e2e8f0',
    borderRadius: 14,
    fontSize: 18,
    boxSizing: 'border-box',
    textAlign: 'center',
    outline: 'none',
    marginBottom: 8,
  },
  error: { color: '#ef4444', fontSize: 13, margin: '4px 0 12px' },
  btn: {
    width: '100%',
    padding: '17px',
    border: 'none',
    borderRadius: 14,
    color: 'white',
    fontSize: 17,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 12,
  },
  info: {
    maxWidth: 440,
    margin: '24px auto 0',
    background: 'white',
    borderRadius: 14,
    padding: '14px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    color: '#64748b',
    fontSize: 14,
    fontWeight: 500,
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  },
};
