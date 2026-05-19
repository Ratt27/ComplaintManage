// Mock in-memory database for development without MongoDB
const mockDb = {
  users: [],
  complaints: [],
  feedbacks: []
};

// Generate unique IDs
let userIdCounter = 1;
let complaintIdCounter = 1;
let feedbackIdCounter = 1;

const mockDatabase = {
  // User operations
  createUser: (userData) => {
    const user = { _id: userIdCounter++, ...userData, createdAt: new Date() };
    mockDb.users.push(user);
    return user;
  },
  
  findUserByEmail: (email) => {
    return mockDb.users.find(u => u.email === email);
  },
  
  findUserById: (id) => {
    return mockDb.users.find(u => u._id == id);
  },
  
  findAllStaff: () => {
    return mockDb.users.filter(u => u.role === 'staff');
  },
  
  // Complaint operations
  createComplaint: (complaintData) => {
    const complaint = { 
      _id: complaintIdCounter++, 
      ...complaintData, 
      date: new Date(),
      updatedAt: new Date(),
      staffUpdates: []
    };
    mockDb.complaints.push(complaint);
    return complaint;
  },
  
  findComplaintById: (id) => {
    return mockDb.complaints.find(c => c._id == id);
  },
  
  findComplaintsByUserId: (userId) => {
    return mockDb.complaints.filter(c => c.raisedBy == userId).sort((a, b) => b.date - a.date);
  },
  
  findAllComplaints: () => {
    return mockDb.complaints.sort((a, b) => b.date - a.date);
  },
  
  findComplaintsByAssignedStaff: (staffId) => {
    return mockDb.complaints.filter(c => c.assignedTo == staffId).sort((a, b) => b.date - a.date);
  },
  
  updateComplaint: (id, updates) => {
    const complaint = mockDb.complaints.find(c => c._id == id);
    if (complaint) {
      Object.assign(complaint, updates);
      complaint.updatedAt = new Date();
    }
    return complaint;
  },
  
  // Feedback operations
  createFeedback: (feedbackData) => {
    const feedback = { 
      _id: feedbackIdCounter++, 
      ...feedbackData, 
      createdAt: new Date()
    };
    mockDb.feedbacks.push(feedback);
    return feedback;
  },
  
  findFeedbackByComplaintId: (complaintId) => {
    return mockDb.feedbacks.find(f => f.complaintId == complaintId);
  },
  
  findAllFeedbacks: () => {
    return mockDb.feedbacks;
  }
};

module.exports = mockDatabase;
