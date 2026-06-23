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

const poolData = {
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || ''
};
const userPool = new CognitoUserPool(poolData);

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkUser = async () => {
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
        onSuccess: (result) => {
          const idToken = result.getIdToken().getJwtToken();
          const payload = result.getIdToken().payload;
          const groups = payload['cognito:groups'] || [];
          const role = groups.includes('Admin') ? 'Admin' : 'User';
          
          setUser({
            id: payload.sub,
            email: payload.email,
            name: payload.name || 'User',
            role
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

  const logout = () => {
    const cognitoUser = userPool.getCurrentUser();
    if (cognitoUser) {
      cognitoUser.signOut();
    }
    setUser(null);
    setToken(null);
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
