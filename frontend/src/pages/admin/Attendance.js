import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { trainingAPI, athleteAPI } from '../../services/api';
import './Attendance.css';

const Attendance = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [session, setSession] = useState(null);
    const [athletes, setAthletes] = useState([]);
    const [attendance, setAttendance] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [sessionRes, athletesRes, attendanceRes] = await Promise.all([
                    trainingAPI.getById(id),
                    athleteAPI.getAll(),
                    trainingAPI.getAttendance(id)
                ]);

                setSession(sessionRes.data);

                // Filter only active athletes
                const activeAthletes = athletesRes.data.filter(a => a.status === 'active');
                setAthletes(activeAthletes);

                // Map attendance to object for easier access
                const attendanceMap = {};
                attendanceRes.data.forEach(a => {
                    attendanceMap[a.athlete_id] = {
                        attended: a.attended,
                        notes: a.notes
                    };
                });
                setAttendance(attendanceMap);

            } catch (error) {
                console.error("Error fetching data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    const handleMark = async (athleteId, attended) => {
        try {
            await trainingAPI.markAttendance(id, {
                athlete_id: athleteId,
                attended: attended,
                notes: attendance[athleteId]?.notes || ''
            });

            setAttendance(prev => ({
                ...prev,
                [athleteId]: { ...prev[athleteId], attended }
            }));
        } catch (error) {
            console.error("Error marking attendance", error);
        }
    };

    if (loading) return <div>Chargement...</div>;
    if (!session) return <div>Session non trouvée</div>;

    return (
        <div className="attendance-page">
            <div className="page-header">
                <button onClick={() => navigate('/admin/trainings')} className="btn-back">
                    ← Retour
                </button>
                <h1>Présences : {session.title}</h1>
                <p className="date">
                    {new Date(session.session_date).toLocaleString('fr-FR', {
                        weekday: 'long', day: 'numeric', month: 'long'
                    })}
                </p>
            </div>

            <div className="attendance-list">
                {athletes.map(athlete => {
                    const status = attendance[athlete.athlete_id];
                    const isPresent = status?.attended === true;
                    const isAbsent = status?.attended === false;

                    return (
                        <div key={athlete.id} className={`attendance-card ${isPresent ? 'present' : ''} ${isAbsent ? 'absent' : ''}`}>
                            <div className="athlete-info">
                                <h3>{athlete.first_name} {athlete.last_name}</h3>
                                <p>{athlete.category}</p>
                            </div>
                            <div className="attendance-actions">
                                <button
                                    onClick={() => handleMark(athlete.id, true)}
                                    className={`btn-check ${isPresent ? 'active' : ''}`}
                                >
                                    Présent
                                </button>
                                <button
                                    onClick={() => handleMark(athlete.id, false)}
                                    className={`btn-cross ${isAbsent ? 'active' : ''}`}
                                >
                                    Absent
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Attendance;
