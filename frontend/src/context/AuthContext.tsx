import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute
} from 'amazon-cognito-identity-js';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'User' | 'Admin';
  loyaltyPoints?: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  confirmOTP: (email: string, code: string) => Promise<void>;
  logout: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  token: string | null;
}

const poolData = {
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || ''
};
const useMockAuth =
  import.meta.env.VITE_AUTH_MODE === 'mock' ||
  import.meta.env.VITE_USE_MOCK_AUTH === 'true' ||
  !poolData.UserPoolId ||
  !poolData.ClientId;
const userPool = useMockAuth ? null : new CognitoUserPool(poolData);
const MOCK_USER_KEY = 'eventPortal.mockUser';
const MOCK_TOKEN_KEY = 'eventPortal.mockToken';

const createMockSession = (email: string, name?: string) => {
  const normalizedEmail = email.trim().toLowerCase();
  const isAdmin = normalizedEmail === 'admin@eventapp.com';
  const username = normalizedEmail.split('@')[0] || 'user';

  return {
    user: {
      id: isAdmin ? 'usr_admin_9999_9999_9999_9999' : `usr_client_${username}`,
      email: normalizedEmail,
      name: name || (isAdmin ? 'Quản trị viên' : username),
      role: isAdmin ? 'Admin' as const : 'User' as const
    },
    token: isAdmin ? 'mock_admin_token' : `mock_user_token_${username}`
  };
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchUserProfile = async (tokenStr: string): Promise<any> => {
    const API_BASE_URL = import.meta.env.VITE_API_ENDPOINT || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
    try {
      const res = await fetch(`${API_BASE_URL}/users/profile`, {
        headers: {
          'Authorization': `Bearer ${tokenStr}`
        }
      });
      const resJson = await res.json();
      if (resJson.success) {
        return resJson.data;
      }
    } catch (err) {
      console.error('Failed to fetch user profile', err);
    }
    return null;
  };

  useEffect(() => {
    const checkUser = async () => {
      if (useMockAuth) {
        const storedUser = localStorage.getItem(MOCK_USER_KEY);
        const storedToken = localStorage.getItem(MOCK_TOKEN_KEY);

        if (storedUser && storedToken) {
          const parsed = JSON.parse(storedUser);
          setUser(parsed);
          setToken(storedToken);
          
          // Refresh details from backend
          void fetchUserProfile(storedToken).then(profile => {
            if (profile) {
              setUser(prev => prev ? { ...prev, loyaltyPoints: profile.loyaltyPoints || 0 } : null);
            }
          });
        }

        setLoading(false);
        return;
      }

      if (!userPool) {
        setLoading(false);
        return;
      }

      const cognitoUser = userPool.getCurrentUser();
      if (cognitoUser) {
        cognitoUser.getSession((err: any, session: any) => {
          if (err) {
            setLoading(false);
            return;
          }
          if (session.isValid()) {
            cognitoUser.getUserAttributes((err, attributes) => {
              if (err) {
                setLoading(false);
                return;
              }
              const emailAttr = attributes?.find(a => a.getName() === 'email')?.getValue() || '';
              const nameAttr = attributes?.find(a => a.getName() === 'name')?.getValue() || 'User';
              
              // Get groups from ID token to determine role
              const idToken = session.getIdToken().getJwtToken();
              const payload = session.getIdToken().payload;
              const groups = payload['cognito:groups'] || [];
              const role = groups.includes('Admin') ? 'Admin' : 'User';

              setUser({
                id: cognitoUser.getUsername(),
                email: emailAttr,
                name: nameAttr,
                role
              });
              setToken(idToken);
              setLoading(false);

              // Load profile for loyalty points
              void fetchUserProfile(idToken).then(profile => {
                if (profile) {
                  setUser(prev => prev ? { ...prev, loyaltyPoints: profile.loyaltyPoints || 0 } : null);
                }
              });
            });
          } else {
            setLoading(false);
          }
        });
      } else {
        setLoading(false);
      }
    };
    
    checkUser();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);

    if (useMockAuth) {
      if (!email.trim() || !password.trim()) {
        setLoading(false);
        throw new Error('Vui lòng nhập email và mật khẩu');
      }

      const { user: mockUser, token: mockToken } = createMockSession(email);
      localStorage.setItem(MOCK_USER_KEY, JSON.stringify(mockUser));
      localStorage.setItem(MOCK_TOKEN_KEY, mockToken);
      setUser(mockUser);
      setToken(mockToken);
      setLoading(false);
      return;
    }

    if (!userPool) {
      setLoading(false);
      throw new Error('Cognito chưa được cấu hình');
    }

    return new Promise<void>((resolve, reject) => {
      const authenticationDetails = new AuthenticationDetails({
        Username: email,
        Password: password
      });

      const cognitoUser = new CognitoUser({
        Username: email,
        Pool: userPool
      });

      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: async (result) => {
          const idToken = result.getIdToken().getJwtToken();
          const payload = result.getIdToken().payload;
          const groups = payload['cognito:groups'] || [];
          const role = groups.includes('Admin') ? 'Admin' : 'User';
          
          const profile = await fetchUserProfile(idToken);
          setUser({
            id: payload.sub,
            email: payload.email,
            name: payload.name || 'User',
            role,
            loyaltyPoints: profile?.loyaltyPoints || 0
          });
          setToken(idToken);
          setLoading(false);
          resolve();
        },
        onFailure: (err) => {
          setLoading(false);
          reject(new Error(err.message || 'Đăng nhập thất bại'));
        }
      });
    });
  };

  const register = async (email: string, password: string, name: string) => {
    setLoading(true);

    if (useMockAuth) {
      if (!email.trim() || !password.trim() || !name.trim()) {
        setLoading(false);
        throw new Error('Vui lòng nhập đầy đủ họ tên, email và mật khẩu');
      }

      // Generate a mock 6-digit OTP code for local simulation
      const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
      localStorage.setItem(`mock_otp_${email.trim().toLowerCase()}`, mockOtp);
      
      console.log(`[Mock Email Service] Gửi mã OTP xác thực đăng ký đến ${email}: ${mockOtp}`);

      setLoading(false);
      return;
    }

    if (!userPool) {
      setLoading(false);
      throw new Error('Cognito chưa được cấu hình');
    }

    return new Promise<void>((resolve, reject) => {
      const attributeList = [
        new CognitoUserAttribute({ Name: 'email', Value: email }),
        new CognitoUserAttribute({ Name: 'name', Value: name })
      ];

      userPool.signUp(email, password, attributeList, [], (err, _result) => {
        setLoading(false);
        if (err) {
          reject(new Error(err.message || 'Đăng ký thất bại'));
          return;
        }
        resolve();
      });
    });
  };

  const confirmOTP = async (email: string, code: string) => {
    setLoading(true);

    if (useMockAuth) {
      if (!code.trim()) {
        setLoading(false);
        throw new Error('Vui lòng nhập mã OTP');
      }

      const savedOtp = localStorage.getItem(`mock_otp_${email.trim().toLowerCase()}`);
      if (savedOtp && code.trim() !== savedOtp) {
        setLoading(false);
        throw new Error('Mã OTP không chính xác. Vui lòng thử lại.');
      }
      
      // Clean up mock OTP after successful verification
      localStorage.removeItem(`mock_otp_${email.trim().toLowerCase()}`);

      const { user: mockUser, token: mockToken } = createMockSession(email);
      localStorage.setItem(MOCK_USER_KEY, JSON.stringify(mockUser));
      localStorage.setItem(MOCK_TOKEN_KEY, mockToken);
      setUser(mockUser);
      setToken(mockToken);
      setLoading(false);
      return;
    }

    if (!userPool) {
      setLoading(false);
      throw new Error('Cognito chưa được cấu hình');
    }

    return new Promise<void>((resolve, reject) => {
      const cognitoUser = new CognitoUser({
        Username: email,
        Pool: userPool
      });

      cognitoUser.confirmRegistration(code, true, (err, _result) => {
        setLoading(false);
        if (err) {
          reject(new Error(err.message || 'Xác nhận OTP thất bại'));
          return;
        }
        resolve();
      });
    });
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    setLoading(true);

    if (useMockAuth) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setLoading(false);
      return;
    }

    if (!userPool) {
      setLoading(false);
      throw new Error('Cognito chưa được cấu hình');
    }

    const cognitoUser = userPool.getCurrentUser();
    if (!cognitoUser) {
      setLoading(false);
      throw new Error('Không tìm thấy người dùng hiện tại.');
    }

    return new Promise<void>((resolve, reject) => {
      cognitoUser.getSession((err: any, session: any) => {
        if (err || !session.isValid()) {
          setLoading(false);
          reject(new Error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.'));
          return;
        }

        cognitoUser.changePassword(currentPassword, newPassword, (err, _result) => {
          setLoading(false);
          if (err) {
            reject(new Error(err.message || 'Thay đổi mật khẩu thất bại.'));
            return;
          }
          resolve();
        });
      });
    });
  };

  const deleteAccount = async () => {
    setLoading(true);

    if (useMockAuth) {
      await new Promise(resolve => setTimeout(resolve, 800));
      localStorage.removeItem(MOCK_USER_KEY);
      localStorage.removeItem(MOCK_TOKEN_KEY);
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }

    if (!userPool) {
      setLoading(false);
      throw new Error('Cognito chưa được cấu hình');
    }

    const cognitoUser = userPool.getCurrentUser();
    if (!cognitoUser) {
      setLoading(false);
      throw new Error('Không tìm thấy người dùng hiện tại.');
    }

    return new Promise<void>((resolve, reject) => {
      cognitoUser.getSession((err: any, session: any) => {
        if (err || !session.isValid()) {
          setLoading(false);
          reject(new Error('Phiên đăng nhập hết hạn.'));
          return;
        }

        cognitoUser.deleteUser((err, _result) => {
          setLoading(false);
          if (err) {
            reject(new Error(err.message || 'Xóa tài khoản thất bại.'));
            return;
          }
          setUser(null);
          setToken(null);
          resolve();
        });
      });
    });
  };

  const refreshUserProfile = async () => {
    if (token) {
      const profile = await fetchUserProfile(token);
      if (profile) {
        setUser(prev => prev ? { ...prev, loyaltyPoints: profile.loyaltyPoints || 0 } : null);
      }
    }
  };

  const logout = () => {
    if (useMockAuth) {
      localStorage.removeItem(MOCK_USER_KEY);
      localStorage.removeItem(MOCK_TOKEN_KEY);
    } else if (userPool) {
      const cognitoUser = userPool.getCurrentUser();
      if (cognitoUser) {
        cognitoUser.signOut();
      }
    }
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      loading, 
      login, 
      register, 
      confirmOTP, 
      logout,
      changePassword,
      deleteAccount,
      refreshUserProfile
    }}>
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
