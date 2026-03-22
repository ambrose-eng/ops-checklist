// src/contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { ROLES, ADMIN_PASSWORD } from '../seedData';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentRole, setCurrentRole] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const savedRole = sessionStorage.getItem('ops_role');
    const savedAdmin = sessionStorage.getItem('ops_admin');
    const savedName = sessionStorage.getItem('ops_name');
    if (savedRole) setCurrentRole(JSON.parse(savedRole));
    if (savedAdmin) setIsAdmin(true);
    if (savedName) setUserName(savedName);
  }, []);

  function loginRole(roleId, password) {
    const role = ROLES.find(r => r.id === roleId);
    if (!role) return { success: false, error: 'Role not found' };
    if (role.password !== password) return { success: false, error: 'Incorrect password' };
    setCurrentRole(role);
    sessionStorage.setItem('ops_role', JSON.stringify(role));
    return { success: true };
  }

  function loginAdmin(password) {
    if (password !== ADMIN_PASSWORD) return { success: false, error: 'Incorrect admin password' };
    setIsAdmin(true);
    sessionStorage.setItem('ops_admin', 'true');
    return { success: true };
  }

  function saveUserName(name) {
    setUserName(name);
    sessionStorage.setItem('ops_name', name);
  }

  function logout() {
    setCurrentRole(null);
    setIsAdmin(false);
    setUserName('');
    sessionStorage.removeItem('ops_role');
    sessionStorage.removeItem('ops_admin');
    sessionStorage.removeItem('ops_name');
  }

  return (
    <AuthContext.Provider value={{ currentRole, isAdmin, userName, loginRole, loginAdmin, saveUserName, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
