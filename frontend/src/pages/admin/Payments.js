import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { paymentAPI, athleteAPI } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { useConfirm } from '../../context/ConfirmContext';
import './Payments.css';

const Payments = () => {
    const { t, i18n } = useTranslation();
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

    const locale = i18n.language === 'ar' ? 'ar-EG' : 'fr-FR';

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
                notify.success(t('common.success'));
            } else {
                await paymentAPI.create(data);
                notify.success(t('common.success'));
            }

            resetForm();
            fetchData();
        } catch (error) {
            console.error("Save error:", error);
            notify.error(t('common.error'));
        }
    };

    const handleDelete = async (id) => {
        const confirmed = await confirm(
            t('admin_payments.confirm_delete'),
            {
                title: t('admin_payments.delete_title'),
                confirmText: t('common.delete'),
                cancelText: t('common.cancel'),
                type: 'danger'
            }
        );
        if (!confirmed) return;
        try {
            await paymentAPI.delete(id);
            fetchData();
            notify.success(t('common.success'));
        } catch (error) {
            console.error("Delete error:", error);
            notify.error(t('common.error'));
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    if (loading) return <div>{t('common.loading')}</div>;

    return (
        <div className="payments-page">
            <div className="page-header">
                <h1>{t('admin_payments.title')}</h1>
                <button onClick={() => {
                    if (showForm) resetForm();
                    else setShowForm(true);
                }} className="btn-primary">
                    {showForm ? t('admin_payments.btn_cancel') || t('common.cancel') : `➕ ${t('admin_payments.btn_record')}`}
                </button>
            </div>

            {showForm && (
                <div className="payment-form-card">
                    <h3>{editId ? `✏️ ${t('admin_payments.title_edit')}` : `💵 ${t('admin_payments.title_new')}`}</h3>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>{t('admin_payments.label_athlete')}</label>
                            <select
                                name="athlete_id"
                                value={formData.athlete_id}
                                onChange={handleChange}
                                required
                            >
                                <option value="">{t('admin_payments.placeholder_select_athlete')}</option>
                                {athletes.map(a => (
                                    <option key={a.id} value={a.id}>
                                        {a.first_name} {a.last_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>{t('admin_payments.label_amount')}</label>
                                <input
                                    type="number"
                                    name="amount"
                                    value={formData.amount}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>{t('admin_payments.label_duration')}</label>
                                <select
                                    name="months_covered"
                                    value={formData.months_covered}
                                    onChange={handleChange}
                                >
                                    <option value="1">1 {t('admin_payments.months')}</option>
                                    <option value="2">2 {t('admin_payments.months')}</option>
                                    <option value="3">3 {t('admin_payments.months')} ({t('admin_payments.quarter')})</option>
                                    <option value="6">6 {t('admin_payments.months')} ({t('admin_payments.semester')})</option>
                                    <option value="12">12 {t('admin_payments.months')} ({t('admin_payments.year')})</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>{t('admin_payments.label_start_date')}</label>
                            <input
                                type="date"
                                name="start_date"
                                value={formData.start_date}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>{t('admin_payments.label_notes')}</label>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleChange}
                                placeholder={t('admin_payments.placeholder_notes')}
                            />
                        </div>

                        <button type="submit" className="btn-submit">
                            {editId ? `💾 ${t('common.save')}` : `💾 ${t('common.save')}`}
                        </button>
                    </form>
                </div>
            )}

            <div className="payments-list">
                <h3>{t('admin_payments.recent_payments')}</h3>
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>{t('admin_payments.th_date')}</th>
                                <th>{t('admin_payments.th_athlete')}</th>
                                <th>{t('admin_payments.th_amount')}</th>
                                <th>{t('admin_payments.th_period')}</th>
                                <th>{t('admin_payments.th_validity')}</th>
                                <th>{t('admin_payments.th_notes')}</th>
                                <th>{t('admin_payments.th_actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.map(p => (
                                <tr key={p.id}>
                                    <td>{new Date(p.payment_date).toLocaleDateString(locale)}</td>
                                    <td>{p.athlete_name}</td>
                                    <td className="amount">{p.amount} DA</td>
                                    <td>{p.months_covered} {t('admin_payments.months')}</td>
                                    <td>{new Date(p.start_date).toLocaleDateString(locale)} - {new Date(p.end_date).toLocaleDateString(locale)}</td>
                                    <td>{p.notes}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button onClick={() => handleEdit(p)} className="btn-edit" title={t('common.edit')}>✎</button>
                                            <button onClick={() => handleDelete(p.id)} className="btn-delete" title={t('common.delete')}>🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {payments.length === 0 && (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center' }}>{t('admin_payments.no_payments')}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Payments;
