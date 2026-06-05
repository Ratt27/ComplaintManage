import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useHistory } from 'react-router-dom';
import API_BASE_URL from '../config/apiConfig';
import StarRating from '../components/Feedback/StarRating';

const TeacherFeedback = () => {
    const history = useHistory();
    const [departments, setDepartments] = useState([]);
    const [semesters, setSemesters] = useState([]);
    const [criteria, setCriteria] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
    const [selectedSemester, setSelectedSemester] = useState('');
    const [feedbackState, setFeedbackState] = useState({});
    const [submittedMap, setSubmittedMap] = useState({});
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
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
            history.push('/login/student');
            return true;
        }
        return false;
    }, [history]);

    useEffect(() => {
        const loadMeta = async () => {
            try {
                const [departmentRes, semesterRes, criteriaRes] = await Promise.all([
                    axios.get(`${API_BASE_URL}/api/teacher-feedback/departments`),
                    axios.get(`${API_BASE_URL}/api/teacher-feedback/semesters`),
                    axios.get(`${API_BASE_URL}/api/teacher-feedback/criteria/active`)
                ]);

                setDepartments(departmentRes.data || []);
                setSemesters(semesterRes.data || []);
                setCriteria(criteriaRes.data || []);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load feedback setup');
            } finally {
                setPageLoading(false);
            }
        };

        loadMeta();
    }, []);

    useEffect(() => {
        if (!selectedDepartmentId || !selectedSemester) {
            setTeachers([]);
            return;
        }

        const loadTeachers = async () => {
            setLoading(true);
            setError('');
            const authHeaders = {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            };

            try {
                const res = await axios.get(`${API_BASE_URL}/api/teacher-feedback/teachers/assigned`, {
                    params: {
                        departmentId: selectedDepartmentId,
                        semester: selectedSemester
                    },
                    headers: authHeaders
                });

                const teacherList = res.data || [];
                setTeachers(teacherList);

                const submissionChecks = await Promise.all(
                    teacherList.map(async (teacher) => {
                        try {
                            const checkRes = await axios.get(`${API_BASE_URL}/api/teacher-feedback/submissions/check`, {
                                params: {
                                    teacherId: teacher._id,
                                    semester: selectedSemester
                                },
                                headers: authHeaders
                            });

                            return [teacher._id, !!checkRes.data?.submitted];
                        } catch (checkError) {
                            return [teacher._id, false];
                        }
                    })
                );

                setSubmittedMap(Object.fromEntries(submissionChecks));

                setFeedbackState((current) => {
                    const nextState = { ...current };
                    teacherList.forEach((teacher) => {
                        if (!nextState[teacher._id]) {
                            nextState[teacher._id] = {};
                        }
                        criteria.forEach((criterion) => {
                            if (nextState[teacher._id][criterion._id] === undefined) {
                                nextState[teacher._id][criterion._id] = 0;
                            }
                        });
                    });
                    return nextState;
                });
            } catch (err) {
                if (handleAuthError(err)) {
                    setTeachers([]);
                    return;
                }
                setTeachers([]);
                setError(err.response?.data?.message || 'Failed to load assigned teachers');
            } finally {
                setLoading(false);
            }
        };

        loadTeachers();
    }, [selectedDepartmentId, selectedSemester, criteria, handleAuthError]);

    const handleScoreChange = (teacherId, criteriaId, score) => {
        setFeedbackState((current) => ({
            ...current,
            [teacherId]: {
                ...(current[teacherId] || {}),
                [criteriaId]: score
            }
        }));
    };

    const submitFeedback = async (teacherId) => {
        setError('');
        setSuccess('');

        const teacherRatings = criteria.map((criterion) => ({
            criteriaId: criterion._id,
            score: Number(feedbackState[teacherId]?.[criterion._id] || 0)
        }));

        if (teacherRatings.some((item) => !item.score)) {
            setError('Please rate every criterion before submitting');
            return;
        }

        try {
            await axios.post(
                `${API_BASE_URL}/api/teacher-feedback/submissions`,
                {
                    teacherId,
                    departmentId: selectedDepartmentId,
                    semester: Number(selectedSemester),
                    ratings: teacherRatings
                },
                {
                    headers: authHeaders
                }
            );

            setSubmittedMap((current) => ({
                ...current,
                [teacherId]: true
            }));

            setSuccess('Feedback submitted successfully. Your response is anonymous.');
        } catch (err) {
            if (handleAuthError(err)) {
                return;
            }
            setError(err.response?.data?.message || 'Failed to submit feedback');
        }
    };

    if (pageLoading) {
        return (
            <div className="container py-5 text-center">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-3">Loading feedback module...</p>
            </div>
        );
    }

    return (
        <div className="container py-4">
            <div className="row justify-content-center mb-4">
                <div className="col-lg-10">
                    <div className="card shadow-sm border-0">
                        <div className="card-body p-4 p-md-5">
                            <div className="d-flex flex-column flex-md-row justify-content-between gap-3 align-items-md-end">
                                <div>
                                    <h2 className="mb-2" style={{ color: 'var(--primary-blue)' }}>Teacher Feedback</h2>
                                    <p className="text-muted mb-0">Choose your department and semester, then rate every active criterion for each assigned teacher.</p>
                                </div>
                                <div className="small text-muted">
                                    Anonymous submissions, one response per teacher per semester.
                                </div>
                            </div>

                            {error && <div className="alert alert-danger mt-4 mb-0">{error}</div>}
                            {success && <div className="alert alert-success mt-4 mb-0">{success}</div>}

                            <div className="row g-3 mt-3">
                                <div className="col-md-6">
                                    <label className="form-label fw-semibold">Department</label>
                                    <select
                                        className="form-select"
                                        value={selectedDepartmentId}
                                        onChange={(e) => setSelectedDepartmentId(e.target.value)}
                                    >
                                        <option value="">Select department</option>
                                        {departments.map((department) => (
                                            <option key={department._id} value={department._id}>
                                                {department.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label fw-semibold">Semester</label>
                                    <select
                                        className="form-select"
                                        value={selectedSemester}
                                        onChange={(e) => setSelectedSemester(e.target.value)}
                                    >
                                        <option value="">Select semester</option>
                                        {semesters.map((semester) => (
                                            <option key={semester._id} value={semester.semesterNumber}>
                                                Semester {semester.semesterNumber}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-4">
                {loading ? (
                    <div className="col-12 text-center py-5">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <p className="mt-3 mb-0">Fetching assigned teachers...</p>
                    </div>
                ) : teachers.length === 0 ? (
                    <div className="col-12">
                        <div className="alert alert-info mb-0">
                            Select a department and semester to load teachers assigned to that batch.
                        </div>
                    </div>
                ) : (
                    teachers.map((teacher) => {
                        const isSubmitted = submittedMap[teacher._id];

                        return (
                            <div className="col-12" key={teacher._id}>
                                <div className="card shadow-sm border-0">
                                    <div className="card-body p-4">
                                        <div className="d-flex flex-column flex-md-row justify-content-between gap-2 align-items-md-center mb-3">
                                            <div>
                                                <h4 className="mb-1">{teacher.name}</h4>
                                                <div className="text-muted small">
                                                    {teacher.departmentId?.name || 'Department'} | Semester {selectedSemester}
                                                </div>
                                                {teacher.designation && (
                                                    <div className="small text-muted mt-1">{teacher.designation}</div>
                                                )}
                                            </div>
                                            <div>
                                                {isSubmitted ? (
                                                    <span className="badge bg-success px-3 py-2">Submitted</span>
                                                ) : (
                                                    <span className="badge bg-warning text-dark px-3 py-2">Pending</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="row g-3">
                                            {criteria.map((criterion) => (
                                                <div className="col-12 col-lg-6" key={criterion._id}>
                                                    <div className="border rounded-3 p-3 h-100 bg-light">
                                                        <div className="fw-semibold mb-1">{criterion.title}</div>
                                                        {criterion.description && <div className="text-muted small mb-3">{criterion.description}</div>}
                                                        <StarRating
                                                            value={feedbackState[teacher._id]?.[criterion._id] || 0}
                                                            onChange={(score) => handleScoreChange(teacher._id, criterion._id, score)}
                                                            label="Rating"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="d-flex justify-content-end mt-4">
                                            <button
                                                type="button"
                                                className="btn btn-primary"
                                                onClick={() => submitFeedback(teacher._id)}
                                                disabled={isSubmitted}
                                            >
                                                {isSubmitted ? 'Already Submitted' : 'Submit Feedback'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default TeacherFeedback;