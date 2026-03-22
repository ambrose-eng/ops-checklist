// src/pages/RoleSelect.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ROLES } from '../seedData';

export default function RoleSelect() {
  const { loginRole, loginAdmin } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPw, setAdminPw] = useState('');
  const [adminError, setAdminError] = useState('');

  function handleRoleClick(role) {
    setSelected(role);
    setPassword('');
    setError('');
  }

  function handleLogin(e) {
    e.preventDefault();
    const result = loginRole(selected.id, password);
    if (result.success) {
      navigate('/name');
    } else {
      setError(result.error);
    }
  }

  function handleAdminLogin(e) {
    e.preventDefault();
    const result = loginAdmin(adminPw);
    if (result.success) {
      navigate('/admin');
    } else {
      setAdminError(result.error);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.logo}>⚙️</div>
        <h1 style={styles.title}>Operations Checklist</h1>
        <p style={styles.subtitle}>Select your role to begin</p>
      </div>

      <div style={styles.grid}>
        {ROLES.map(role => (
          <button
            key={role.id}
            style={{ ...styles.roleBtn, borderColor: role.color, backgroundColor: selected?.id === role.id ? role.color : 'white', color: selected?.id === role.id ? 'white' : '#1e293b' }}
            onClick={() => handleRoleClick(role)}
          >
            <span style={styles.roleDot({ color: role.color, selected: selected?.id === role.id })} />
            {role.name}
          </button>
        ))}
      </div>

      {selected && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={{ ...styles.modalHeader, backgroundColor: selected.color }}>
              <h2 style={styles.modalTitle}>{selected.name}</h2>
              <button style={styles.closeBtn} onClick={() => setSelected(null)}>✕</button>
            </div>
            <form onSubmit={handleLogin} style={styles.form}>
              <label style={styles.label}>Enter Password</label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                style={styles.input}
                placeholder="Role password"
                autoFocus
              />
              {error && <p style={styles.error}>{error}</p>}
              <button type="submit" style={{ ...styles.submitBtn, backgroundColor: selected.color }}>
                Continue →
              </button>
            </form>
          </div>
        </div>
      )}

      <button style={styles.adminLink} onClick={() => setShowAdminModal(true)}>
        🔐 Admin Dashboard
      </button>

      {showAdminModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={{ ...styles.modalHeader, backgroundColor: '#1e293b' }}>
              <h2 style={styles.modalTitle}>Admin Access</h2>
              <button style={styles.closeBtn} onClick={() => setShowAdminModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAdminLogin} style={styles.form}>
              <label style={styles.label}>Admin Password</label>
              <input
                type="password"
                value={adminPw}
                onChange={e => { setAdminPw(e.target.value); setAdminError(''); }}
                style={styles.input}
                placeholder="Admin password"
                autoFocus
              />
              {adminError && <p style={styles.error}>{adminError}</p>}
              <button type="submit" style={{ ...styles.submitBtn, backgroundColor: '#1e293b' }}>
                Access Dashboard →
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f1f5f9',
    padding: '20px 16px 80px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  header: {
    textAlign: 'center',
    marginBottom: 28,
    paddingTop: 20,
  },
  logo: { fontSize: 48, marginBottom: 8 },
  title: { fontSize: 26, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' },
  subtitle: { fontSize: 15, color: '#64748b', margin: 0 },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: 12,
    maxWidth: 600,
    margin: '0 auto',
  },
  roleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '16px 14px',
    border: '2.5px solid',
    borderRadius: 14,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    textAlign: 'left',
    background: 'white',
  },
  roleDot: ({ color, selected }) => ({
    width: 10,
    height: 10,
    borderRadius: '50%',
    backgroundColor: selected ? 'white' : color,
    flexShrink: 0,
  }),
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 16,
  },
  modal: {
    background: 'white',
    borderRadius: 20,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 380,
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '18px 20px',
    color: 'white',
  },
  modalTitle: { margin: 0, fontSize: 20, fontWeight: 700 },
  closeBtn: {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    color: 'white',
    borderRadius: 8,
    padding: '4px 10px',
    cursor: 'pointer',
    fontSize: 16,
  },
  form: { padding: '24px 20px' },
  label: { display: 'block', fontWeight: 600, color: '#374151', marginBottom: 8, fontSize: 14 },
  input: {
    width: '100%',
    padding: '14px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: 12,
    fontSize: 16,
    boxSizing: 'border-box',
    outline: 'none',
    marginBottom: 6,
  },
  error: { color: '#ef4444', fontSize: 13, margin: '4px 0 10px', fontWeight: 500 },
  submitBtn: {
    width: '100%',
    padding: '15px',
    border: 'none',
    borderRadius: 12,
    color: 'white',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 12,
  },
  adminLink: {
    display: 'block',
    margin: '32px auto 0',
    background: 'none',
    border: '2px solid #cbd5e1',
    padding: '12px 24px',
    borderRadius: 12,
    color: '#64748b',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
};
