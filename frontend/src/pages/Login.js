import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login = () => {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || t('auth.error_login'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h2>{t('auth.login_title')}</h2>
                {error && <div className="error-message">{error}</div>}

                <div className="demo-credentials" style={{ background: '#f8f9fa', padding: '10px', borderRadius: '5px', marginBottom: '15px', fontSize: '0.9em', color: '#333' }}>
                    <strong>{t('auth.demo_credentials')}:</strong><br />
                    Admin: chef@admin.com / password123<br />
                    Athlete: chef@athlete.com / password123
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>{t('auth.email')}</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="votre@email.com"
                        />
                    </div>
                    <div className="form-group">
                        <label>{t('auth.password')}</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="********"
                        />
                    </div>
                    <button type="submit" disabled={loading} className="btn-primary">
                        {loading ? t('auth.btn_logging_in') : t('auth.btn_login')}
                    </button>
                </form>
                <div className="login-footer">
                    <p>{t('auth.no_account')} <Link to="/register">{t('auth.link_register')}</Link></p>
                </div>
            </div>
        </div>
    );
};

export default Login;
