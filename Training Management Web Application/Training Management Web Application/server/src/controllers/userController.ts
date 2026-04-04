import { Request, Response } from 'express';
import User from '../models/User';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../middleware/authMiddleware';
import Training from '../models/Training';
import Nomination from '../models/Nomination';
import Attendance from '../models/Attendance';
import { markSnapshotAsDeleted } from '../models/shared/participantSnapshot';
import Institution from '../models/Institution';

const normalizePhoneNumber = (value?: string) => value ? value.replace(/\D/g, '') : '';
const isValidPhoneNumber = (value?: string) => !value || normalizePhoneNumber(value).length === 10;
const normalizeOptionalText = (value: unknown) => typeof value === 'string' ? value.trim() : value;
const generateManualParticipantEmail = (name?: string, phone?: string) => {
    const normalizedName = (name || 'participant')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '.')
        .replace(/(^\.|\.$)/g, '') || 'participant';
    const phoneFragment = normalizePhoneNumber(phone).slice(-4) || Math.random().toString(36).slice(-4);
    return `${normalizedName}.${phoneFragment}.${Date.now()}@manual.training.local`;
};
const transformUserForResponse = (user: any) => ({
    ...user,
    id: user._id,
    institutionId: typeof user.institutionId === 'string' ? user.institutionId : user.institutionId?._id,
    institution: user.institutionId
        ? {
            id: typeof user.institutionId === 'string' ? user.institutionId : user.institutionId._id,
            name: typeof user.institutionId === 'string' ? undefined : user.institutionId.name
        }
        : null
});

export const getUsers = async (req: Request, res: Response): Promise<void> => {
    try {
        const { role } = req.query;
        const filter: any = {};

        if (role) {
            filter.role = role as string;
        }

        // Only return approved users for this general list
        filter.isApproved = true;
        filter.isDeleted = { $ne: true };

        const users = await User.find(filter)
            .populate('institutionId', 'name')
            .sort({ name: 1 })
            .lean();

        // Transform data to match previous structure (institutionId -> institution)
        const transformedUsers = users.map((user: any) => transformUserForResponse(user));

        res.status(200).json(transformedUsers);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Error fetching users' });
    }
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.params;
        const user = await User.findOne({ _id: userId, isDeleted: { $ne: true } })
            .populate('institutionId', 'name')
            .lean();

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        const transformedUser = transformUserForResponse(user);

        res.status(200).json(transformedUser);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'Error fetching user' });
    }
};

export const getPendingUsers = async (req: Request, res: Response): Promise<void> => {
    try {
        const users = await User.find({ isApproved: false })
            .populate('institutionId', 'name')
            .sort({ createdAt: -1 })
            .lean();

        const transformedUsers = users.map((user: any) => transformUserForResponse(user));

        res.status(200).json(transformedUsers);
    } catch (error) {
        console.error('Error fetching pending users:', error);
        res.status(500).json({ message: 'Error fetching pending users' });
    }
};

export const approveUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.params.userId;

        await User.findByIdAndUpdate(userId, { isApproved: true });

        res.status(200).json({ message: 'User approved successfully' });
    } catch (error) {
        console.error('Error approving user:', error);
        res.status(500).json({ message: 'Error approving user' });
    }
};

export const rejectUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.params.userId;

        await User.findByIdAndDelete(userId);

        res.status(200).json({ message: 'User registration rejected' });
    } catch (error) {
        console.error('Error rejecting user:', error);
        res.status(500).json({ message: 'Error rejecting user' });
    }
};

export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.params.userId;
        const requester = req.user;

        if (!requester) {
            res.sendStatus(401);
            return;
        }

        const existingUser = await User.findOne({ _id: userId, isDeleted: { $ne: true } });
        if (!existingUser) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        const isSelfUpdate = requester.userId === userId;
        const isPrivilegedManager = requester.role === 'master_admin' || requester.role === 'medical_officer';
        const isInstitutionAdminForParticipant =
            requester.role === 'institutional_admin' &&
            existingUser.role === 'participant' &&
            Boolean(requester.institutionId) &&
            requester.institutionId === String(existingUser.institutionId || '');

        if (!isSelfUpdate && !isPrivilegedManager && !isInstitutionAdminForParticipant) {
            res.status(403).json({ message: 'You do not have permission to update this user' });
            return;
        }

        const {
            name,
            email,
            phone,
            designation,
            department,
            profilePicture,
            institutionId,
        } = req.body;

        const updateData: any = {};

        if (name !== undefined) {
            const trimmedName = normalizeOptionalText(name);
            if (!trimmedName) {
                res.status(400).json({ message: 'Name is required' });
                return;
            }
            updateData.name = trimmedName;
        }

        if (email !== undefined) {
            const normalizedEmail = String(normalizeOptionalText(email) || '').toLowerCase();
            if (!normalizedEmail) {
                res.status(400).json({ message: 'Email is required' });
                return;
            }

            const emailOwner = await User.findOne({
                email: normalizedEmail,
                _id: { $ne: userId }
            }).select('_id');

            if (emailOwner) {
                res.status(400).json({ message: 'A user with this email already exists' });
                return;
            }

            updateData.email = normalizedEmail;
        }

        if (phone !== undefined) {
            const normalizedPhone = normalizePhoneNumber(phone);
            if (!isValidPhoneNumber(normalizedPhone)) {
                res.status(400).json({ message: 'Phone number must be exactly 10 digits' });
                return;
            }
            updateData.phone = normalizedPhone;
        }

        if (designation !== undefined) {
            updateData.designation = normalizeOptionalText(designation) || '';
        }

        if (department !== undefined) {
            updateData.department = normalizeOptionalText(department) || '';
        }

        if (profilePicture !== undefined) {
            updateData.profilePicture = normalizeOptionalText(profilePicture) || undefined;
        }

        if (institutionId !== undefined) {
            const resolvedInstitutionId = normalizeOptionalText(institutionId);

            if (resolvedInstitutionId) {
                const canChangeInstitution =
                    isPrivilegedManager ||
                    (requester.role === 'institutional_admin' && requester.institutionId === resolvedInstitutionId) ||
                    (isSelfUpdate && String(existingUser.institutionId || '') === String(resolvedInstitutionId));

                if (!canChangeInstitution) {
                    res.status(403).json({ message: 'You do not have permission to change this institution' });
                    return;
                }

                const institution = await Institution.findById(resolvedInstitutionId).select('_id');
                if (!institution) {
                    res.status(404).json({ message: 'Institution not found' });
                    return;
                }
            }

            updateData.institutionId = resolvedInstitutionId || undefined;
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true }
        ).populate('institutionId', 'name').lean();

        if (!updatedUser) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        const transformedUser = transformUserForResponse(updatedUser);

        res.status(200).json({ message: 'Profile updated successfully', user: transformedUser });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Error updating user' });
    }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    await updateUser(req, res);
};

export const changePassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.params.userId;
        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(userId);

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        const isValid = await bcrypt.compare(currentPassword, user.password);

        if (!isValid) {
            res.status(400).json({ message: 'Invalid current password' });
            return;
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        user.password = hashedPassword;
        await user.save();

        res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ message: 'Error changing password' });
    }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const authReq = req as AuthRequest;
        const { userId } = req.params;

        // Security: Only master_admin can delete users
        if (authReq.user?.role !== 'master_admin') {
            res.status(403).json({ message: 'Only administrators can delete users' });
            return;
        }

        const user = await User.findById(userId);

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        if (user.isDeleted) {
            res.status(200).json({ message: 'User already removed' });
            return;
        }

        user.isDeleted = true;
        user.deletedAt = new Date();
        user.fcmToken = undefined;
        await user.save();

        await Nomination.updateMany(
            { participantId: userId },
            {
                $set: {
                    'participantSnapshot.isDeleted': true,
                    'participantSnapshot.deletedAt': user.deletedAt,
                },
            }
        );

        await Attendance.updateMany(
            { participantId: userId },
            {
                $set: {
                    'participantSnapshot.isDeleted': true,
                    'participantSnapshot.deletedAt': user.deletedAt,
                },
            }
        );

        const trainings = await Training.find({ 'participantSnapshots.participantId': userId });
        await Promise.all(
            trainings.map(async (training) => {
                training.participantSnapshots = (training.participantSnapshots || []).map((snapshot: any) =>
                    String(snapshot.participantId) === userId ? markSnapshotAsDeleted(snapshot) : snapshot
                ) as any;
                await training.save();
            })
        );

        res.status(200).json({ message: 'User archived successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Error deleting user' });
    }
};

export const addManualParticipant = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { name, email, phone, designation, department, institutionId: bodyInstitutionId } = req.body;
        const normalizedPhone = normalizePhoneNumber(phone);

        if (!name) {
            res.status(400).json({ message: 'Name is required' });
            return;
        }

        if (!isValidPhoneNumber(phone)) {
            res.status(400).json({ message: 'Phone number must be exactly 10 digits' });
            return;
        }

        const resolvedInstitutionId =
            req.user?.role === 'institutional_admin'
                ? req.user.institutionId
                : (bodyInstitutionId || req.user?.institutionId);

        if (!resolvedInstitutionId) {
            res.status(400).json({ message: 'Institution is required' });
            return;
        }

        if (req.user?.role === 'institutional_admin' && req.user.institutionId && bodyInstitutionId && bodyInstitutionId !== req.user.institutionId) {
            res.status(403).json({ message: 'You can only add participants to your institution' });
            return;
        }

        const institution = await Institution.findById(resolvedInstitutionId).select('_id name');
        if (!institution) {
            res.status(404).json({ message: 'Institution not found' });
            return;
        }

        const resolvedEmail = (email?.trim() || generateManualParticipantEmail(name, phone)).toLowerCase();

        const existingUser = await User.findOne({ email: resolvedEmail });
        if (existingUser) {
            res.status(400).json({ message: 'A user with this email already exists' });
            return;
        }

        // Generate a random secure password for manual accounts
        const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(tempPassword, salt);

        const newUser = await User.create({
            name,
            email: resolvedEmail,
            password: hashedPassword,
            phone: normalizedPhone,
            designation,
            department,
            role: 'participant',
            institutionId: resolvedInstitutionId,
            isApproved: true, // Auto-approve manual creations by MO/Admin
        });

        // Exclude password from response
        const userObj = newUser.toObject();
        delete (userObj as any).password;

        res.status(201).json({
            message: 'Participant added successfully',
            user: {
                ...userObj,
                id: (userObj as any)._id,
                institution: {
                    id: institution._id,
                    name: institution.name,
                }
            }
        });
    } catch (error) {
        console.error('Error manually adding participant:', error);
        res.status(500).json({ message: 'Error manually adding participant' });
    }
};
