import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useHistory } from 'react-router-dom';
import API_BASE_URL from '../config/apiConfig';

const statusColors = {
    pending: 'secondary',
    'in-progress': 'warning',
    resolved: 'success'
};

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

const MyComplaints = () => {

    const [complaints, setComplaints] = useState([]);
    const [feedbacks, setFeedbacks] = useState([]);
    const [feedbackState, setFeedbackState] = useState({});
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        inProgress: 0,
        resolved: 0
    });

    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('date');
    const [loading, setLoading] = useState(true);
    const [userInfo, setUserInfo] = useState(null);
    const [error, setError] = useState('');

    const history = useHistory();

    const authHeaders = {
        Authorization: `Bearer ${localStorage.getItem('token')}`
    };

    useEffect(() => {
        fetchComplaints();
        fetchFeedbacks();
        fetchProfile();
    }, []);

    const calculateStats = (complaintsData) => {

        const statsData = {
            total: complaintsData.length,
            pending: complaintsData.filter(c => c.displayStatus === 'pending').length,
            inProgress: complaintsData.filter(c => c.displayStatus === 'in-progress').length,
            resolved: complaintsData.filter(c => c.displayStatus === 'resolved').length
        };

        setStats(statsData);
    };

    const fetchComplaints = async () => {

        setLoading(true);

        try {

            const res = await axios.get(
                `${API_BASE_URL}/api/complaints/my`,
                {
                    headers: authHeaders
                }
            );

            const data = res.data.map(c => ({
                ...c,
                date: c.date || c.createdAt,
                displayStatus: getDerivedStatus(c)
            }));

            console.log('Fetched complaints:', data);

            setComplaints(data);

            calculateStats(data);

        } catch (err) {

            console.error(err);

            setError('Failed to fetch complaints');
        }

        setLoading(false);
    };

    const fetchFeedbacks = async () => {

        try {

            const res = await axios.get(
                `${API_BASE_URL}/api/feedback`,
                {
                    headers: authHeaders
                }
            );

            setFeedbacks(res.data);

        } catch (err) {

            console.error(err);

            setError('Failed to fetch feedbacks');
        }
    };

    const fetchProfile = async () => {

        try {

            const res = await axios.get(
                `${API_BASE_URL}/api/auth/profile`,
                {
                    headers: authHeaders
                }
            );

            setUserInfo(res.data);

        } catch (err) {

            console.error(err);

            setError('Failed to fetch profile');
        }
    };

    const handleFeedbackChange = (complaintId, field, value) => {

        setFeedbackState(prev => ({
            ...prev,
            [complaintId]: {
                ...prev[complaintId],
                [field]: value
            }
        }));
    };

    const submitFeedback = async (complaintId, rating, comment) => {

        try {

            await axios.post(
                `${API_BASE_URL}/api/feedback`,
                {
                    complaintId,
                    rating,
                    comment
                },
                {
                    headers: authHeaders
                }
            );

            setFeedbackState(prev => ({
                ...prev,
                [complaintId]: {
                    ...prev[complaintId],
                    submitted: true
                }
            }));

            fetchFeedbacks();

        } catch (err) {

            console.error(err);

            setError('Failed to submit feedback');
        }
    };

    const hasFeedback = (complaintId) => {

        return feedbacks.some(
            f => f.complaintId && f.complaintId._id === complaintId
        );
    };

    const filteredAndSortedComplaints = complaints
        .filter(c => {

            const matchesFilter =
                filter === 'all' || c.displayStatus === filter;

            const matchesSearch =
                c.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.description?.toLowerCase().includes(searchTerm.toLowerCase());

            return matchesFilter && matchesSearch;
        })
        .sort((a, b) => {

            if (sortBy === 'date') {
                return new Date(b.date) - new Date(a.date);
            }

            if (sortBy === 'title') {
                return a.title.localeCompare(b.title);
            }

            return 0;
        });

    if (loading) {

        return (
            <div className="container py-5 text-center">

                <div
                    className="spinner-border text-primary"
                    role="status"
                >
                    <span className="visually-hidden">
                        Loading...
                    </span>
                </div>

                <p className="mt-3">
                    Loading your complaints...
                </p>

            </div>
        );
    }

    return (

        <div className="container py-4">

            <div className="d-flex justify-content-between align-items-center mb-4">

                <div>

                    <h2
                        style={{
                            color: 'var(--primary-blue)'
                        }}
                    >
                        My Complaints
                    </h2>

                    {userInfo && (
                        <p className="text-muted">
                            Welcome, {userInfo.name}
                        </p>
                    )}

                </div>

                <button
                    className="btn btn-primary"
                    onClick={() => history.push('/complaints/new')}
                >
                    New Complaint
                </button>

            </div>

            {error && (
                <div className="alert alert-danger">
                    {error}
                </div>
            )}

            {/* Stats */}

            <div className="row mb-4">

                <div className="col-md-3 mb-3">
                    <div className="card bg-primary text-white">
                        <div className="card-body text-center">
                            <h3>{stats.total}</h3>
                            <p>Total</p>
                        </div>
                    </div>
                </div>

                <div className="col-md-3 mb-3">
                    <div className="card bg-secondary text-white">
                        <div className="card-body text-center">
                            <h3>{stats.pending}</h3>
                            <p>Pending</p>
                        </div>
                    </div>
                </div>

                <div className="col-md-3 mb-3">
                    <div className="card bg-warning text-white">
                        <div className="card-body text-center">
                            <h3>{stats.inProgress}</h3>
                            <p>In Progress</p>
                        </div>
                    </div>
                </div>

                <div className="col-md-3 mb-3">
                    <div className="card bg-success text-white">
                        <div className="card-body text-center">
                            <h3>{stats.resolved}</h3>
                            <p>Resolved</p>
                        </div>
                    </div>
                </div>

            </div>

            {/* Filters */}

            <div className="row mb-4">

                <div className="col-md-4 mb-3">

                    <select
                        className="form-select"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    >
                        <option value="all">
                            All Complaints
                        </option>

                        <option value="pending">
                            Pending
                        </option>

                        <option value="in-progress">
                            In Progress
                        </option>

                        <option value="resolved">
                            Resolved
                        </option>

                    </select>

                </div>

                <div className="col-md-4 mb-3">

                    <select
                        className="form-select"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                    >
                        <option value="date">
                            Date
                        </option>

                        <option value="title">
                            Title
                        </option>

                    </select>

                </div>

                <div className="col-md-4 mb-3">

                    <input
                        type="text"
                        className="form-control"
                        placeholder="Search complaints"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />

                </div>

            </div>

            {/* Complaints */}

            <div className="row">

                {filteredAndSortedComplaints.length === 0 ? (

                    <div className="text-center py-5">

                        <h5>No complaints found</h5>

                    </div>

                ) : (

                    filteredAndSortedComplaints.map(c => (

                        <div
                            className="col-md-6 col-lg-4 mb-4"
                            key={c._id}
                        >

                            <div className="card h-100 shadow-sm">

                                <div className="card-header d-flex justify-content-between">

                                    <h6 className="mb-0">
                                        {c.title}
                                    </h6>

                                    <span
                                        className={`badge bg-${statusColors[c.displayStatus]}`}
                                    >
                                        {c.displayStatus.replace('-', ' ')}
                                    </span>

                                </div>

                                <div className="card-body">

                                    <p>
                                        <strong>Category:</strong> {c.category}
                                    </p>

                                    <p>
                                        <strong>Description:</strong>
                                    </p>

                                    <p className="text-muted">
                                        {c.description}
                                    </p>

                                    <p>
                                        <strong>Date:</strong>{' '}
                                        {new Date(c.date).toLocaleDateString()}
                                    </p>

                                    {c.imageUrl && (

                                        <img
                                            src={c.imageUrl}
                                            alt="complaint"
                                            className="img-fluid rounded mb-3"
                                            style={{ maxHeight: '150px' }}
                                        />

                                    )}

                                    {c.resolutionNotes && (

                                        <div className="alert alert-info">

                                            <strong>
                                                Resolution Notes:
                                            </strong>

                                            <br />

                                            {c.resolutionNotes}

                                        </div>

                                    )}

                                    {c.staffUpdates && c.staffUpdates.length > 0 && (

                                        <div className="mt-3">

                                            <h6 className="mb-2">Staff Updates</h6>

                                            <div className="border rounded p-2 bg-light">

                                                {c.staffUpdates.map((update, index) => (

                                                    <div
                                                        key={index}
                                                        className={`pb-2 mb-2 ${index !== c.staffUpdates.length - 1 ? 'border-bottom' : ''}`}
                                                    >

                                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                                            <small className="text-muted">
                                                                {new Date(update.updatedAt).toLocaleString()}
                                                            </small>
                                                            <small className="text-muted">
                                                                {update.updatedBy?.name || update.updatedBy?.email || 'Staff'}
                                                            </small>
                                                        </div>

                                                        <p className="mb-1">{update.remarks}</p>

                                                        {update.photoUrl && (
                                                            <img
                                                                src={update.photoUrl}
                                                                alt="staff update"
                                                                className="img-fluid rounded"
                                                                style={{ maxHeight: '140px' }}
                                                            />
                                                        )}

                                                    </div>

                                                ))}

                                            </div>

                                        </div>

                                    )}

                                    {/* Feedback */}

                                    {c.displayStatus === 'resolved'
                                        && !hasFeedback(c._id)
                                        && !feedbackState[c._id]?.submitted && (

                                        <div className="mt-3">

                                            <h6>Give Feedback</h6>

                                            <select
                                                className="form-select mb-2"
                                                value={feedbackState[c._id]?.rating || ''}
                                                onChange={(e) =>
                                                    handleFeedbackChange(
                                                        c._id,
                                                        'rating',
                                                        e.target.value
                                                    )
                                                }
                                            >

                                                <option value="">
                                                    Select Rating
                                                </option>

                                                <option value="1">1</option>
                                                <option value="2">2</option>
                                                <option value="3">3</option>
                                                <option value="4">4</option>
                                                <option value="5">5</option>

                                            </select>

                                            <textarea
                                                className="form-control mb-2"
                                                rows="3"
                                                placeholder="Comment"
                                                value={feedbackState[c._id]?.comment || ''}
                                                onChange={(e) =>
                                                    handleFeedbackChange(
                                                        c._id,
                                                        'comment',
                                                        e.target.value
                                                    )
                                                }
                                            />

                                            <button
                                                className="btn btn-success w-100"
                                                onClick={() =>
                                                    submitFeedback(
                                                        c._id,
                                                        feedbackState[c._id]?.rating,
                                                        feedbackState[c._id]?.comment
                                                    )
                                                }
                                            >
                                                Submit Feedback
                                            </button>

                                        </div>

                                    )}

                                    {feedbackState[c._id]?.submitted && (

                                        <div className="alert alert-success mt-3">

                                            Feedback submitted successfully

                                        </div>

                                    )}

                                </div>

                            </div>

                        </div>

                    ))

                )}

            </div>

        </div>
    );
};

export default MyComplaints;