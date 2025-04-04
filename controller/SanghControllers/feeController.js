const asyncHandler = require('express-async-handler');
const { FeePayment, FeePolicy, FeeReminder } = require('../../model/SanghModels/feeModel');
const Sangh = require('../../model/SanghModels/sanghModel');
const User = require('../../model/UserRegistrationModels/userModel');
const { successResponse, errorResponse } = require('../../utils/apiResponse');

// Get fee policy
const getFeePolicy = asyncHandler(async (req, res) => {
    try {
        const { sanghId } = req.params;
        
        const policy = await FeePolicy.findOne({ sanghId });
        if (!policy) {
            return errorResponse(res, 'Fee policy not found', 404);
        }

        return successResponse(res, policy, 'Fee policy retrieved successfully');
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

// Update fee policy
const updateFeePolicy = asyncHandler(async (req, res) => {
    try {
        const { sanghId } = req.params;
        const {
            monthlyFee,
            distribution,
            latePaymentCharge,
            gracePeriod
        } = req.body;

        // Verify distribution percentages total 100%
        const total = Object.values(distribution).reduce((sum, value) => sum + value, 0);
        if (total !== 100) {
            return errorResponse(res, 'Fee distribution must total 100%', 400);
        }

        const policy = await FeePolicy.findOneAndUpdate(
            { sanghId },
            {
                monthlyFee,
                distribution,
                latePaymentCharge,
                gracePeriod,
                updatedBy: req.user._id
            },
            { 
                new: true, 
                upsert: true, 
                setDefaultsOnInsert: true,
                runValidators: true 
            }
        );

        return successResponse(res, policy, 'Fee policy updated successfully');
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

// Record fee payment
const recordFeePayment = asyncHandler(async (req, res) => {
    try {
        const { sanghId } = req.params;
        const {
            userId,
            amount,
            month,
            year,
            paymentMethod,
            transactionId
        } = req.body;

        // Get fee policy
        const policy = await FeePolicy.findOne({ sanghId });
        if (!policy) {
            return errorResponse(res, 'Fee policy not found', 404);
        }

        // Validate exact payment amount
        if (amount !== policy.monthlyFee) {
            return errorResponse(res, `Payment amount must be exactly ₹${policy.monthlyFee}`, 400);
        }

        // Check for existing payments in the same month
        const existingPayment = await FeePayment.findOne({
            userId,
            sanghId,
            month,
            year,
            status: 'completed'
        });

        if (existingPayment) {
            return errorResponse(res, 'Payment already made for this month', 400);
        }

        // Calculate late payment charge if applicable
        let latePaymentCharge = 0;
        const dueDate = new Date(year, month - 1, policy.paymentDueDate);
        const gracePeriodEnd = new Date(dueDate);
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + policy.gracePeriod);

        if (new Date() > gracePeriodEnd) {
            latePaymentCharge = policy.latePaymentCharge;
        }

        // Calculate distribution amounts and create distribution details
        const distributionDetails = [
            {
                level: 'foundation',
                amount: (amount * policy.distribution.foundation) / 100,
                status: 'pending'
            },
            {
                level: 'country',
                amount: (amount * policy.distribution.country) / 100,
                status: 'pending'
            },
            {
                level: 'state',
                amount: (amount * policy.distribution.state) / 100,
                status: 'pending'
            },
            {
                level: 'district',
                amount: (amount * policy.distribution.district) / 100,
                status: 'pending'
            },
            {
                level: 'city',
                amount: (amount * policy.distribution.city) / 100,
                status: 'completed', // Automatically mark city's portion as completed
                remarks: 'City portion retained from initial payment',
                receivedAt: new Date()
            }
        ];

        // Create payment record
        const payment = await FeePayment.create({
            userId,
            sanghId,
            amount,
            month,
            year,
            paymentMethod,
            transactionId,
            distribution: policy.distribution,
            status: 'completed',
            receipt: req.file?.location,
            latePaymentCharge,
            distributionDetails
        });

        // Update reminder status if exists
        await FeeReminder.findOneAndUpdate(
            { userId, sanghId, month, year },
            { status: 'paid' }
        );

        return successResponse(res, {
            payment,
            distribution: distributionDetails,
            totalAmount: amount + latePaymentCharge,
            cityPortion: (amount * policy.distribution.city) / 100,
            remainingToTransfer: amount - (amount * policy.distribution.city) / 100
        }, 'Fee payment recorded successfully');
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

// Generate fee reminders
const generateReminders = asyncHandler(async (req, res) => {
    try {
        const { sanghId } = req.params;
        const { month, year } = req.body;

        const sangh = await Sangh.findById(sanghId);
        if (!sangh) {
            return errorResponse(res, 'Sangh not found', 404);
        }

        const policy = await FeePolicy.findOne({ sanghId });
        if (!policy) {
            return errorResponse(res, 'Fee policy not found', 404);
        }

        // Get all members who haven't paid
        const paidMembers = await FeePayment.find({
            sanghId,
            month,
            year,
            status: 'completed'
        }).distinct('userId');

        const reminders = [];
        for (const member of sangh.members) {
            if (!paidMembers.includes(member.userId)) {
                const dueDate = new Date(year, month - 1, policy.gracePeriod + 1);
                reminders.push({
                    userId: member.userId,
                    sanghId,
                    month,
                    year,
                    amount: policy.monthlyFee,
                    dueDate,
                    status: dueDate < new Date() ? 'overdue' : 'pending'
                });
            }
        }

        await FeeReminder.insertMany(reminders);

        return successResponse(res, reminders, 'Fee reminders generated successfully');
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

// Get fee payment status
const getFeeStatus = asyncHandler(async (req, res) => {
    try {
        const { sanghId } = req.params;
        const { month, year } = req.query;

        // Convert month and year to numbers
        const queryMonth = parseInt(month);
        const queryYear = parseInt(year);

        // Validate month and year
        if (!queryMonth || !queryYear) {
            return errorResponse(res, 'Month and year are required query parameters', 400);
        }

        const [payments, policy, sangh] = await Promise.all([
            FeePayment.find({ 
                sanghId, 
                month: queryMonth, 
                year: queryYear,
                status: 'completed'
            }),
            FeePolicy.findOne({ sanghId }),
            Sangh.findById(sanghId)
        ]);

        if (!sangh) {
            return errorResponse(res, 'Sangh not found', 404);
        }

        if (!policy) {
            return errorResponse(res, 'Fee policy not found', 404);
        }

        // Get unique member IDs who have paid (in case of duplicate payments)
        const paidMemberIds = new Set(payments.map(p => p.userId.toString()));
        const totalMembers = sangh.members.length;
        const paidMembers = paidMemberIds.size;
        const pendingMembers = Math.max(0, totalMembers - paidMembers);

        // Calculate if any payments are overdue
        const today = new Date();
        const isOverdue = new Date(queryYear, queryMonth - 1, policy.gracePeriod + 1) < today;
        const overdueMembers = isOverdue ? pendingMembers : 0;

        // Initialize distribution object
        const distribution = {
            foundation: 0,
            country: 0,
            state: 0,
            district: 0,
            city: 0
        };

        // Calculate distribution amounts
        payments.forEach(payment => {
            const dist = payment.distribution;
            distribution.foundation += (payment.amount * dist.foundation) / 100;
            distribution.country += (payment.amount * dist.country) / 100;
            distribution.state += (payment.amount * dist.state) / 100;
            distribution.district += (payment.amount * dist.district) / 100;
            distribution.city += (payment.amount * dist.city) / 100;
        });

        const status = {
            totalMembers,
            paidMembers,
            pendingMembers,
            overdueMembers,
            collectedAmount: payments.reduce((sum, p) => sum + p.amount, 0),
            expectedAmount: totalMembers * policy.monthlyFee,
            distribution,
            paidMemberDetails: payments.map(p => ({
                userId: p.userId,
                amount: p.amount,
                paymentDate: p.paymentDate,
                paymentMethod: p.paymentMethod,
                transactionId: p.transactionId,
                distribution: p.distribution
            })),
            pendingMemberDetails: sangh.members
                .filter(member => !paidMemberIds.has(member.userId.toString()))
                .map(member => ({
                    userId: member.userId,
                    name: member.name,
                    phoneNumber: member.phoneNumber
                }))
        };

        return successResponse(res, status, 'Fee status retrieved successfully');
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

// Get member payment history
const getMemberPaymentHistory = asyncHandler(async (req, res) => {
    try {
        const { sanghId, userId } = req.params;

        const payments = await FeePayment.find({ sanghId, userId })
            .sort({ year: -1, month: -1 });

        const reminders = await FeeReminder.find({ sanghId, userId })
            .sort({ year: -1, month: -1 });

        return successResponse(res, { payments, reminders }, 'Payment history retrieved successfully');
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

// Send fee reminders
const sendReminders = asyncHandler(async (req, res) => {
    try {
        const { sanghId } = req.params;
        const { method } = req.body;

        const pendingReminders = await FeeReminder.find({
            sanghId,
            status: { $in: ['pending', 'overdue'] }
        }).populate('userId', 'phoneNumber email fullName');

        const results = [];
        for (const reminder of pendingReminders) {
            // Here you would integrate with your notification service
            // For now, we'll just mark them as sent
            reminder.remindersSent.push({
                date: new Date(),
                method,
                status: 'sent'
            });
            await reminder.save();
            results.push({
                userId: reminder.userId._id,
                name: reminder.userId.fullName,
                status: 'sent'
            });
        }

        return successResponse(res, results, 'Reminders sent successfully');
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

// Calculate pending fees
const calculatePendingFees = asyncHandler(async (req, res) => {
    try {
        const { sanghId, userId } = req.params;
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();

        // Get fee policy
        const policy = await FeePolicy.findOne({ sanghId });
        if (!policy) {
            return errorResponse(res, 'Fee policy not found', 404);
        }

        // Get all payments for the user
        const payments = await FeePayment.find({
            userId,
            sanghId,
            status: 'completed'
        }).sort({ year: 1, month: 1 });

        // Calculate pending amounts
        const pendingFees = [];
        let totalPending = 0;

        // Start from user's join date or last 12 months
        const sangh = await Sangh.findById(sanghId);
        const member = sangh.members.find(m => m.userId.toString() === userId);
        const startDate = member ? new Date(member.joinedAt) : new Date(currentYear - 1, currentMonth - 1, 1);

        for (let d = new Date(startDate); d <= currentDate; d.setMonth(d.getMonth() + 1)) {
            const month = d.getMonth() + 1;
            const year = d.getFullYear();

            // Find payment for this month
            const monthPayment = payments.find(p => p.month === month && p.year === year);
            
            if (!monthPayment) {
                // Calculate late payment charge if applicable
                const dueDate = new Date(year, month - 1, policy.paymentDueDate);
                const gracePeriodEnd = new Date(dueDate);
                gracePeriodEnd.setDate(gracePeriodEnd.getDate() + policy.gracePeriod);

                const isLate = currentDate > gracePeriodEnd;
                const lateCharge = isLate ? policy.latePaymentCharge : 0;

                pendingFees.push({
                    month,
                    year,
                    amount: policy.monthlyFee,
                    latePaymentCharge: lateCharge,
                    totalDue: policy.monthlyFee + lateCharge,
                    dueDate: dueDate,
                    status: isLate ? 'overdue' : 'pending'
                });

                totalPending += policy.monthlyFee + lateCharge;
            }
        }

        return successResponse(res, {
            pendingFees,
            totalPending,
            monthlyFee: policy.monthlyFee
        }, 'Pending fees calculated successfully');

    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

// Calculate remaining amount for next level
const calculateRemainingAmount = (currentLevel, totalAmount, distribution) => {
    const levels = ['city', 'district', 'state', 'country', 'foundation'];
    const currentIndex = levels.indexOf(currentLevel);
    
    if (currentIndex === -1 || currentIndex === levels.length - 1) {
        return 0;
    }

    let remainingAmount = totalAmount;
    for (let i = 0; i <= currentIndex; i++) {
        remainingAmount -= (totalAmount * distribution[levels[i]]) / 100;
    }
    
    return remainingAmount;
};

// Update distribution status
const updateDistributionStatus = asyncHandler(async (req, res) => {
    try {
        const { sanghId, paymentId, level } = req.params;
        const { 
            status, 
            recipientSanghId, 
            transferMethod, 
            transactionId, 
            remarks 
        } = req.body;

        // Verify payment exists
        const payment = await FeePayment.findById(paymentId);
        if (!payment) {
            return errorResponse(res, 'Payment not found', 404);
        }

        // Find the distribution detail for this level
        const distributionIndex = payment.distributionDetails.findIndex(d => d.level === level);
        if (distributionIndex === -1) {
            return errorResponse(res, 'Distribution detail not found', 404);
        }

        const distribution = payment.distributionDetails[distributionIndex];

        // Calculate remaining amount to be transferred
        const remainingAmount = payment.amount - (payment.amount * payment.distribution.city) / 100;

        // Validate status transition
        const validTransitions = {
            'pending': ['transferred'],
            'transferred': ['received'],
            'received': ['completed']
        };

        if (!validTransitions[distribution.status]?.includes(status)) {
            return errorResponse(res, `Invalid status transition from ${distribution.status} to ${status}`, 400);
        }

        // Update distribution details
        if (status === 'transferred') {
            distribution.status = status;
            distribution.transferredAt = new Date();
            distribution.transferMethod = transferMethod;
            distribution.recipientSanghId = recipientSanghId;
            distribution.remainingAmount = remainingAmount;
            distribution.remarks = remarks;
            distribution.transferDetails = {
                transactionId,
                transferredBy: {
                    userId: req.user._id,
                    name: req.user.fullName,
                    role: 'president'
                },
                amount: remainingAmount
            };
        } else if (status === 'received') {
            distribution.status = status;
            distribution.receivedAt = new Date();
            distribution.remarks = remarks;
            distribution.confirmedBy = {
                userId: req.user._id,
                name: req.user.fullName,
                role: 'president'
            };
        }

        await payment.save();

        return successResponse(res, {
            payment,
            remainingAmount,
            currentLevelAmount: payment.distribution[level]
        }, 'Distribution status updated successfully');
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

// Get distribution details for a Sangh
const getDistributionDetails = asyncHandler(async (req, res) => {
    try {
        const { sanghId } = req.params;
        const { startDate, endDate, status } = req.query;

        // Build query
        const query = { sanghId };
        if (startDate && endDate) {
            query.paymentDate = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        // Get payments with distribution details
        const payments = await FeePayment.find(query)
            .populate('userId', 'fullName')
            .sort({ paymentDate: -1 });

        // Filter distributions by status if specified
        let distributions = payments.map(payment => ({
            paymentId: payment._id,
            memberName: payment.userId.fullName,
            amount: payment.amount,
            paymentDate: payment.paymentDate,
            distributionDetails: status ? 
                payment.distributionDetails.filter(d => d.status === status) :
                payment.distributionDetails
        }));

        return successResponse(res, distributions, 'Distribution details retrieved successfully');
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

// Get pending distributions with remaining amounts
const getPendingDistributions = asyncHandler(async (req, res) => {
    try {
        const { sanghId } = req.params;
        const { level } = req.query;

        // Get all payments with pending distributions
        const payments = await FeePayment.find({
            sanghId,
            'distributionDetails.status': 'pending'
        }).populate('userId', 'fullName');

        // Filter and calculate remaining amounts
        const pendingDistributions = payments.map(payment => {
            const remainingAmount = calculateRemainingAmount(
                level || 'city',
                payment.amount,
                payment.distribution
            );

            return {
                paymentId: payment._id,
                memberName: payment.userId.fullName,
                totalAmount: payment.amount,
                remainingAmount,
                retainedAmount: level ? 
                    (payment.amount * payment.distribution[level]) / 100 : 
                    (payment.amount * payment.distribution.city) / 100,
                paymentDate: payment.paymentDate,
                distributionDetails: level ?
                    payment.distributionDetails.filter(d => d.level === level && d.status === 'pending') :
                    payment.distributionDetails.filter(d => d.status === 'pending')
            };
        }).filter(p => p.distributionDetails.length > 0);

        // Calculate totals
        const totals = {
            totalPending: pendingDistributions.reduce((sum, p) => sum + p.remainingAmount, 0),
            totalRetained: pendingDistributions.reduce((sum, p) => sum + p.retainedAmount, 0),
            count: pendingDistributions.length
        };

        return successResponse(res, {
            distributions: pendingDistributions,
            totals
        }, 'Pending distributions retrieved successfully');
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

// Get distribution history
const getDistributionHistory = asyncHandler(async (req, res) => {
    try {
        const { sanghId } = req.params;
        const { startDate, endDate, level } = req.query;

        // Build query
        const query = { sanghId };
        if (startDate && endDate) {
            query.paymentDate = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        // Get completed distributions
        const payments = await FeePayment.find(query)
            .populate('userId', 'fullName')
            .sort({ paymentDate: -1 });

        // Filter and format distribution history
        const history = payments.map(payment => ({
            paymentId: payment._id,
            memberName: payment.userId.fullName,
            amount: payment.amount,
            paymentDate: payment.paymentDate,
            distributionDetails: level ?
                payment.distributionDetails.filter(d => d.level === level && d.status === 'completed') :
                payment.distributionDetails.filter(d => d.status === 'completed')
        })).filter(p => p.distributionDetails.length > 0);

        // Calculate statistics
        const statistics = {
            totalDistributed: history.reduce((sum, p) => 
                sum + p.distributionDetails.reduce((dSum, d) => dSum + d.amount, 0), 0),
            totalPayments: history.length,
            byLevel: {}
        };

        // Calculate level-wise statistics
        history.forEach(payment => {
            payment.distributionDetails.forEach(d => {
                if (!statistics.byLevel[d.level]) {
                    statistics.byLevel[d.level] = {
                        totalAmount: 0,
                        count: 0
                    };
                }
                statistics.byLevel[d.level].totalAmount += d.amount;
                statistics.byLevel[d.level].count++;
            });
        });

        return successResponse(res, {
            history,
            statistics
        }, 'Distribution history retrieved successfully');
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

module.exports = {
    getFeePolicy,
    updateFeePolicy,
    recordFeePayment,
    generateReminders,
    getFeeStatus,
    getMemberPaymentHistory,
    sendReminders,
    calculatePendingFees,
    updateDistributionStatus,
    getDistributionDetails,
    getPendingDistributions,
    getDistributionHistory
}; 