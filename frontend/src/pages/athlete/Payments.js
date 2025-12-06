import React, { useState, useEffect } from 'react';
import { paymentAPI } from '../../services/api';
import './Payments.css';

const AthletePayments = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [subscription, setSubscription] = useState(null);

    useEffect(() => {
        const fetchPayments = async () => {
            try {
                const res = await paymentAPI.getMyPayments();
                const data = res.data || [];
                setPayments(data);

                // Calculate Subscription Status
                let subStatus = { status: 'expired', expiryDate: null, daysLeft: 0 };
                if (data.length > 0) {
                    const latestPayment = data.reduce((latest, current) => {
                        return new Date(current.end_date) > new Date(latest.end_date) ? current : latest;
                    });

                    const expiry = new Date(latestPayment.end_date);
                    const today = new Date();
                    const diffTime = expiry - today;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    subStatus = {
                        status: diffDays >= 0 ? 'active' : 'expired',
                        expiryDate: expiry,
                        daysLeft: diffDays
                    };
                }
                setSubscription(subStatus);

            } catch (error) {
                console.error("Error fetching payments", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPayments();
    }, []);

    if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

    return (
        <div className="athlete-payments-page">
            <h1>Mes Paiements</h1>

            {/* Subscription Status Card */}
            <div className={`status-card ${subscription?.status}`}>
                <div className="status-header">
                    <h2>Statut Abonnement</h2>
                    <span className={`badge ${subscription?.status}`}>
                        {subscription?.status === 'active' ? 'ACTIF' : 'EXPIRÉ'}
                    </span>
                </div>
                <div className="status-body">
                    {subscription?.expiryDate ? (
                        <>
                            <p className="expiry-date">
                                Expire le : <strong>{subscription.expiryDate.toLocaleDateString()}</strong>
                            </p>
                            <p className="days-remaining">
                                {subscription.daysLeft > 0
                                    ? `${subscription.daysLeft} jours restants`
                                    : `Expiré depuis ${Math.abs(subscription.daysLeft)} jours`}
                            </p>
                        </>
                    ) : (
                        <p>Aucun abonnement actif. Veuillez régler votre cotisation auprès de l'administration.</p>
                    )}
                </div>
            </div>

            {/* Payment History */}
            <div className="history-section">
                <h2>Historique des Transactions</h2>
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Montant</th>
                                <th>Période</th>
                                <th>Validité</th>
                                <th>Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.map(p => (
                                <tr key={p.id}>
                                    <td>{new Date(p.payment_date).toLocaleDateString()}</td>
                                    <td className="amount">{p.amount} DA</td>
                                    <td>{p.months_covered} mois</td>
                                    <td>{p.start_date} au {p.end_date}</td>
                                    <td>{p.notes || '-'}</td>
                                </tr>
                            ))}
                            {payments.length === 0 && (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center' }}>Aucun paiement enregistré.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AthletePayments;
