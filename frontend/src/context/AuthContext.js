import React, { createContext, useState, useEffect, useContext } from 'react';
import { authAPI } from '../services/api';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            if (token) {
                try {
                    // Check if token is expired
                    const decoded = jwtDecode(token);
                    if (decoded.exp * 1000 < Date.now()) {
                        logout();
                    } else {
                        // Fetch fresh user data or just use decoded token
                        // For now, let's try to fetch me
                        try {
                            const response = await authAPI.me();
                            // Merge decoded token info with response if needed
                            setUser({ ...decoded, ...response.data });
                        } catch (err) {
                            console.error("Failed to fetch user profile", err);
                            // If fetch fails but token is valid format, maybe still keep user logged in but with limited info?
                            // Or logout?
                            // logout();
                            setUser(decoded);
                        }
                    }
                } catch (error) {
                    console.error("Invalid token", error);
                    logout();
                }
            }
            setLoading(false);
        };

        initAuth();
    }, [token]);

    const login = async (email, password) => {
        try {
            const response = await authAPI.login({ email, password });
            const { token, user } = response.data;

            localStorage.setItem('token', token);
            setToken(token);
            setUser(user);
            return user;
        } catch (error) {
            throw error;
        }
    };

    const register = async (userData) => {
        try {
            const response = await authAPI.register(userData);
            return response.data;
        } catch (error) {
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    const value = {
        user,
        token,
        login,
        logout,
        register,
        isAuthenticated: !!user,
        loading,
        isAdmin: user?.role === 'admin',
        isCoach: user?.role === 'coach' || user?.role === 'admin',
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
