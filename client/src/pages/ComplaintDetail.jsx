import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import API_BASE_URL from '../config/apiConfig';

const getDerivedStatus = (complaint) => {
    const latestUpdateStatus = complaint.staffUpdates?.length
        ? complaint.staffUpdates[complaint.staffUpdates.length - 1]?.status
        : null;

    if (latestUpdateStatus === 'resolved' || complaint.status === 'resolved') {
        return 'resolved';
    }

    if (latestUpdateStatus === 'in-progress') {
        return 'in-progress';
    }

    return complaint.staffUpdates && complaint.staffUpdates.length > 0
        ? 'in-progress'
        : 'pending';
};

const ComplaintDetail = () => {
    const { id } = useParams();
    const [complaint, setComplaint] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchComplaint = async () => {
            setLoading(true);
            try {
                const res = await axios.get(`${API_BASE_URL}/api/complaints/${id}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                setComplaint({
                    ...res.data,
                    displayStatus: getDerivedStatus(res.data)
                });
                } catch (err) {
                    // set a generic error message for UI
                    setError('Failed to fetch complaint details');
                }
            setLoading(false);
        };
        fetchComplaint();
    }, [id]);

    if (loading) return <div>Loading...</div>;
    if (!complaint) return <div>Complaint not found.</div>;

    return (
        <div>
            <h2>{complaint.title}</h2>
            <p><strong>Status:</strong> {complaint.displayStatus?.replace('-', ' ') || complaint.status}</p>
            <p><strong>Category:</strong> {complaint.category}</p>
            <p><strong>Due In:</strong> {complaint.dueInDays} day(s)</p>
            <p><strong>Description:</strong> {complaint.description}</p>
            {complaint.imageUrl && (
                <div>
                    <img src={complaint.imageUrl} alt="Complaint" style={{ maxWidth: '300px' }} />
                </div>
            )}
            <p><strong>Date:</strong> {new Date(complaint.date).toLocaleString()}</p>
            {complaint.resolutionNotes && (
                <div>
                    <p><strong>Resolution Notes:</strong></p>
                    <p>{complaint.resolutionNotes}</p>
                </div>
            )}
            {complaint.staffUpdates && complaint.staffUpdates.length > 0 && (
                <div style={{ marginTop: '24px' }}>
                    <h3>Staff Updates</h3>
                    {complaint.staffUpdates.map((update, index) => (
                        <div key={index} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                            <p style={{ marginBottom: '4px' }}>
                                <strong>{update.updatedBy?.name || update.updatedBy?.email || 'Staff'}</strong>
                                {' '}• {new Date(update.updatedAt).toLocaleString()}
                            </p>
                            <p style={{ marginBottom: update.photoUrl ? '8px' : 0 }}>{update.remarks}</p>
                            {update.photoUrl && (
                                <img src={update.photoUrl} alt="Staff update" style={{ maxWidth: '300px', display: 'block' }} />
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ComplaintDetail;