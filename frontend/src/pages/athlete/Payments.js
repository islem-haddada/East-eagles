import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { paymentAPI } from '../../services/api';
import './Payments.css';

const AthletePayments = () => {
    const { t, i18n } = useTranslation();
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

    const locale = i18n.language === 'ar' ? 'ar-EG' : 'fr-FR';

    if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

    return (
        <div className="athlete-payments-page">
            <h1>{t('athlete_payments.title')}</h1>

            {/* Subscription Status Card */}
            <div className={`status-card ${subscription?.status}`}>
                <div className="status-header">
                    <h2>{t('athlete_payments.subscription_status')}</h2>
                    <span className={`badge ${subscription?.status}`}>
                        {subscription?.status === 'active' ? t('athlete_dashboard.active') : t('athlete_dashboard.expired')}
                    </span>
                </div>
                <div className="status-body">
                    {subscription?.expiryDate ? (
                        <>
                            <p className="expiry-date">
                                {t('athlete_payments.expires_on')}: <strong>{subscription.expiryDate.toLocaleDateString(locale)}</strong>
                            </p>
                            <p className="days-remaining">
                                {subscription.daysLeft > 0
                                    ? `${subscription.daysLeft} ${t('athlete_dashboard.days_left')}`
                                    : `${t('athlete_dashboard.expired_since')} ${Math.abs(subscription.daysLeft)} ${t('common.days') || 'jours'}`}
                            </p>
                        </>
                    ) : (
                        <p>{t('athlete_payments.no_active_subscription')}</p>
                    )}
                </div>
            </div>

            {/* Payment History */}
            <div className="history-section">
                <h2>{t('athlete_payments.transaction_history')}</h2>
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>{t('athlete_payments.date')}</th>
                                <th>{t('athlete_payments.amount')}</th>
                                <th>{t('athlete_payments.period')}</th>
                                <th>{t('athlete_payments.validity')}</th>
                                <th>{t('athlete_payments.notes')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.map(p => (
                                <tr key={p.id}>
                                    <td>{new Date(p.payment_date).toLocaleDateString(locale)}</td>
                                    <td className="amount">{p.amount} DA</td>
                                    <td>{p.months_covered} {t('common.months') || 'mois'}</td>
                                    <td>{p.start_date} au {p.end_date}</td>
                                    <td>{p.notes || '-'}</td>
                                </tr>
                            ))}
                            {payments.length === 0 && (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center' }}>{t('athlete_payments.no_payments')}</td>
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
