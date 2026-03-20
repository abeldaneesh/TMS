import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import Training, { TrainingStatus } from '../models/Training';
import TrainingFeedback from '../models/TrainingFeedback';
import Attendance from '../models/Attendance';
import Nomination from '../models/Nomination';

const REVIEWER_ROLES = ['master_admin', 'program_officer', 'medical_officer'];

const FEEDBACK_STOP_WORDS = new Set([
    'about', 'after', 'again', 'all', 'also', 'and', 'arrangement', 'arrangements', 'because', 'been',
    'before', 'being', 'better', 'could', 'during', 'feedback', 'from', 'have', 'having', 'into', 'more',
    'need', 'next', 'overall', 'please', 'program', 'really', 'session', 'should', 'some', 'such', 'than',
    'that', 'their', 'them', 'there', 'these', 'they', 'this', 'those', 'training', 'very', 'want', 'with',
    'would', 'your'
]);

const isTrainingOwnerOrAdmin = (user: AuthRequest['user'], training: any): boolean => {
    if (!user) return false;
    if (user.role === 'master_admin') return true;
    if (!REVIEWER_ROLES.includes(user.role)) return false;
    return training.createdById?.toString() === user.userId || training.trainerId?.toString() === user.userId;
};

const buildSentiment = (rating?: number): 'positive' | 'neutral' | 'negative' | 'unrated' => {
    if (!rating) return 'unrated';
    if (rating >= 4) return 'positive';
    if (rating === 3) return 'neutral';
    return 'negative';
};

const extractCommonTopics = (entries: any[]) => {
    const counts: Record<string, number> = {};

    entries.forEach((entry) => {
        const text = [entry.suggestions, entry.futureTrainingRequests, entry.arrangementsFeedback]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

        const uniqueWords = new Set(
            text
                .replace(/[^a-z0-9\s]/g, ' ')
                .split(/\s+/)
                .map((word) => word.trim())
                .filter((word) => word.length >= 4 && !FEEDBACK_STOP_WORDS.has(word))
        );

        uniqueWords.forEach((word) => {
            counts[word] = (counts[word] || 0) + 1;
        });
    });

    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([keyword, count]) => ({ keyword, count }));
};

const serializeFeedback = (feedback: any) => ({
    id: feedback._id,
    trainingId: feedback.trainingId,
    participantId: feedback.participantId?._id || feedback.participantId,
    participantName: feedback.anonymous ? 'Anonymous participant' : feedback.participantId?.name || 'Participant',
    suggestions: feedback.suggestions,
    futureTrainingRequests: feedback.futureTrainingRequests,
    arrangementsFeedback: feedback.arrangementsFeedback,
    rating: feedback.rating,
    overallExperience: feedback.overallExperience,
    anonymous: feedback.anonymous,
    submittedAt: feedback.submittedAt,
    sentiment: buildSentiment(feedback.rating)
});

export const submitTrainingFeedback = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const trainingId = String(req.params.trainingId || '');
        const participantId = String(req.user!.userId);
        const {
            suggestions,
            futureTrainingRequests,
            arrangementsFeedback,
            rating,
            overallExperience,
            anonymous
        } = req.body;

        const normalizedSuggestions = typeof suggestions === 'string' ? suggestions.trim() : '';
        const normalizedFutureRequests = typeof futureTrainingRequests === 'string' ? futureTrainingRequests.trim() : '';
        const normalizedArrangements = typeof arrangementsFeedback === 'string' ? arrangementsFeedback.trim() : '';

        if (!normalizedSuggestions || !normalizedFutureRequests || !normalizedArrangements) {
            res.status(400).json({ message: 'All feedback text fields are required.' });
            return;
        }

        const training = await Training.findById(trainingId);
        if (!training) {
            res.status(404).json({ message: 'Training not found' });
            return;
        }

        if (training.status !== TrainingStatus.COMPLETED) {
            res.status(400).json({ message: 'Feedback is available only after the training is completed.' });
            return;
        }

        const attendance = await Attendance.findOne({ trainingId, participantId });
        const attendedNomination = await Nomination.findOne({ trainingId, participantId, status: 'attended' });

        if (!attendance && !attendedNomination) {
            res.status(403).json({ message: 'Only participants who attended this training can submit feedback.' });
            return;
        }

        const normalizedRating = typeof rating === 'number'
            ? rating
            : typeof rating === 'string' && rating.trim() !== ''
                ? Number(rating)
                : undefined;
        const normalizedExperience = typeof overallExperience === 'string'
            ? overallExperience.trim() || undefined
            : undefined;

        const feedback = await TrainingFeedback.create({
            trainingId,
            participantId,
            suggestions: normalizedSuggestions,
            futureTrainingRequests: normalizedFutureRequests,
            arrangementsFeedback: normalizedArrangements,
            rating: normalizedRating,
            overallExperience: normalizedExperience,
            anonymous: Boolean(anonymous)
        });

        const feedbackId = (feedback as any)._id;
        const populatedFeedback = await TrainingFeedback.findById(feedbackId)
            .populate('participantId', 'name')
            .lean();

        if (!populatedFeedback) {
            res.status(500).json({ message: 'Feedback was saved but could not be loaded.' });
            return;
        }

        res.status(201).json(serializeFeedback(populatedFeedback));
    } catch (error: any) {
        console.error('Submit feedback error:', error);
        if (error.code === 11000) {
            res.status(409).json({ message: 'You have already submitted feedback for this training.' });
            return;
        }
        res.status(500).json({ message: 'Error submitting feedback' });
    }
};

export const getTrainingFeedback = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const trainingId = String(req.params.trainingId || '');
        const training = await Training.findById(trainingId);

        if (!training) {
            res.status(404).json({ message: 'Training not found' });
            return;
        }

        if (!isTrainingOwnerOrAdmin(req.user, training)) {
            res.status(403).json({ message: 'Not authorized to view feedback for this training.' });
            return;
        }

        const feedback = await TrainingFeedback.find({ trainingId })
            .populate('participantId', 'name')
            .sort({ submittedAt: -1 })
            .lean();

        const serializedEntries = feedback.map(serializeFeedback);
        const ratedEntries = serializedEntries.filter((entry) => typeof entry.rating === 'number');
        const averageRating = ratedEntries.length > 0
            ? Number((ratedEntries.reduce((sum, entry) => sum + (entry.rating || 0), 0) / ratedEntries.length).toFixed(1))
            : null;

        res.json({
            entries: serializedEntries,
            summary: {
                totalResponses: serializedEntries.length,
                averageRating,
                commonTopics: extractCommonTopics(serializedEntries)
            }
        });
    } catch (error) {
        console.error('Get training feedback error:', error);
        res.status(500).json({ message: 'Error fetching training feedback' });
    }
};

export const getMyFeedbackSubmissions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const participantId = String(req.user!.userId);
        const feedback = await TrainingFeedback.find({ participantId })
            .select('trainingId submittedAt rating anonymous')
            .sort({ submittedAt: -1 })
            .lean();

        const formattedFeedback = feedback.map((entry: any) => ({
            id: entry._id,
            trainingId: entry.trainingId,
            submittedAt: entry.submittedAt,
            rating: entry.rating,
            anonymous: entry.anonymous
        }));

        res.json(formattedFeedback);
    } catch (error) {
        console.error('Get my feedback submissions error:', error);
        res.status(500).json({ message: 'Error fetching your feedback submissions' });
    }
};
