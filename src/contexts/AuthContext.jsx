import { createContext, useContext, useState } from 'react';
import { loginUser, registerUser } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const login = async (email, password) => {
    const { data } = await loginUser({ email, password });
    const userData = {
      token: data.token,
      username: data.username,
      email: data.email,
      expiresAt: data.expiresAt,
      role: data.role
    };
    localStorage.setItem('auth_user', JSON.stringify(userData));
    localStorage.setItem('auth_token', data.token);
    setUser(userData);
    return userData;
  };

const register = async (username, email, password, role = 'Viewer', roleCode = '') => {
  await registerUser({ username, email, password, role, roleCode });
};
  const logout = () => {
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
    setUser(null);
  };

  // Helper functions to check roles easily anywhere in the app
  const isAdmin    = () => user?.role === 'Admin';
  const isOperator = () => user?.role === 'Operator';
  const isViewer   = () => user?.role === 'Viewer';
  const canEdit    = () => user?.role === 'Admin' || user?.role === 'Operator';

  return (
    <AuthContext.Provider value={{
      user,
      login,
      register,
      logout,
      isAdmin,
      isOperator,
      isViewer,
      canEdit
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);