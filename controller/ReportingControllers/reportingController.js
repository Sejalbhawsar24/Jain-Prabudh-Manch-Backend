const Reporting = require('../../model/ReportingModels/ReportingModel');
const HierarchicalSangh = require('../../model/SanghModels/hierarchicalSanghModel');
const { successResponse, errorResponse } = require('../../utils/apiResponse');

// Create a new report
exports.createReport = async (req, res) => {
  try {
    const {
      sanghName,
      presidentName,
      secretaryName,
      treasurerName,
      reportMonth,
      reportYear,
      generalMeetings,
      boardMeetings,
      membershipCount,
      jainAadharCount,
      projects,
      visits
    } = req.body;

        const user = req.user;
    const presidentRole = user.sanghRoles?.find(role => role.role === 'president');

    if (!presidentRole) {
      return errorResponse(res, 'Only presidents can submit reports', 403);
    }

    const submittingSanghId = presidentRole.sanghId;

    // 🔎 Fetch the submitting sangh from DB
    const submittingSangh = await HierarchicalSangh.findById(submittingSanghId);
    if (!submittingSangh) {
      return errorResponse(res, 'Submitting Sangh not found', 404);
    }

    const recipientSanghId = submittingSangh.parentSangh || submittingSanghId;

    const newReport = new Reporting({
      submittingSanghId,
      recipientSanghId,
      sanghName,
      presidentName,
      secretaryName,
      treasurerName,
      reportMonth,
      reportYear,
      generalMeetings: {
       // count: generalMeetings?.details?.length || 0,
        details: generalMeetings?.details?.map(meeting => ({
          meetingNumber: meeting.meetingNumber,
          date: meeting.date,
          attendanceCount: meeting.attendanceCount
        })) || []
      },
      boardMeetings: {
//count: boardMeetings?.details?.length || 0,
        details: boardMeetings?.details?.map(meeting => ({
          meetingNumber: meeting.meetingNumber,
          date: meeting.date,
          attendanceCount: meeting.attendanceCount
        })) || []
      },
      membershipCount,
      jainAadharCount,
      projects: projects || [],
      visits: visits?.map(visit => ({
        date: visit.date,
        visitorName: visit.visitorName,
        visitorLevel: visit.visitorLevel,
        purpose: visit.purpose
      })) || [],
      submittedById: user._id
    });

    await newReport.save();

    return successResponse(res, 'Report created successfully', newReport, 201);
  } catch (err) {
    console.error('Error creating report:', err);
    return errorResponse(res, 'Server error', 500);
  }
};
// Get a single report by ID
exports.getReportById = async (req, res) => {
  const { id } = req.params;

  try {
    const report = await Reporting.findById(id)
      .populate('submittingSanghId', 'name level')
      .populate('recipientSanghId', 'name level')
      .populate('submittedById', 'firstName lastName');

    if (!report) {
      return errorResponse(res, 'Report not found', 404);
    }

    return successResponse(res, 'Report retrieved successfully', report);
  } catch (err) {
    console.error('Error retrieving report:', err);
    return errorResponse(res, 'Server error', 500);
  }
};

// Get all reports (with filtering options)
exports.getAllReports = async (req, res) => {
  try {
    const { status, month, year } = req.query;
    const userId = req.user._id;
    const isSuperAdmin = req.user.role === 'superadmin';

    // Build query based on filters
    const query = {};

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    // Filter by reporting period if provided
    if (month) {
      const parsedMonth = parseInt(month);
      if (!isNaN(parsedMonth)) {
        query.reportMonth = parsedMonth;
      }
    }


    if (year) {
      const parsedYear = parseInt(year);
      if (!isNaN(parsedYear)) {
        query.reportYear = parsedYear;
      }
    }

    // For superadmin, show all reports
    // For others, only show reports they submitted or reports submitted to their Sangh
    if (!isSuperAdmin) {
      // Get user's Sangh IDs (user might be associated with multiple Sanghs)
      // This depends on your user-Sangh association structure
      // Simplified example:
      const userSanghIds = req.user.sanghRoles ?
        req.user.sanghRoles.map(role => role.sanghId) : [];

      query.$or = [
        { submittedById: userId },
        { recipientSanghId: { $in: userSanghIds } }
      ];
    }

    // Execute query with pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const reports = await Reporting.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('submittingSanghId', 'name level')
      .populate('recipientSanghId', 'name level')
      .populate('submittedById', 'firstName lastName');

    const total = await Reporting.countDocuments(query);

    return successResponse(res, 'Reports retrieved successfully', {
      reports,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Error retrieving reports:', err);
    return errorResponse(res, 'Server error', 500);
  }
};

// Get reports submitted by my Sangh
// exports.getSubmittedReports = async (req, res) => {
//   try {
//     const user = req.user;

//     // Extract user's sangh role (president/secretary/treasurer only)
//     const userSangh = (user.sanghRoles || []).find(role =>
//       ['president', 'secretary', 'treasurer'].includes(role.role)
//     );

//     if (!userSangh && user.role !== 'superadmin') {
//       return errorResponse(res, 'Unauthorized: You are not allowed to view submitted reports.', 403);
//     }

//     const query = {
//       submittingSanghId: userSangh?.sanghId || undefined
//     };

//     const { status, month, year } = req.query;
//     if (status) query.status = status;
//     if (month) query.reportMonth = parseInt(month);
//     if (year) query.reportYear = parseInt(year);

//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const skip = (page - 1) * limit;

//     const reports = await Reporting.find(query)
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .populate('recipientSanghId', 'name level');

//     const total = await Reporting.countDocuments(query);

//     return successResponse(res, 'Submitted reports retrieved successfully', {
//       reports,
//       pagination: {
//         total,
//         page,
//         pages: Math.ceil(total / limit)
//       }
//     });
//   } catch (err) {
//     console.error('Error retrieving submitted reports:', err);
//     return errorResponse(res, 'Server error', 500);
//   }
// };
exports.getSubmittedReports = async (req, res) => {
  try {
    const user = req.user;

    let sanghId = null;

    if (user.role === 'superadmin') {
      sanghId = req.query.sanghId; // Superadmin ke liye query se ID allow karein
    } else {
      const userSangh = (user.sanghRoles || []).find(role =>
        ['president', 'secretary', 'treasurer'].includes(role.role)
      );

      if (!userSangh) {
        return errorResponse(res, 'You are not authorized to view submitted reports.', 403);
      }

      sanghId = userSangh.sanghId;
    }

    if (!sanghId) return errorResponse(res, 'Missing Sangh ID', 400);

    const { status, month, year } = req.query;

    const query = {
      submittingSanghId: sanghId
    };

    if (status) query.status = status;
    if (month) query.reportMonth = parseInt(month);
    if (year) query.reportYear = parseInt(year);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const reports = await Reporting.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('recipientSanghId', 'name level')
      .populate('submittingSanghId', 'name level')
      .populate('submittedById', 'firstName lastName');

    const total = await Reporting.countDocuments(query);

    return successResponse(res, 'Submitted reports retrieved successfully', {
      reports,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Error retrieving submitted reports:', err);
    return errorResponse(res, 'Server error', 500);
  }
};



// Get reports received by my Sangh
exports.getReceivedReports = async (req, res) => {
  try {
    const user = req.user;

    // Allow superadmin to fetch all
    if (user.role === 'superadmin') {
      const reports = await Reporting.find({}).sort({ createdAt: -1 });
      return successResponse(res, 'All reports fetched successfully', reports);
    }

    // Detect sangh ID from the user's roles
    const userSangh = (user.sanghRoles || []).find(role =>
      ['president', 'secretary', 'treasurer'].includes(role.role)
    );

    if (!userSangh) {
      return errorResponse(res, 'You are not assigned to any Sangh as president/secretary/treasurer', 403);
    }

    const reports = await Reporting.find({
      recipientSanghId: userSangh.sanghId
    }).sort({ createdAt: -1 });

    return successResponse(res, 'Received reports fetched successfully', reports);
  } catch (err) {
    console.error('Error retrieving reports:', err);
    return errorResponse(res, 'Server error', 500);
  }
};



// Update a report by ID
exports.updateReport = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    // Find the report
    const report = await Reporting.findById(id);

    if (!report) {
      return errorResponse(res, 'Report not found', 404);
    }

    // Check permissions - only allow updates by the submitter
    if (report.submittedById.toString() !== req.user._id.toString() &&
      req.user.role !== 'superadmin') {
      return errorResponse(res, 'Not authorized to update this report', 403);
    }

    // Don't allow changing submittingSanghId or recipientSanghId
    delete updates.submittingSanghId;
    delete updates.recipientSanghId;

    // Update the report
    const updatedReport = await Reporting.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    return successResponse(res, 'Report updated successfully', updatedReport);
  } catch (err) {
    console.error('Error updating report:', err);
    return errorResponse(res, 'Server error', 500);
  }
};

// Update report status and feedback
exports.updateReportStatus = async (req, res) => {
  const { id } = req.params;
  const { status, feedback } = req.body;

  try {
    // Find the report
    const report = await Reporting.findById(id)
      .populate('recipientSanghId', 'name level');

    if (!report) {
      return errorResponse(res, 'Report not found', 404);
    }

    // Check permissions - only allow status updates by the recipient
    // This depends on your user-Sangh association structure
    // Simplified example:
    const userSanghIds = req.user.sanghRoles ?
      req.user.sanghRoles.map(role => role.sanghId.toString()) : [];

    if (!userSanghIds.includes(report.recipientSanghId._id.toString()) &&
      req.user.role !== 'superadmin') {
      return errorResponse(res, 'Not authorized to update this report status', 403);
    }

    // Update status and feedback
    report.status = status || report.status;
    if (feedback) {
      report.feedback = feedback;
    }

    await report.save();

    return successResponse(res, 'Report status updated successfully', report);
  } catch (err) {
    console.error('Error updating report status:', err);
    return errorResponse(res, 'Server error', 500);
  }
};

// Delete a report by ID
exports.deleteReport = async (req, res) => {
  const { id } = req.params;

  try {
    const report = await Reporting.findById(id);

    if (!report) {
      return errorResponse(res, 'Report not found', 404);
    }

    // Check permissions - only allow deletion by the submitter or superadmin
    if (report.submittedById.toString() !== req.user._id.toString() &&
      req.user.role !== 'superadmin') {
      return errorResponse(res, 'Not authorized to delete this report', 403);
    }

    await Reporting.findByIdAndDelete(id);

    return successResponse(res, 'Report deleted successfully');
  } catch (err) {
    console.error('Error deleting report:', err);
    return errorResponse(res, 'Server error', 500);
  }
};

// Get top performing Sanghs - Simplified to only consider membership and Jain Aadhar counts
exports.getTopPerformers = async (req, res) => {
  try {
    const { level = 'all', period = 'month', limit = 3 } = req.query;

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    let dateFilter = {};

    if (period === 'month') {
      dateFilter = {
        reportMonth: currentMonth,
        reportYear: currentYear
      };
    } else if (period === 'quarter') {
      const currentQuarter = Math.ceil(currentMonth / 3);
      const startMonth = (currentQuarter - 1) * 3 + 1;
      const endMonth = currentQuarter * 3;

      dateFilter = {
        reportMonth: { $gte: startMonth, $lte: endMonth },
        reportYear: currentYear
      };
    } else if (period === 'year') {
      dateFilter = { reportYear: currentYear };
    } else if (period === 'custom' && req.query.startDate && req.query.endDate) {
      const startDate = new Date(req.query.startDate);
      const endDate = new Date(req.query.endDate);

      dateFilter = {
        createdAt: { $gte: startDate, $lte: endDate }
      };
    }

    let levelFilter = {};
    if (level !== 'all') {
      const sanghs = await HierarchicalSangh.find({ level });
      const sanghIds = sanghs.map(s => s._id);
      levelFilter = { submittingSanghId: { $in: sanghIds } };
    }

    const filter = {
      ...dateFilter,
      ...levelFilter,
      status: 'approved'
    };

    const topPerformers = await Reporting.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$submittingSanghId',
          membershipCount: { $max: '$membershipCount' },
          jainAadharCount: { $max: '$jainAadharCount' },
          lastReport: { $max: '$createdAt' }
        }
      },
      {
        $addFields: {
          performanceScore: {
            $add: [
              { $multiply: ['$membershipCount', 1] },
              { $multiply: ['$jainAadharCount', 1] }
            ]
          }
        }
      },
      { $sort: { performanceScore: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'hierarchicalsanghs',
          localField: '_id',
          foreignField: '_id',
          as: 'sanghDetails'
        }
      },
      { $unwind: '$sanghDetails' },
      {
        $project: {
          _id: 1,
          sanghName: '$sanghDetails.name',
          sanghLevel: '$sanghDetails.level',
          performanceScore: 1,
          metrics: {
            membershipCount: '$membershipCount',
            jainAadharCount: '$jainAadharCount'
          },
          lastReportDate: '$lastReport'
        }
      }
    ]);

    return successResponse(res, 'Top performing Sanghs retrieved successfully', topPerformers);
  } catch (err) {
    console.error('Error getting top performers:', err);
    return errorResponse(res, 'Server error', 500);
  }
};
