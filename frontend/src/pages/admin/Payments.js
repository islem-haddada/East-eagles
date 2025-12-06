import React, { useState, useEffect } from 'react';
import { paymentAPI, athleteAPI } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { useConfirm } from '../../context/ConfirmContext';
import './Payments.css';

const Payments = () => {
    const notify = useNotification();
    const confirm = useConfirm();
    const [payments, setPayments] = useState([]);
    const [athletes, setAthletes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState(null);
    const [formData, setFormData] = useState({
        athlete_id: '',
        amount: 3000,
        months_covered: 1,
        start_date: new Date().toISOString().slice(0, 10),
        notes: ''
    });

    const fetchData = async () => {
        try {
            const [paymentsRes, athletesRes] = await Promise.all([
                paymentAPI.getRecent(),
                athleteAPI.getAll()
            ]);
            setPayments(paymentsRes.data || []);
            setAthletes(athletesRes.data || []);
        } catch (error) {
            console.error("Error fetching data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const resetForm = () => {
        setFormData({
            athlete_id: '',
            amount: 3000,
            months_covered: 1,
            start_date: new Date().toISOString().slice(0, 10),
            notes: ''
        });
        setEditId(null);
        setShowForm(false);
    };

    const handleEdit = (payment) => {
        setFormData({
            athlete_id: payment.athlete_id,
            amount: payment.amount,
            months_covered: payment.months_covered,
            start_date: payment.start_date,
            notes: payment.notes || ''
        });
        setEditId(payment.id);
        setShowForm(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const data = {
                ...formData,
                athlete_id: parseInt(formData.athlete_id),
                amount: parseFloat(formData.amount),
                months_covered: parseInt(formData.months_covered)
            };

            if (editId) {
                await paymentAPI.update(editId, data);
                notify.success('Paiement modifié avec succès');
            } else {
                await paymentAPI.create(data);
                notify.success('Paiement enregistré avec succès');
            }

            resetForm();
            fetchData();
        } catch (error) {
            console.error("Save error:", error);
            notify.error('Erreur lors de l\'enregistrement');
        }
    };

    const handleDelete = async (id) => {
        const confirmed = await confirm(
            'Êtes-vous sûr de vouloir supprimer ce paiement ?',
            {
                title: 'Supprimer le paiement',
                confirmText: 'Supprimer',
                cancelText: 'Annuler',
                type: 'danger'
            }
        );
        if (!confirmed) return;
        try {
            await paymentAPI.delete(id);
            fetchData();
            notify.success('Paiement supprimé');
        } catch (error) {
            console.error("Delete error:", error);
            notify.error('Erreur lors de la suppression');
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    if (loading) return <div>Chargement...</div>;

    return (
        <div className="payments-page">
            <div className="page-header">
                <h1>Gestion des Paiements</h1>
                <button onClick={() => {
                    if (showForm) resetForm();
                    else setShowForm(true);
                }} className="btn-primary">
                    {showForm ? 'Annuler' : 'Enregistrer un Paiement'}
                </button>
            </div>

            {showForm && (
                <div className="payment-form-card">
                    <h3>{editId ? 'Modifier le Paiement' : 'Nouveau Paiement (Espèces)'}</h3>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Athlète</label>
                            <select
                                name="athlete_id"
                                value={formData.athlete_id}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Sélectionner un athlète</option>
                                {athletes.map(a => (
                                    <option key={a.id} value={a.id}>
                                        {a.first_name} {a.last_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Montant (DA)</label>
                                <input
                                    type="number"
                                    name="amount"
                                    value={formData.amount}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Durée (Mois)</label>
                                <select
                                    name="months_covered"
                                    value={formData.months_covered}
                                    onChange={handleChange}
                                >
                                    <option value="1">1 Mois</option>
                                    <option value="2">2 Mois</option>
                                    <option value="3">3 Mois (Trimestre)</option>
                                    <option value="6">6 Mois (Semestre)</option>
                                    <option value="12">12 Mois (Année)</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Date de début</label>
                            <input
                                type="date"
                                name="start_date"
                                value={formData.start_date}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Notes (Optionnel)</label>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleChange}
                                placeholder="Ex: Payé en espèces par le père"
                            />
                        </div>

                        <button type="submit" className="btn-submit">
                            {editId ? 'Modifier' : 'Enregistrer'}
                        </button>
                    </form>
                </div>
            )}

            <div className="payments-list">
                <h3>Paiements Récents</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Athlète</th>
                            <th>Montant</th>
                            <th>Période</th>
                            <th>Validité</th>
                            <th>Notes</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {payments.map(p => (
                            <tr key={p.id}>
                                <td>{new Date(p.payment_date).toLocaleDateString()}</td>
                                <td>{p.athlete_name}</td>
                                <td className="amount">{p.amount} DA</td>
                                <td>{p.months_covered} mois</td>
                                <td>{p.start_date} au {p.end_date}</td>
                                <td>{p.notes}</td>
                                <td>
                                    <div className="action-buttons">
                                        <button onClick={() => handleEdit(p)} className="btn-edit" title="Modifier">✎</button>
                                        <button onClick={() => handleDelete(p.id)} className="btn-delete" title="Supprimer">×</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {payments.length === 0 && (
                            <tr>
                                <td colSpan="7" style={{ textAlign: 'center' }}>Aucun paiement enregistré.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Payments;
