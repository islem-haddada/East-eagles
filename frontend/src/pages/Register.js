import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css'; // Reuse login styles

const Register = () => {
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'athlete' // Default role
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            return setError('Les mots de passe ne correspondent pas');
        }

        setLoading(true);

        try {
            // Remove confirmPassword before sending
            const { confirmPassword, ...dataToSend } = formData;
            await register(dataToSend);
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.message || 'Erreur lors de l\'inscription');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h2>Inscription East Eagles</h2>
                {error && <div className="error-message">{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Prénom</label>
                        <input
                            type="text"
                            name="first_name"
                            value={formData.first_name}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Nom</label>
                        <input
                            type="text"
                            name="last_name"
                            value={formData.last_name}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Mot de passe</label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Confirmer mot de passe</label>
                        <input
                            type="password"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    {/* Optional: Role selection if needed, or default to athlete */}
                    {/* 
          <div className="form-group">
            <label>Rôle</label>
            <select name="role" value={formData.role} onChange={handleChange}>
              <option value="athlete">Athlète</option>
              <option value="coach">Coach</option>
            </select>
          </div> 
          */}

                    <button type="submit" disabled={loading} className="btn-primary">
                        {loading ? 'Inscription...' : 'S\'inscrire'}
                    </button>
                </form>
                <div className="login-footer">
                    <p>Déjà un compte ? <Link to="/login">Se connecter</Link></p>
                </div>
            </div>
        </div>
    );
};

export default Register;
