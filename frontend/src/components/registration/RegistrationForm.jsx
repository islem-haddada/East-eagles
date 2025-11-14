import React, { useState } from 'react';
import { memberAPI } from '../../services/api';
import './RegistrationForm.css';

const RegistrationForm = () => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    student_id: '',
    field_of_study: ''
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await memberAPI.create(formData);
      setSuccess(true);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        student_id: '',
        field_of_study: ''
      });
    } catch (err) {
      // Prefer server-provided message when available
      const msg = err && err.message ? err.message : '';
      if (/email/i.test(msg) || msg.includes('duplicate') || msg.includes('409')) {
        setError('Cet email est déjà utilisé. Veuillez en choisir un autre.');
      } else if (msg) {
        // Show server message (trim status prefix if present)
        setError(msg.replace(/^Erreur \d+:\s*/i, ''));
      } else {
        setError('Erreur lors de l\'inscription. Vérifiez votre connexion et réessayez.');
      }
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="success-message">
        <h2>✅ Inscription réussie!</h2>
        <p>Bienvenue dans notre club scientifique!</p>
        <p>Vous recevrez bientôt un email de confirmation.</p>
        <button className="btn btn-primary" onClick={() => setSuccess(false)}>
          Nouvelle inscription
        </button>
      </div>
    );
  }

  return (
    <form className="registration-form" onSubmit={handleSubmit}>
      <h2>Inscription au Club Scientifique</h2>
      
      {error && <div className="error">{error}</div>}
      
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="first_name">Prénom *</label>
          <input
            type="text"
            id="first_name"
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="last_name">Nom *</label>
          <input
            type="text"
            id="last_name"
            name="last_name"
            value={formData.last_name}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="email">Email *</label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="phone">Téléphone</label>
        <input
          type="tel"
          id="phone"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          placeholder="Ex: 0555123456"
        />
      </div>

      <div className="form-group">
        <label htmlFor="student_id">Numéro étudiant</label>
        <input
          type="text"
          id="student_id"
          name="student_id"
          value={formData.student_id}
          onChange={handleChange}
          placeholder="Ex: STU001"
        />
      </div>

      <div className="form-group">
        <label htmlFor="field_of_study">Filière d'études</label>
        <input
          type="text"
          id="field_of_study"
          name="field_of_study"
          value={formData.field_of_study}
          onChange={handleChange}
          placeholder="Ex: Informatique, Mathématiques..."
        />
      </div>

      <button 
        type="submit" 
        className="btn btn-primary" 
        disabled={loading}
      >
        {loading ? 'Inscription en cours...' : 'S\'inscrire'}
      </button>
    </form>
  );
};

export default RegistrationForm;