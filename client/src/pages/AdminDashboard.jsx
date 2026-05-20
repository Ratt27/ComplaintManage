import React, { useEffect, useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config/apiConfig';

const statusColors = {
    pending: 'secondary',
    'in-progress': 'warning',
    resolved: 'success'
};

const AdminDashboard = () => {

    const [complaints, setComplaints] = useState({
        pending: [],
        inProgress: [],
        resolved: []
    });

    const [staffList, setStaffList] = useState([]);
    const [search, setSearch] = useState('');
    const [notesEdit, setNotesEdit] = useState({});
    const [statusEdit, setStatusEdit] = useState({});
    const [activeTab, setActiveTab] = useState('pending');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchComplaints();
        fetchStaff();
    }, []);

    const getAuthHeaders = () => ({
        Authorization: `Bearer ${localStorage.getItem('token')}`
    });

    const normalizeComplaint = (complaint) => ({
        ...complaint,
        raisedBy: complaint.raisedBy || complaint.student,
        assignedTo: complaint.assignedTo || complaint.assignedTeacher
    });

    // =========================
    // FETCH COMPLAINTS
    // =========================

    const fetchComplaints = async () => {

        setLoading(true);
        setError('');

        try {

            const res = await axios.get(
                `${API_BASE_URL}/api/complaints`,
                {
                    headers: getAuthHeaders()
                }
            );

            console.log("FULL API RESPONSE:", res.data);

            const complaintsArray = Array.isArray(res.data)
                ? res.data
                : Array.isArray(res.data.complaints)
                    ? res.data.complaints
                    : [
                        ...(res.data.pending || []),
                        ...(res.data.inProgress || []),
                        ...(res.data.resolved || [])
                    ];

            // Group complaints manually
            const grouped = {

                pending: complaintsArray
                    .filter(c => c.status === 'pending')
                    .map(normalizeComplaint),

                inProgress: complaintsArray
                    .filter(c => c.status === 'in-progress')
                    .map(normalizeComplaint),

                resolved: complaintsArray
                    .filter(c => c.status === 'resolved')
                    .map(normalizeComplaint)
            };

            console.log("Grouped complaints:", grouped);

            setComplaints(grouped);

        } catch (err) {

            console.error(
                '[AdminDashboard] failed to fetch complaints:',
                err.response?.data || err.message
            );

            setError('Failed to fetch complaints');

        }

        setLoading(false);
    };

    // =========================
    // FETCH STAFF
    // =========================

    const fetchStaff = async () => {

        try {

            const res = await axios.get(
                `${API_BASE_URL}/api/auth/staff`,
                {
                    headers: getAuthHeaders()
                }
            );

            console.log("Staff fetched:", res.data);

            setStaffList(res.data || []);

        } catch (err) {

            console.error(
                '[AdminDashboard] failed to fetch staff:',
                err.response?.data || err.message
            );

            setStaffList([]);
        }
    };

    // =========================
    // ASSIGN STAFF
    // =========================

    const handleAssign = async (complaintId, staffId) => {

        if (!staffId) {
            alert('Please select a staff member');
            return;
        }

        try {

            await axios.put(
                `${API_BASE_URL}/api/complaints/${complaintId}/assign`,
                { staffId },
                {
                    headers: getAuthHeaders()
                }
            );

            alert('Complaint assigned successfully');

            fetchComplaints();

        } catch (err) {

            console.error(err);

            alert(
                err.response?.data?.message ||
                'Failed to assign complaint'
            );
        }
    };

    // =========================
    // STATUS UPDATE
    // =========================

    const handleStatusChange = (complaintId, status) => {

        setStatusEdit(prev => ({
            ...prev,
            [complaintId]: status
        }));
    };

    const handleNotesChange = (complaintId, notes) => {

        setNotesEdit(prev => ({
            ...prev,
            [complaintId]: notes
        }));
    };

    const handleStatusUpdate = async (complaintId) => {

        try {

            await axios.put(
                `${API_BASE_URL}/api/complaints/${complaintId}/status`,
                {
                    status: statusEdit[complaintId],
                    resolutionNotes: notesEdit[complaintId]
                },
                {
                    headers: getAuthHeaders()
                }
            );

            alert('Complaint updated successfully');

            fetchComplaints();

        } catch (err) {

            console.error(err);

            alert(
                err.response?.data?.message ||
                'Failed to update complaint'
            );
        }
    };

    // =========================
    // FILTERING
    // =========================

    const getFilteredComplaints = (list) => {

        return list.filter(c => {

            const title = c.title || '';
            const status = c.status || '';

            return (
                title.toLowerCase().includes(search.toLowerCase()) ||
                status.toLowerCase().includes(search.toLowerCase())
            );
        });
    };

    const filteredPending = getFilteredComplaints(complaints.pending);

    const filteredInProgress = getFilteredComplaints(complaints.inProgress);

    const filteredResolved = getFilteredComplaints(complaints.resolved);

    // =========================
    // LOADING
    // =========================

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
                    Loading complaints...
                </p>

            </div>
        );
    }

    // =========================
    // TABLE RENDER
    // =========================

    const renderComplaintRows = (list) => (

        list.length > 0 ? (

            list.map(c => (

                <tr key={c._id}>

                    <td>
                        <strong>{c.title}</strong>
                    </td>

                    <td>

                        <span
                            className={`badge bg-${statusColors[c.status] || 'secondary'}`}
                        >
                            {c.status}
                        </span>

                    </td>

                    <td>{c.category}</td>

                    <td>{c.dueInDays || 'N/A'}</td>

                    <td>
                        {c.raisedBy?.email || 'Unknown'}
                    </td>

                    <td>
                        {c.assignedTo?.email || (
                            <span className="text-muted">
                                Unassigned
                            </span>
                        )}
                    </td>

                    <td>

                        <select
                            className="form-select"
                            value={c.assignedTo?._id || ''}
                            onChange={(e) =>
                                handleAssign(
                                    c._id,
                                    e.target.value
                                )
                            }
                        >

                            <option value="">
                                Select Staff
                            </option>

                            {staffList.map(staff => (

                                <option
                                    key={staff._id}
                                    value={staff._id}
                                >

                                    {staff.name || staff.email}

                                </option>
                            ))}

                        </select>

                    </td>

                    <td>

                        <div className="d-flex gap-2">

                            <select
                                className="form-select"
                                value={
                                    statusEdit[c._id] ||
                                    c.status
                                }
                                onChange={(e) =>
                                    handleStatusChange(
                                        c._id,
                                        e.target.value
                                    )
                                }
                            >

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

                            <button
                                className="btn btn-primary btn-sm"
                                onClick={() =>
                                    handleStatusUpdate(c._id)
                                }
                            >
                                Update
                            </button>

                        </div>

                    </td>

                    <td>

                        <input
                            type="text"
                            className="form-control"
                            value={
                                notesEdit[c._id] !== undefined
                                    ? notesEdit[c._id]
                                    : (c.resolutionNotes || '')
                            }
                            onChange={(e) =>
                                handleNotesChange(
                                    c._id,
                                    e.target.value
                                )
                            }
                            placeholder="Add notes"
                        />

                    </td>

                </tr>
            ))

        ) : (

            <tr>

                <td
                    colSpan="9"
                    className="text-center py-4"
                >
                    No complaints found
                </td>

            </tr>
        )
    );

    // =========================
    // MAIN RETURN
    // =========================

    return (

        <div className="container py-4">

            <h2 className="mb-4">
                Admin Complaint Dashboard
            </h2>

            {error && (
                <div className="alert alert-danger">
                    {error}
                </div>
            )}

            <input
                type="text"
                className="form-control mb-4"
                placeholder="Search complaints..."
                value={search}
                onChange={(e) =>
                    setSearch(e.target.value)
                }
            />

            <div className="d-flex gap-3 mb-4">

                <button
                    className={`btn ${
                        activeTab === 'pending'
                            ? 'btn-primary'
                            : 'btn-outline-primary'
                    }`}
                    onClick={() =>
                        setActiveTab('pending')
                    }
                >
                    Pending
                </button>

                <button
                    className={`btn ${
                        activeTab === 'inProgress'
                            ? 'btn-warning'
                            : 'btn-outline-warning'
                    }`}
                    onClick={() =>
                        setActiveTab('inProgress')
                    }
                >
                    In Progress
                </button>

                <button
                    className={`btn ${
                        activeTab === 'resolved'
                            ? 'btn-success'
                            : 'btn-outline-success'
                    }`}
                    onClick={() =>
                        setActiveTab('resolved')
                    }
                >
                    Resolved
                </button>

            </div>

            <div className="table-responsive">

                <table className="table table-bordered table-hover bg-white">

                    <thead className="table-light">

                        <tr>

                            <th>Title</th>
                            <th>Status</th>
                            <th>Category</th>
                            <th>Due In</th>
                            <th>Raised By</th>
                            <th>Assigned To</th>
                            <th>Assign</th>
                            <th>Update Status</th>
                            <th>Notes</th>

                        </tr>

                    </thead>

                    <tbody>

                        {activeTab === 'pending' &&
                            renderComplaintRows(filteredPending)}

                        {activeTab === 'inProgress' &&
                            renderComplaintRows(filteredInProgress)}

                        {activeTab === 'resolved' &&
                            renderComplaintRows(filteredResolved)}

                    </tbody>

                </table>

            </div>

        </div>
    );
};

export default AdminDashboard;