import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'User' | 'Admin';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  confirmOTP: (email: string, code: string) => Promise<void>;
  logout: () => void;
  token: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Load persisted auth from localStorage
    const savedUser = localStorage.getItem('event_app_user');
    const savedToken = localStorage.getItem('event_app_token');
    
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      // Simulate network request
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const normalizedEmail = email.trim().toLowerCase();
      
      // Check admin credentials
      if (normalizedEmail === 'admin@eventapp.com') {
        if (password !== 'AdminPass123!') {
          throw new Error('Mật khẩu Admin không chính xác. (Mẹo: AdminPass123!)');
        }
        const adminUser: User = {
          id: 'usr_admin_9999_9999_9999_9999',
          email: 'admin@eventapp.com',
          name: 'Quản Trị Viên',
          role: 'Admin'
        };
        setUser(adminUser);
        setToken('mock_admin_token');
        localStorage.setItem('event_app_user', JSON.stringify(adminUser));
        localStorage.setItem('event_app_token', 'mock_admin_token');
        return;
      }
      
      // Standard users mock DB check
      const usersData = localStorage.getItem('mock_cognito_users');
      const users: any[] = usersData ? JSON.parse(usersData) : [];
      const matched = users.find(u => u.email === normalizedEmail);
      
      if (!matched) {
        throw new Error('Tài khoản không tồn tại. Vui lòng đăng ký trước.');
      }
      if (!matched.confirmed) {
        throw new Error('Tài khoản chưa được xác minh. Vui lòng hoàn thành OTP.');
      }
      if (matched.password !== password) {
        throw new Error('Mật khẩu không chính xác.');
      }
      
      const loggedUser: User = {
        id: matched.id,
        email: matched.email,
        name: matched.name,
        role: 'User'
      };
      const userToken = `mock_user_token_${matched.id}`;
      
      setUser(loggedUser);
      setToken(userToken);
      localStorage.setItem('event_app_user', JSON.stringify(loggedUser));
      localStorage.setItem('event_app_token', userToken);
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const normalizedEmail = email.trim().toLowerCase();
      if (normalizedEmail === 'admin@eventapp.com') {
        throw new Error('Không thể đăng ký tài khoản admin này.');
      }
      
      const usersData = localStorage.getItem('mock_cognito_users');
      const users: any[] = usersData ? JSON.parse(usersData) : [];
      
      if (users.some(u => u.email === normalizedEmail)) {
        throw new Error('Email đã được sử dụng.');
      }
      
      const newUser = {
        id: `usr_${Math.random().toString(36).substring(2, 10)}`,
        email: normalizedEmail,
        password,
        name,
        confirmed: false
      };
      
      users.push(newUser);
      localStorage.setItem('mock_cognito_users', JSON.stringify(users));
      
      // Output OTP to developer console for local mock
      console.log(`%c[MOCK COGNITO] Verification Code for ${normalizedEmail} is: 123456`, 'background: #222; color: #ff9900; padding: 4px; font-weight: bold;');
    } finally {
      setLoading(false);
    }
  };

  const confirmOTP = async (email: string, code: string) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 600));
      
      if (code !== '123456') {
        throw new Error('Mã OTP xác thực không đúng. (Vui lòng dùng mã mock: 123456)');
      }
      
      const normalizedEmail = email.trim().toLowerCase();
      const usersData = localStorage.getItem('mock_cognito_users');
      const users: any[] = usersData ? JSON.parse(usersData) : [];
      const matchedIdx = users.findIndex(u => u.email === normalizedEmail);
      
      if (matchedIdx === -1) {
        throw new Error('Không tìm thấy tài khoản để xác minh.');
      }
      
      users[matchedIdx].confirmed = true;
      localStorage.setItem('mock_cognito_users', JSON.stringify(users));
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('event_app_user');
    localStorage.removeItem('event_app_token');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, confirmOTP, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
