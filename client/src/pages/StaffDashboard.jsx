import React, { useEffect, useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config/apiConfig';

const statusColors = {
  'pending': 'secondary',
  'in-progress': 'warning',
  'resolved': 'success'
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

const StaffDashboard = () => {
    const [complaints, setComplaints] = useState([]);
    const [selectedComplaint, setSelectedComplaint] = useState(null);
    const [remarks, setRemarks] = useState('');
    const [photo, setPhoto] = useState(null);
    const [updateStatus, setUpdateStatus] = useState('in-progress');
    const [refresh, setRefresh] = useState(false);
    const [stats, setStats] = useState({ total: 0, pending: 0, inProgress: 0, resolved: 0 });
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('date');
    const [loading, setLoading] = useState(true);
    const [userInfo, setUserInfo] = useState(null);
    const [error, setError] = useState(null);
    const [feedbackStatus, setFeedbackStatus] = useState(null);
    const [feedbackStatusLoading, setFeedbackStatusLoading] = useState(false);
    const [feedbackStatusError, setFeedbackStatusError] = useState('');

    const getAuthHeaders = () => ({
        Authorization: `Bearer ${localStorage.getItem('token')}`
    });

    const normalizeComplaint = (complaint) => {
        const assigned = (complaint.assignedTo && typeof complaint.assignedTo === 'object')
            ? complaint.assignedTo
            : complaint.assignedTeacher;
        return {
            ...complaint,
            raisedBy: complaint.raisedBy || complaint.student,
            assignedTo: assigned,
            displayStatus: getDerivedStatus(complaint)
        };
    };

    const fetchAssignedComplaints = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get(`${API_BASE_URL}/api/complaints/assigned`, {
                headers: getAuthHeaders()
            });

            const normalized = (res.data || []).map(normalizeComplaint);
            console.log('[StaffDashboard] assigned complaints fetched:', normalized.length);

            setComplaints(normalized);
            calculateStats(normalized);
        } catch (err) {
            console.error('[StaffDashboard] fetchAssignedComplaints error:', err.response?.data || err.message);
            setError('Failed to fetch assigned complaints');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssignedComplaints();
        fetchProfile();
    }, [refresh]);

    useEffect(() => {
        if (userInfo?._id) {
            fetchFeedbackStatus(userInfo._id);
        }
    }, [userInfo]);

    const fetchProfile = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/auth/profile`, {
                headers: getAuthHeaders()
            });
            setUserInfo(res.data);
        } catch (err) {
            console.error('[StaffDashboard] fetchProfile error:', err.response?.data || err.message);
            setError('Failed to fetch profile');
        }
    };

    const fetchFeedbackStatus = async (teacherId) => {
        if (!teacherId) return;

        setFeedbackStatusLoading(true);
        setFeedbackStatusError('');

        try {
            const res = await axios.get(`${API_BASE_URL}/api/feedback/teacher-status/${teacherId}`, {
                headers: getAuthHeaders()
            });
            setFeedbackStatus(res.data);
        } catch (err) {
            console.error('[StaffDashboard] fetchFeedbackStatus error:', err.response?.data || err.message);
            setFeedbackStatusError(err.response?.data?.message || 'Failed to fetch feedback status');
        } finally {
            setFeedbackStatusLoading(false);
        }
    };

    const calculateStats = (complaintsData) => {
        const stats = {
            total: complaintsData.length,
            pending: complaintsData.filter(c => c.displayStatus === 'pending').length,
            inProgress: complaintsData.filter(c => c.displayStatus === 'in-progress').length,
            resolved: complaintsData.filter(c => c.displayStatus === 'resolved').length
        };
        setStats(stats);
    };

    const handleSelect = (complaint) => {
        setSelectedComplaint(complaint);
        setRemarks('');
        setPhoto(null);
        setUpdateStatus(getDerivedStatus(complaint) === 'resolved' ? 'resolved' : 'in-progress');
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!selectedComplaint) return;
        try {
        const formData = new FormData();
        formData.append('remarks', remarks);
        formData.append('status', updateStatus);
        if (photo) formData.append('photo', photo);
        await submitStaffUpdate(selectedComplaint, formData);
        setSelectedComplaint(null);
        setRefresh(r => !r);
        } catch (error) {
            console.error('Error updating complaint:', error);
        }
    };

    const submitStaffUpdate = async (selectedComplaint, formData) => {
        try {
        await axios.post(`${API_BASE_URL}/api/complaints/${selectedComplaint._id}/staff-update`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    ...getAuthHeaders()
                }
            });
            console.log('[StaffDashboard] staff update submitted for complaint:', selectedComplaint._id);
            fetchAssignedComplaints();
        } catch (err) {
            console.error('[StaffDashboard] submitStaffUpdate error:', err.response?.data || err.message);
            setError('Failed to submit update');
        }
    };

    const filteredAndSortedComplaints = complaints
        .filter(c => {
            const matchesFilter = filter === 'all' || c.displayStatus === filter;
            const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                c.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                c.description.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesFilter && matchesSearch;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'date':
                    return new Date(b.date) - new Date(a.date);
                case 'priority':
                    const priorityOrder = { high: 3, medium: 2, low: 1 };
                    return priorityOrder[b.priority] - priorityOrder[a.priority];
                case 'title':
                    return a.title.localeCompare(b.title);
                default:
                    return 0;
            }
        });

    if (loading) {
        return (
            <div className="container py-5 text-center">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-3">Loading your dashboard...</p>
            </div>
        );
    }

    return (
        <div className="container py-4">
            {/* Header Section */}
            <div className="row mb-4">
                <div className="col-md-8">
                    <h2 className="mb-2" style={{ color: 'var(--primary-blue)' }}>
                        <i className="fas fa-tasks me-2"></i>Staff Dashboard
                    </h2>
                    {userInfo && (
                        <p className="text-muted mb-0">
                            Welcome back, <strong>{userInfo.name}</strong> ({userInfo.department})
                        </p>
                    )}
                </div>
                <div className="col-md-4 text-md-end">
                    <div className="d-flex gap-2 justify-content-md-end">
                        {userInfo && (
                            <div className="dropdown">
                                <button className="btn btn-outline-secondary btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown">
                                    <i className="fas fa-user me-1"></i>Profile
                                </button>
                                <ul className="dropdown-menu">
                                    <li><span className="dropdown-item-text"><strong>Name:</strong> {userInfo.name}</span></li>
                                    <li><span className="dropdown-item-text"><strong>Email:</strong> {userInfo.email}</span></li>
                                    <li><span className="dropdown-item-text"><strong>Department:</strong> {userInfo.department}</span></li>
                                    <li><span className="dropdown-item-text"><strong>Role:</strong> {userInfo.role}</span></li>
                                    <li><hr className="dropdown-divider" /></li>
                                    <li><button className="dropdown-item" onClick={() => alert('Profile editing feature coming soon!')}>
                                        <i className="fas fa-edit me-1"></i>Edit Profile
                                    </button></li>
                                </ul>
                            </div>
                        )}
                        <button className="btn btn-outline-primary btn-sm" onClick={() => setRefresh(r => !r)}>
                            <i className="fas fa-sync-alt me-1"></i>Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="row mb-4">
                <div className="col-md-3 mb-3">
                    <div className="card bg-primary text-white h-100">
                        <div className="card-body text-center">
                            <i className="fas fa-clipboard-list mb-2" style={{ fontSize: '2rem' }}></i>
                            <h3 className="mb-1">{stats.total}</h3>
                            <p className="mb-0">Total Assigned</p>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 mb-3">
                    <div className="card bg-secondary text-white h-100">
                        <div className="card-body text-center">
                            <i className="fas fa-clock mb-2" style={{ fontSize: '2rem' }}></i>
                            <h3 className="mb-1">{stats.pending}</h3>
                            <p className="mb-0">Pending</p>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 mb-3">
                    <div className="card bg-warning text-white h-100">
                        <div className="card-body text-center">
                            <i className="fas fa-tools mb-2" style={{ fontSize: '2rem' }}></i>
                            <h3 className="mb-1">{stats.inProgress}</h3>
                            <p className="mb-0">In Progress</p>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 mb-3">
                    <div className="card bg-success text-white h-100">
                        <div className="card-body text-center">
                            <i className="fas fa-check-circle mb-2" style={{ fontSize: '2rem' }}></i>
                            <h3 className="mb-1">{stats.resolved}</h3>
                            <p className="mb-0">Resolved</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card shadow-sm border-0 mb-4">
                <div className="card-body">
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3">
                        <div>
                            <h4 className="mb-1" style={{ color: 'var(--primary-blue)' }}>Feedback Status</h4>
                            <p className="text-muted mb-0">Summary of the teacher feedback you received.</p>
                        </div>
                        {feedbackStatusLoading && <span className="badge bg-info text-dark">Loading</span>}
                    </div>

                    {feedbackStatusError && <div className="alert alert-danger">{feedbackStatusError}</div>}

                    {feedbackStatus ? (
                        <div className="row g-3">
                            <div className="col-md-3">
                                <div className="card bg-primary text-white h-100">
                                    <div className="card-body text-center">
                                        <h3 className="mb-1">{feedbackStatus.totalFeedbacks}</h3>
                                        <p className="mb-0">Total Feedbacks</p>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="card bg-success text-white h-100">
                                    <div className="card-body text-center">
                                        <h3 className="mb-1">{feedbackStatus.overallAverage}</h3>
                                        <p className="mb-0">Overall Average</p>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="table-responsive">
                                    <table className="table table-sm align-middle mb-0">
                                        <thead>
                                            <tr>
                                                <th>Criterion</th>
                                                <th>Avg</th>
                                                <th>Count</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {feedbackStatus.criterionWiseRatings?.map((item) => (
                                                <tr key={item.criteriaId}>
                                                    <td>{item.title}</td>
                                                    <td>{item.averageRating}</td>
                                                    <td>{item.totalRatings}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="card border-0 bg-light h-100">
                                    <div className="card-body">
                                        <h6 className="mb-3">Department-wise Average</h6>
                                        {feedbackStatus.departmentWiseRatings?.map((item) => (
                                            <div key={item.departmentId} className="d-flex justify-content-between mb-2">
                                                <span>{item.departmentName}</span>
                                                <strong>{item.averageRating}</strong>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="card border-0 bg-light h-100">
                                    <div className="card-body">
                                        <h6 className="mb-3">Semester-wise Average</h6>
                                        {feedbackStatus.semesterWiseRatings?.map((item) => (
                                            <div key={item.semester} className="d-flex justify-content-between mb-2">
                                                <span>Semester {item.semester}</span>
                                                <strong>{item.averageRating}</strong>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="alert alert-info mb-0">No feedback status available yet.</div>
                    )}
                </div>
            </div>

            {/* Filters and Search */}
            <div className="row mb-4">
                <div className="col-md-4 mb-3">
                    <label className="form-label">Filter by Status</label>
                    <select className="form-select" value={filter} onChange={e => setFilter(e.target.value)}>
                        <option value="all">All Complaints</option>
                        <option value="pending">Pending</option>
                        <option value="in-progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                    </select>
                </div>
                <div className="col-md-4 mb-3">
                    <label className="form-label">Sort By</label>
                    <select className="form-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                        <option value="date">Date (Newest)</option>
                        <option value="priority">Priority</option>
                        <option value="title">Title</option>
                    </select>
                </div>
                <div className="col-md-4 mb-3">
                    <label className="form-label">Search</label>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Search complaints..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Progress Bar */}
            {stats.total > 0 && (
                <div className="card mb-4">
                    <div className="card-body">
                        <h6 className="card-title mb-3">Work Progress</h6>
                        <div className="progress mb-2" style={{ height: '25px' }}>
                            <div 
                                className="progress-bar bg-success" 
                                style={{ width: `${(stats.resolved / stats.total) * 100}%` }}
                            >
                                {stats.resolved} Resolved
                            </div>
                            <div 
                                className="progress-bar bg-warning" 
                                style={{ width: `${(stats.inProgress / stats.total) * 100}%` }}
                            >
                                {stats.inProgress} In Progress
                            </div>
                            <div 
                                className="progress-bar bg-secondary" 
                                style={{ width: `${(stats.pending / stats.total) * 100}%` }}
                            >
                                {stats.pending} Pending
                            </div>
                        </div>
                        <small className="text-muted">
                            {Math.round((stats.resolved / stats.total) * 100)}% of complaints resolved
                        </small>
                    </div>
                </div>
            )}

            {/* Complaints List */}
            {error && <div className="alert alert-danger">{error}</div>}
            <div className="row">
                {filteredAndSortedComplaints.length === 0 ? (
                    <div className="col-12 text-center py-5">
                        <i className="fas fa-inbox text-muted mb-3" style={{ fontSize: '4rem' }}></i>
                        <h5 className="text-muted">No complaints found</h5>
                        <p className="text-muted">No complaints match your current filters.</p>
                    </div>
                ) : (
                    filteredAndSortedComplaints.map(c => (
                    <div className="col-md-6 col-lg-4 mb-4" key={c._id}>
                        <div className="card shadow-sm h-100">
                                <div className="card-header bg-transparent">
                                    <div className="d-flex justify-content-between align-items-start">
                                        <h6 className="card-title mb-0 text-truncate" style={{ maxWidth: '200px' }}>
                                            {c.title}
                                        </h6>
                                        <span className={`badge bg-${statusColors[c.status]}`}>
                                            {c.displayStatus.replace('-', ' ')}
                                        </span>
                                    </div>
                                </div>
                            <div className="card-body">
                                    <div className="mb-2">
                                        <span className="badge bg-info">{c.category}</span>
                                    </div>
                                    <p className="card-text small text-muted mb-2">
                                        <i className="fas fa-calendar me-1"></i>
                                        {new Date(c.date).toLocaleDateString()}
                                    </p>
                                    <p className="card-text small mb-2">
                                        <strong>Description:</strong> {c.description.length > 100 ? 
                                            c.description.substring(0, 100) + '...' : c.description}
                                    </p>
                                    {c.raisedBy && (
                                        <p className="card-text small mb-2">
                                            <i className="fas fa-user me-1"></i>
                                            <strong>Raised By:</strong> {c.raisedBy.name || c.raisedBy.email || c.raisedBy}
                                        </p>
                                    )}
                                    {c.imageUrl && (
                                        <img src={c.imageUrl} alt="complaint" className="img-fluid rounded mb-2" style={{ maxHeight: '100px' }} />
                                    )}
                                    {c.resolutionNotes && (
                                        <div className="alert alert-info py-2 mb-2 small">
                                            <i className="fas fa-info-circle me-1"></i>
                                            <strong>Admin Notes:</strong> {c.resolutionNotes}
                                        </div>
                                    )}
                                    {c.staffUpdates && c.staffUpdates.length > 0 && (
                                        <div className="mb-2">
                                            <small className="text-muted">
                                                <i className="fas fa-history me-1"></i>
                                                {c.staffUpdates.length} update{c.staffUpdates.length > 1 ? 's' : ''}
                                            </small>
                                        </div>
                                    )}
                                </div>
                                <div className="card-footer bg-transparent">
                                    <button 
                                        className="btn btn-primary btn-sm w-100" 
                                        onClick={() => handleSelect(c)}
                                    >
                                        <i className="fas fa-edit me-1"></i>Update Progress
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Update Modal */}
            {selectedComplaint && (
                <div className="modal show d-block" tabIndex="-1" role="dialog" style={{ background: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content">
                            <div className="modal-header bg-primary text-white">
                                <h5 className="modal-title">
                                    <i className="fas fa-edit me-2"></i>
                                    Update Complaint: {selectedComplaint.title}
                                </h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedComplaint(null)}></button>
                            </div>
                            <form onSubmit={handleUpdate}>
                                <div className="modal-body">
                                    <div className="row">
                                        <div className="col-md-6">
                                            <div className="mb-3">
                                                <label className="form-label fw-bold">Complaint Details</label>
                                                <div className="border rounded p-3 bg-light">
                                                    <p><strong>Title:</strong> {selectedComplaint.title}</p>
                                                    <p><strong>Category:</strong> {selectedComplaint.category}</p>
                                                    <p><strong>Status:</strong> 
                                                        <span className={`badge bg-${statusColors[selectedComplaint.displayStatus]} ms-2`}>
                                                            {selectedComplaint.displayStatus.replace('-', ' ')}
                                                        </span>
                                                    </p>
                                                    <p><strong>Date:</strong> {new Date(selectedComplaint.date).toLocaleString()}</p>
                                                </div>
                                            </div>
                                    <div className="mb-3">
                                                <label className="form-label fw-bold">Description</label>
                                                <div className="border rounded p-3 bg-light">
                                                    {selectedComplaint.description}
                                                </div>
                                    </div>
                                    {selectedComplaint.imageUrl && (
                                        <div className="mb-3">
                                                    <label className="form-label fw-bold">Original Image</label>
                                                    <img src={selectedComplaint.imageUrl} alt="complaint" className="img-fluid rounded d-block" style={{ maxHeight: '200px' }} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="col-md-6">
                                    <div className="mb-3">
                                                <label className="form-label fw-bold">Your Update</label>
                                        <textarea
                                            className="form-control"
                                            value={remarks}
                                            onChange={e => setRemarks(e.target.value)}
                                                    placeholder="Describe the progress made, actions taken, or any updates..."
                                                    rows="4"
                                            required
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-bold">Update Status</label>
                                        <select
                                            className="form-select"
                                            value={updateStatus}
                                            onChange={e => setUpdateStatus(e.target.value)}
                                        >
                                            <option value="in-progress">In Progress</option>
                                            <option value="resolved">Resolved</option>
                                        </select>
                                        <small className="text-muted">Set the final complaint state before submitting the update.</small>
                                    </div>
                                    <div className="mb-3">
                                                <label className="form-label fw-bold">Progress Photo (optional)</label>
                                                <input 
                                                    type="file" 
                                                    className="form-control" 
                                                    accept="image/*" 
                                                    onChange={e => setPhoto(e.target.files[0])} 
                                                />
                                                <small className="text-muted">Upload a photo showing the work progress or completion</small>
                                            </div>
                                            {selectedComplaint.staffUpdates && selectedComplaint.staffUpdates.length > 0 && (
                                                <div className="mb-3">
                                                    <label className="form-label fw-bold">Previous Updates</label>
                                                    <div className="border rounded p-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                                        {selectedComplaint.staffUpdates.map((update, index) => (
                                                            <div key={index} className="mb-2 p-2 bg-light rounded">
                                                                <small className="text-muted">
                                                                    {new Date(update.updatedAt).toLocaleString()}
                                                                </small>
                                                                <p className="mb-1">{update.remarks}</p>
                                                                {update.photoUrl && (
                                                                    <img src={update.photoUrl} alt="progress" className="img-fluid rounded" style={{ maxHeight: '80px' }} />
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="submit" className="btn btn-success">
                                        <i className="fas fa-save me-1"></i>Submit Update
                                    </button>
                                    <button type="button" className="btn btn-secondary" onClick={() => setSelectedComplaint(null)}>
                                        <i className="fas fa-times me-1"></i>Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffDashboard; 