
import React, { useState } from 'react';
import Login from './Login';
import Dashboard from './Dashboard';
import EmployeeDashboard from './EmployeeDashboard';

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('hr_user');

      if (!savedUser) {
        return null;
      }

      return JSON.parse(savedUser);

    } catch (error) {
      console.error(
        'Failed to restore user session:',
        error
      );

      localStorage.removeItem('hr_user');
      localStorage.removeItem('hr_token');

      return null;
    }
  });

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('hr_token');
    localStorage.removeItem('hr_user');

    setUser(null);
  };

  if (!user) {
    return (
      <Login
        onLogin={handleLogin}
      />
    );
  }

  if (user.role === 'employee') {
    return (
      <EmployeeDashboard
        user={user}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <Dashboard
      user={user}
      onLogout={handleLogout}
    />
  );
}

