import React, { createContext, useState, useEffect } from 'react';
import { getCurrentUser, loginUser, logoutUser } from '../api/authApi';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const login = async (username, password) => {
    const data = await loginUser(username, password);
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    await logoutUser();
    setUser(null);
  };

  const fetchUser = async () => {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
