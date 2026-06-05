import React from 'react';

const StarRating = ({ value, onChange, label }) => {
    return (
        <div>
            {label && <div className="small fw-semibold mb-2">{label}</div>}
            <div className="d-flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((score) => (
                    <button
                        key={score}
                        type="button"
                        className={`btn btn-sm ${score <= value ? 'btn-warning' : 'btn-outline-secondary'}`}
                        onClick={() => onChange(score)}
                    >
                        {score} ★
                    </button>
                ))}
            </div>
        </div>
    );
};

export default StarRating;