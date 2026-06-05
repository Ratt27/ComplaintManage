import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useHistory } from 'react-router-dom';
import API_BASE_URL from '../config/apiConfig';

const emptyDepartmentForm = { name: '' };
const emptySemesterForm = { semesterNumber: '' };
const emptyTeacherForm = { name: '', departmentId: '', semesters: [], designation: '', email: '' };
const emptyCriteriaForm = { title: '', description: '', isActive: true, sortOrder: 0 };
const emptyAssignmentForm = { teacherId: '', departmentId: '', semester: '' };

const TeacherFeedbackAdmin = () => {
    const history = useHistory();
    const [departments, setDepartments] = useState([]);
    const [semesters, setSemesters] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [criteria, setCriteria] = useState([]);
    const [overview, setOverview] = useState(null);
    const [teacherReport, setTeacherReport] = useState(null);
    const [departmentReport, setDepartmentReport] = useState(null);
    const [semesterReport, setSemesterReport] = useState(null);
    const [activeTeachers, setActiveTeachers] = useState([]);
    const [teacherSearch, setTeacherSearch] = useState('');
    const [assignmentForm, setAssignmentForm] = useState(emptyAssignmentForm);
    const [selectedTeacherId, setSelectedTeacherId] = useState('');
    const [selectedDepartmentReportId, setSelectedDepartmentReportId] = useState('');
    const [selectedSemesterReportNumber, setSelectedSemesterReportNumber] = useState('');
    const [departmentForm, setDepartmentForm] = useState(emptyDepartmentForm);
    const [semesterForm, setSemesterForm] = useState(emptySemesterForm);
    const [teacherForm, setTeacherForm] = useState(emptyTeacherForm);
    const [criteriaForm, setCriteriaForm] = useState(emptyCriteriaForm);
    const [editingIds, setEditingIds] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const authHeaders = {
        Authorization: `Bearer ${localStorage.getItem('token')}`
    };

    const handleAuthError = useCallback((err) => {
        const message = err?.response?.data?.message || '';
        const status = err?.response?.status;
        if (status === 400 || status === 401 || message.toLowerCase().includes('token')) {
            localStorage.removeItem('token');
            setError('Session expired. Please login again.');
            history.push('/login/admin');
            return true;
        }
        return false;
    }, [history]);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        setError('');

        const authHeaders = {
            Authorization: `Bearer ${localStorage.getItem('token')}`
        };

        try {
            const [departmentRes, semesterRes, teacherRes, criteriaRes, overviewRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/teacher-feedback/departments`),
                axios.get(`${API_BASE_URL}/api/teacher-feedback/semesters`),
                axios.get(`${API_BASE_URL}/api/teacher-feedback/teachers`),
                axios.get(`${API_BASE_URL}/api/teacher-feedback/criteria`),
                axios.get(`${API_BASE_URL}/api/teacher-feedback/overview`, { headers: authHeaders })
            ]);

            setDepartments(departmentRes.data || []);
            setSemesters(semesterRes.data || []);
            setTeachers(teacherRes.data || []);
            setCriteria(criteriaRes.data || []);
            setOverview(overviewRes.data || null);
        } catch (err) {
            if (handleAuthError(err)) {
                return;
            }
            setError(err.response?.data?.message || 'Failed to load feedback admin data');
        } finally {
            setLoading(false);
        }
    }, [handleAuthError]);

    const fetchActiveTeachers = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/teachers/active`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });
            setActiveTeachers(res.data || []);
        } catch (err) {
            if (handleAuthError(err)) {
                return;
            }
            setError(err.response?.data?.message || 'Failed to load active teachers');
        }
    }, [handleAuthError]);

    useEffect(() => {
        fetchAll();
        fetchActiveTeachers();
    }, [fetchAll, fetchActiveTeachers]);

    const resetMessages = () => {
        setError('');
        setSuccess('');
    };

    const startEditing = (type, item) => {
        if (type === 'department') {
            setDepartmentForm({ name: item.name });
        }
        if (type === 'semester') {
            setSemesterForm({ semesterNumber: item.semesterNumber });
        }
        if (type === 'teacher') {
            setTeacherForm({
                name: item.name,
                departmentId: item.departmentId?._id || item.departmentId || '',
                semesters: item.semesters || [],
                designation: item.designation || '',
                email: item.email || ''
            });
        }
        if (type === 'criteria') {
            setCriteriaForm({
                title: item.title,
                description: item.description || '',
                isActive: !!item.isActive,
                sortOrder: item.sortOrder || 0
            });
        }

        setEditingIds((current) => ({ ...current, [type]: item._id }));
    };

    const cancelEditing = (type) => {
        setEditingIds((current) => ({ ...current, [type]: '' }));
        if (type === 'department') setDepartmentForm(emptyDepartmentForm);
        if (type === 'semester') setSemesterForm(emptySemesterForm);
        if (type === 'teacher') setTeacherForm(emptyTeacherForm);
        if (type === 'criteria') setCriteriaForm(emptyCriteriaForm);
    };

    const saveDepartment = async (e) => {
        e.preventDefault();
        resetMessages();

        try {
            if (editingIds.department) {
                await axios.put(
                    `${API_BASE_URL}/api/teacher-feedback/departments/${editingIds.department}`,
                    departmentForm,
                    { headers: authHeaders }
                );
            } else {
                await axios.post(`${API_BASE_URL}/api/teacher-feedback/departments`, departmentForm, { headers: authHeaders });
            }

            setDepartmentForm(emptyDepartmentForm);
            cancelEditing('department');
            setSuccess('Department saved successfully');
            fetchAll();
        } catch (err) {
            if (handleAuthError(err)) {
                return;
            }
            setError(err.response?.data?.message || 'Failed to save department');
        }
    };

    const saveSemester = async (e) => {
        e.preventDefault();
        resetMessages();

        try {
            if (editingIds.semester) {
                await axios.put(
                    `${API_BASE_URL}/api/teacher-feedback/semesters/${editingIds.semester}`,
                    semesterForm,
                    { headers: authHeaders }
                );
            } else {
                await axios.post(`${API_BASE_URL}/api/teacher-feedback/semesters`, semesterForm, { headers: authHeaders });
            }

            setSemesterForm(emptySemesterForm);
            cancelEditing('semester');
            setSuccess('Semester saved successfully');
            fetchAll();
        } catch (err) {
            if (handleAuthError(err)) {
                return;
            }
            setError(err.response?.data?.message || 'Failed to save semester');
        }
    };

    const saveTeacher = async (e) => {
        e.preventDefault();
        resetMessages();

        const payload = {
            ...teacherForm,
            semesters: teacherForm.semesters
        };

        try {
            if (editingIds.teacher) {
                await axios.put(
                    `${API_BASE_URL}/api/teacher-feedback/teachers/${editingIds.teacher}`,
                    payload,
                    { headers: authHeaders }
                );
            } else {
                await axios.post(`${API_BASE_URL}/api/teacher-feedback/teachers`, payload, { headers: authHeaders });
            }

            setTeacherForm(emptyTeacherForm);
            cancelEditing('teacher');
            setSuccess('Teacher saved successfully');
            fetchAll();
        } catch (err) {
            if (handleAuthError(err)) {
                return;
            }
            setError(err.response?.data?.message || 'Failed to save teacher');
        }
    };

    const saveCriteria = async (e) => {
        e.preventDefault();
        resetMessages();

        try {
            if (editingIds.criteria) {
                await axios.put(
                    `${API_BASE_URL}/api/teacher-feedback/criteria/${editingIds.criteria}`,
                    criteriaForm,
                    { headers: authHeaders }
                );
            } else {
                await axios.post(`${API_BASE_URL}/api/teacher-feedback/criteria`, criteriaForm, { headers: authHeaders });
            }

            setCriteriaForm(emptyCriteriaForm);
            cancelEditing('criteria');
            setSuccess('Criteria saved successfully');
            fetchAll();
        } catch (err) {
            if (handleAuthError(err)) {
                return;
            }
            setError(err.response?.data?.message || 'Failed to save criteria');
        }
    };

    const assignTeacher = async (e) => {
        e.preventDefault();
        resetMessages();

        try {
            await axios.post(
                `${API_BASE_URL}/api/teacher-assignments`,
                assignmentForm,
                { headers: authHeaders }
            );
            setAssignmentForm(emptyAssignmentForm);
            setSuccess('Teacher assigned successfully');
            fetchAll();
        } catch (err) {
            if (handleAuthError(err)) {
                return;
            }
            setError(err.response?.data?.message || 'Failed to assign teacher');
        }
    };

    const deleteRecord = async (type, id) => {
        if (!window.confirm('Are you sure you want to delete this record?')) {
            return;
        }

        resetMessages();

        const endpointMap = {
            department: 'departments',
            semester: 'semesters',
            teacher: 'teachers',
            criteria: 'criteria'
        };

        try {
            await axios.delete(`${API_BASE_URL}/api/teacher-feedback/${endpointMap[type]}/${id}`, { headers: authHeaders });
            setSuccess('Record deleted successfully');
            fetchAll();
        } catch (err) {
            if (handleAuthError(err)) {
                return;
            }
            setError(err.response?.data?.message || 'Failed to delete record');
        }
    };

    const loadTeacherReport = async () => {
        if (!selectedTeacherId) return;
        try {
            const res = await axios.get(`${API_BASE_URL}/api/teacher-feedback/reports/teacher/${selectedTeacherId}`, {
                headers: authHeaders
            });
            setTeacherReport(res.data);
        } catch (err) {
            if (handleAuthError(err)) {
                return;
            }
            setError(err.response?.data?.message || 'Failed to load teacher report');
        }
    };

    const loadDepartmentReport = async () => {
        if (!selectedDepartmentReportId) return;
        try {
            const res = await axios.get(`${API_BASE_URL}/api/teacher-feedback/reports/department/${selectedDepartmentReportId}`, {
                headers: authHeaders
            });
            setDepartmentReport(res.data);
        } catch (err) {
            if (handleAuthError(err)) {
                return;
            }
            setError(err.response?.data?.message || 'Failed to load department report');
        }
    };

    const loadSemesterReport = async () => {
        if (!selectedSemesterReportNumber) return;
        try {
            const res = await axios.get(`${API_BASE_URL}/api/teacher-feedback/reports/semester/${selectedSemesterReportNumber}`, {
                headers: authHeaders
            });
            setSemesterReport(res.data);
        } catch (err) {
            if (handleAuthError(err)) {
                return;
            }
            setError(err.response?.data?.message || 'Failed to load semester report');
        }
    };

    if (loading) {
        return (
            <div className="container py-5 text-center">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-3">Loading teacher feedback admin...</p>
            </div>
        );
    }

    return (
        <div className="container py-4">
            <div className="d-flex flex-column flex-lg-row justify-content-between gap-3 align-items-lg-end mb-4">
                <div>
                    <h2 className="mb-2" style={{ color: 'var(--primary-blue)' }}>Teacher Feedback Admin</h2>
                    <p className="text-muted mb-0">Manage departments, semesters, teachers, criteria, and analytics from one place.</p>
                </div>
                {overview && (
                    <div className="small text-muted text-lg-end">
                        {overview.counts.departments} departments | {overview.counts.semesters} semesters | {overview.counts.teachers} teachers | {overview.counts.criteria} active criteria
                    </div>
                )}
            </div>

            {error && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            {overview && (
                <div className="row g-3 mb-4">
                    <div className="col-md-3">
                        <div className="card border-0 shadow-sm h-100">
                            <div className="card-body text-center">
                                <h3 className="mb-1">{overview.counts.feedbacks}</h3>
                                <div className="text-muted">Feedback submissions</div>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-9">
                        <div className="card border-0 shadow-sm h-100">
                            <div className="card-body">
                                <h5 className="mb-3">Top Teachers</h5>
                                <div className="table-responsive">
                                    <table className="table table-sm align-middle mb-0">
                                        <thead>
                                            <tr>
                                                <th>Teacher</th>
                                                <th>Average</th>
                                                <th>Feedbacks</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {overview.topTeachers.map((teacher) => (
                                                <tr key={teacher.teacherId}>
                                                    <td>{teacher.name}</td>
                                                    <td>{teacher.averageScore}</td>
                                                    <td>{teacher.totalFeedbacks}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="card shadow-sm border-0 mb-4">
                <div className="card-body">
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-end gap-2 mb-3">
                        <div>
                            <h5 className="mb-1">Teacher Assignment</h5>
                            <p className="text-muted mb-0">Select an active registered teacher, then assign the department and semester.</p>
                        </div>
                        <div className="small text-muted">
                            Duplicate teacher + department + semester assignments are blocked.
                        </div>
                    </div>

                    <form onSubmit={assignTeacher} className="row g-3">
                        <div className="col-md-4">
                            <label className="form-label fw-semibold">Search Teacher</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Type name or email"
                                value={teacherSearch}
                                onChange={(e) => setTeacherSearch(e.target.value)}
                            />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label fw-semibold">Teacher</label>
                            <select
                                className="form-select"
                                value={assignmentForm.teacherId}
                                onChange={(e) => setAssignmentForm({ ...assignmentForm, teacherId: e.target.value })}
                                required
                            >
                                <option value="">Select active teacher</option>
                                {activeTeachers
                                    .filter((teacher) => {
                                        const term = teacherSearch.toLowerCase();
                                        return !term ||
                                            teacher.name?.toLowerCase().includes(term) ||
                                            teacher.email?.toLowerCase().includes(term);
                                    })
                                    .map((teacher) => (
                                        <option key={teacher._id} value={teacher._id}>
                                            {teacher.name} {teacher.email ? `(${teacher.email})` : ''}
                                        </option>
                                    ))}
                            </select>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label fw-semibold">Department</label>
                            <select
                                className="form-select"
                                value={assignmentForm.departmentId}
                                onChange={(e) => setAssignmentForm({ ...assignmentForm, departmentId: e.target.value })}
                                required
                            >
                                <option value="">Select department</option>
                                {departments.map((department) => (
                                    <option key={department._id} value={department._id}>
                                        {department.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-1">
                            <label className="form-label fw-semibold">Semester</label>
                            <select
                                className="form-select"
                                value={assignmentForm.semester}
                                onChange={(e) => setAssignmentForm({ ...assignmentForm, semester: e.target.value })}
                                required
                            >
                                <option value="">-</option>
                                {semesters.map((semester) => (
                                    <option key={semester._id} value={semester.semesterNumber}>
                                        {semester.semesterNumber}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-12 d-flex justify-content-end">
                            <button className="btn btn-primary" type="submit">Assign Teacher</button>
                        </div>
                    </form>
                </div>
            </div>

            <div className="row g-4 mb-4">
                <div className="col-lg-6">
                    <div className="card shadow-sm border-0 h-100">
                        <div className="card-body">
                            <h5 className="mb-3">Departments</h5>
                            <form onSubmit={saveDepartment} className="d-flex gap-2 mb-3">
                                <input
                                    className="form-control"
                                    placeholder="Department name"
                                    value={departmentForm.name}
                                    onChange={(e) => setDepartmentForm({ name: e.target.value })}
                                />
                                <button className="btn btn-primary" type="submit">{editingIds.department ? 'Update' : 'Add'}</button>
                                {editingIds.department && <button type="button" className="btn btn-outline-secondary" onClick={() => cancelEditing('department')}>Cancel</button>}
                            </form>
                            <div className="list-group">
                                {departments.map((department) => (
                                    <div key={department._id} className="list-group-item d-flex justify-content-between align-items-center">
                                        <span>{department.name}</span>
                                        <div className="btn-group btn-group-sm">
                                            <button className="btn btn-outline-primary" onClick={() => startEditing('department', department)}>Edit</button>
                                            <button className="btn btn-outline-danger" onClick={() => deleteRecord('department', department._id)}>Delete</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-lg-6">
                    <div className="card shadow-sm border-0 h-100">
                        <div className="card-body">
                            <h5 className="mb-3">Semesters</h5>
                            <form onSubmit={saveSemester} className="d-flex gap-2 mb-3">
                                <input
                                    type="number"
                                    min="1"
                                    className="form-control"
                                    placeholder="Semester number"
                                    value={semesterForm.semesterNumber}
                                    onChange={(e) => setSemesterForm({ semesterNumber: e.target.value })}
                                />
                                <button className="btn btn-primary" type="submit">{editingIds.semester ? 'Update' : 'Add'}</button>
                                {editingIds.semester && <button type="button" className="btn btn-outline-secondary" onClick={() => cancelEditing('semester')}>Cancel</button>}
                            </form>
                            <div className="list-group">
                                {semesters.map((semester) => (
                                    <div key={semester._id} className="list-group-item d-flex justify-content-between align-items-center">
                                        <span>Semester {semester.semesterNumber}</span>
                                        <div className="btn-group btn-group-sm">
                                            <button className="btn btn-outline-primary" onClick={() => startEditing('semester', semester)}>Edit</button>
                                            <button className="btn btn-outline-danger" onClick={() => deleteRecord('semester', semester._id)}>Delete</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-4 mb-4">
                <div className="col-12">
                    <div className="card shadow-sm border-0">
                        <div className="card-body">
                            <h5 className="mb-3">Teachers</h5>
                            <form onSubmit={saveTeacher} className="row g-2 mb-3">
                                <div className="col-md-2">
                                    <input
                                        className="form-control"
                                        placeholder="Name"
                                        value={teacherForm.name}
                                        onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                                    />
                                </div>
                                <div className="col-md-3">
                                    <select
                                        className="form-select"
                                        value={teacherForm.departmentId}
                                        onChange={(e) => setTeacherForm({ ...teacherForm, departmentId: e.target.value })}
                                    >
                                        <option value="">Select department</option>
                                        {departments.map((department) => (
                                            <option key={department._id} value={department._id}>{department.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-md-2">
                                    <div className="border rounded-3 p-2 bg-light">
                                        <div className="small fw-semibold mb-2">Semesters</div>
                                        {semesters.length === 0 ? (
                                            <div className="small text-muted">Create a semester first.</div>
                                        ) : (
                                            <div className="d-flex flex-wrap gap-2">
                                                {semesters.map((semester) => {
                                                    const semesterValue = semester.semesterNumber;
                                                    const isChecked = teacherForm.semesters.includes(semesterValue);

                                                    return (
                                                        <label key={semester._id} className="form-check form-check-inline mb-0">
                                                            <input
                                                                type="checkbox"
                                                                className="form-check-input me-1"
                                                                checked={isChecked}
                                                                onChange={(e) => {
                                                                    const nextSemesters = e.target.checked
                                                                        ? [...teacherForm.semesters, semesterValue]
                                                                        : teacherForm.semesters.filter((value) => value !== semesterValue);

                                                                    setTeacherForm({ ...teacherForm, semesters: nextSemesters });
                                                                }}
                                                            />
                                                            <span className="form-check-label">Semester {semesterValue}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="col-md-2">
                                    <input
                                        className="form-control"
                                        placeholder="Designation"
                                        value={teacherForm.designation}
                                        onChange={(e) => setTeacherForm({ ...teacherForm, designation: e.target.value })}
                                    />
                                </div>
                                <div className="col-md-2">
                                    <input
                                        className="form-control"
                                        placeholder="Email (optional)"
                                        value={teacherForm.email}
                                        onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                                    />
                                </div>
                                <div className="col-md-1 d-grid">
                                    <button className="btn btn-primary" type="submit">{editingIds.teacher ? 'Update' : 'Add'}</button>
                                </div>
                                {editingIds.teacher && (
                                    <div className="col-12">
                                        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => cancelEditing('teacher')}>Cancel editing</button>
                                    </div>
                                )}
                            </form>

                            <div className="table-responsive">
                                <table className="table table-bordered align-middle">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Department</th>
                                            <th>Semesters</th>
                                            <th>Designation</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {teachers.map((teacher) => (
                                            <tr key={teacher._id}>
                                                <td>{teacher.name}</td>
                                                <td>{teacher.departmentId?.name || 'N/A'}</td>
                                                <td>{(teacher.semesters || []).join(', ')}</td>
                                                <td>{teacher.designation || '-'}</td>
                                                <td>
                                                    <div className="btn-group btn-group-sm">
                                                        <button className="btn btn-outline-primary" onClick={() => startEditing('teacher', teacher)}>Edit</button>
                                                        <button className="btn btn-outline-danger" onClick={() => deleteRecord('teacher', teacher._id)}>Delete</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-4 mb-4">
                <div className="col-lg-6">
                    <div className="card shadow-sm border-0 h-100">
                        <div className="card-body">
                            <h5 className="mb-3">Feedback Criteria</h5>
                            <form onSubmit={saveCriteria} className="row g-2 mb-3">
                                <div className="col-md-4">
                                    <input
                                        className="form-control"
                                        placeholder="Title"
                                        value={criteriaForm.title}
                                        onChange={(e) => setCriteriaForm({ ...criteriaForm, title: e.target.value })}
                                    />
                                </div>
                                <div className="col-md-4">
                                    <input
                                        className="form-control"
                                        placeholder="Description"
                                        value={criteriaForm.description}
                                        onChange={(e) => setCriteriaForm({ ...criteriaForm, description: e.target.value })}
                                    />
                                </div>
                                <div className="col-md-2">
                                    <input
                                        type="number"
                                        className="form-control"
                                        placeholder="Sort"
                                        value={criteriaForm.sortOrder}
                                        onChange={(e) => setCriteriaForm({ ...criteriaForm, sortOrder: e.target.value })}
                                    />
                                </div>
                                <div className="col-md-2 d-grid">
                                    <button className="btn btn-primary" type="submit">{editingIds.criteria ? 'Update' : 'Add'}</button>
                                </div>
                                <div className="col-12">
                                    <label className="form-check-label">
                                        <input
                                            type="checkbox"
                                            className="form-check-input me-2"
                                            checked={criteriaForm.isActive}
                                            onChange={(e) => setCriteriaForm({ ...criteriaForm, isActive: e.target.checked })}
                                        />
                                        Active
                                    </label>
                                </div>
                                {editingIds.criteria && (
                                    <div className="col-12">
                                        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => cancelEditing('criteria')}>Cancel editing</button>
                                    </div>
                                )}
                            </form>

                            <div className="list-group">
                                {criteria.map((item) => (
                                    <div key={item._id} className="list-group-item d-flex justify-content-between align-items-center">
                                        <div>
                                            <div className="fw-semibold">{item.title}</div>
                                            <div className="small text-muted">{item.description || 'No description'}</div>
                                        </div>
                                        <div className="btn-group btn-group-sm">
                                            <button className="btn btn-outline-primary" onClick={() => startEditing('criteria', item)}>Edit</button>
                                            <button className="btn btn-outline-danger" onClick={() => deleteRecord('criteria', item._id)}>Delete</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-lg-6">
                    <div className="card shadow-sm border-0 h-100">
                        <div className="card-body">
                            <h5 className="mb-3">Reports</h5>
                            <div className="mb-3">
                                <label className="form-label fw-semibold">Teacher report</label>
                                <div className="d-flex gap-2">
                                    <select className="form-select" value={selectedTeacherId} onChange={(e) => setSelectedTeacherId(e.target.value)}>
                                        <option value="">Select teacher</option>
                                        {teachers.map((teacher) => (
                                            <option key={teacher._id} value={teacher._id}>{teacher.name}</option>
                                        ))}
                                    </select>
                                    <button className="btn btn-outline-primary" onClick={loadTeacherReport}>Load</button>
                                </div>
                            </div>
                            {teacherReport && (
                                <div className="border rounded-3 p-3 mb-3 bg-light">
                                    <div className="fw-semibold mb-1">{teacherReport.teacher.name}</div>
                                    <div className="small text-muted mb-2">Overall average: {Number(teacherReport.overallAverage).toFixed(2)} | Feedbacks: {teacherReport.totalFeedbacks}</div>
                                    {teacherReport.criteria.map((item) => (
                                        <div key={item.criteriaId} className="mb-2">
                                            <div className="d-flex justify-content-between small">
                                                <span>{item.title}</span>
                                                <span>{item.averageScore}</span>
                                            </div>
                                            <div className="progress" style={{ height: 8 }}>
                                                <div className="progress-bar" style={{ width: `${(item.averageScore / 5) * 100}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="mb-3">
                                <label className="form-label fw-semibold">Department report</label>
                                <div className="d-flex gap-2">
                                    <select className="form-select" value={selectedDepartmentReportId} onChange={(e) => setSelectedDepartmentReportId(e.target.value)}>
                                        <option value="">Select department</option>
                                        {departments.map((department) => (
                                            <option key={department._id} value={department._id}>{department.name}</option>
                                        ))}
                                    </select>
                                    <button className="btn btn-outline-primary" onClick={loadDepartmentReport}>Load</button>
                                </div>
                            </div>
                            {departmentReport && (
                                <div className="border rounded-3 p-3 mb-3 bg-light">
                                    <div className="fw-semibold mb-1">{departmentReport.department.name}</div>
                                    <div className="small text-muted mb-2">Overall average: {Number(departmentReport.overallAverage).toFixed(2)}</div>
                                    <div className="small mb-2">Highest rated: {departmentReport.highestRatedTeacher?.name || 'N/A'}</div>
                                    {departmentReport.teacherAverages.map((teacher) => (
                                        <div key={teacher.teacherId} className="d-flex justify-content-between small mb-1">
                                            <span>{teacher.name}</span>
                                            <span>{teacher.averageScore}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div>
                                <label className="form-label fw-semibold">Semester report</label>
                                <div className="d-flex gap-2">
                                    <select className="form-select" value={selectedSemesterReportNumber} onChange={(e) => setSelectedSemesterReportNumber(e.target.value)}>
                                        <option value="">Select semester</option>
                                        {semesters.map((semester) => (
                                            <option key={semester._id} value={semester.semesterNumber}>Semester {semester.semesterNumber}</option>
                                        ))}
                                    </select>
                                    <button className="btn btn-outline-primary" onClick={loadSemesterReport}>Load</button>
                                </div>
                            </div>
                            {semesterReport && (
                                <div className="border rounded-3 p-3 mt-3 bg-light">
                                    <div className="fw-semibold mb-1">Semester {semesterReport.semester}</div>
                                    <div className="small text-muted mb-2">Overall average: {Number(semesterReport.overallAverage).toFixed(2)}</div>
                                    {semesterReport.teacherRankings.map((teacher) => (
                                        <div key={teacher.teacherId} className="d-flex justify-content-between small mb-1">
                                            <span>{teacher.rank}. {teacher.name}</span>
                                            <span>{teacher.averageScore}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeacherFeedbackAdmin;