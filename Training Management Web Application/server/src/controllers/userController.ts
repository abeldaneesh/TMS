import { Request, Response } from 'express';
import User from '../models/User';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../middleware/authMiddleware';

export const getUsers = async (req: Request, res: Response): Promise<void> => {
    try {
        const { role } = req.query;
        const filter: any = {};

        if (role) {
            filter.role = role as string;
        }

        // Only return approved users for this general list
        filter.isApproved = true;

        const users = await User.find(filter)
            .populate('institutionId', 'name')
            .sort({ name: 1 })
            .lean();

        // Transform data to match previous structure (institutionId -> institution)
        const transformedUsers = users.map((user: any) => ({
            ...user,
            id: user._id,
            institution: user.institutionId ? { name: user.institutionId.name } : null
        }));

        res.status(200).json(transformedUsers);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Error fetching users' });
    }
};

export const getPendingUsers = async (req: Request, res: Response): Promise<void> => {
    try {
        const users = await User.find({ isApproved: false })
            .populate('institutionId', 'name')
            .sort({ createdAt: -1 })
            .lean();

        const transformedUsers = users.map((user: any) => ({
            ...user,
            id: user._id,
            institution: user.institutionId ? { name: user.institutionId.name } : null
        }));

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

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.params.userId;
        const { name, phone, designation, department, profilePicture } = req.body;
        const updateData: any = { name, phone, designation, department };
        if (profilePicture) {
            updateData.profilePicture = profilePicture;
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

        const transformedUser = {
            ...updatedUser,
            // @ts-ignore
            id: updatedUser._id,
            // @ts-ignore
            institution: updatedUser.institutionId ? { name: updatedUser.institutionId.name } : null
        };

        res.status(200).json({ message: 'Profile updated successfully', user: transformedUser });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ message: 'Error updating profile' });
    }
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

        const user = await User.findByIdAndDelete(userId);

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Error deleting user' });
    }
};
