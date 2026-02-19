import { useState, useEffect } from 'react';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('dreamspace_token');
      if (token) {
        try {
          const res = await fetch('/api/verify', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem('dreamspace_token');
          }
        } catch (e) {
          localStorage.removeItem('dreamspace_token');
        }
      }
      setIsCheckingAuth(false);
    };
    checkAuth();
  }, []);

  const handleLogin = (token: string) => {
    localStorage.setItem('dreamspace_token', token);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('dreamspace_token');
    setIsAuthenticated(false);
  };

  return { isAuthenticated, isCheckingAuth, handleLogin, handleLogout };
};
