import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { usersApi, BASE_URL } from '../../services/api';
import { toast } from 'sonner';
import { User, Lock, Save, Loader2, Camera } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

const Settings: React.FC = () => {
    const { user, updateUser } = useAuth();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Profile State
    const [profileData, setProfileData] = useState({
        name: user?.name || '',
        phone: user?.phone || '',
        designation: user?.designation || '',
        department: user?.department || '',
        profilePicture: user?.profilePicture || '',
    });

    // Sync state when user object changes
    useEffect(() => {
        if (user) {
            setProfileData({
                name: user.name || '',
                phone: user.phone || '',
                designation: user.designation || '',
                department: user.department || '',
                profilePicture: user.profilePicture || '',
            });
        }
    }, [user]);

    // Password State
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setProfileData({ ...profileData, [e.target.name]: e.target.value });
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
    };

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file size and type
        if (file.size > 5 * 1024 * 1024) {
            toast.error('File size exceeds 5MB');
            return;
        }

        const formData = new FormData();
        formData.append('profilePicture', file);

        setUploading(true);
        try {
            const response = await usersApi.uploadProfilePicture(formData);
            if (response.url) {
                setProfileData(prev => ({ ...prev, profilePicture: response.url }));
                toast.success('Image uploaded temporarily. Save changes to keep it.');
            }
        } catch (error: any) {
            console.error('Upload failed:', error);
            toast.error(error.response?.data?.message || 'Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    const onUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);
        try {
            const response = await usersApi.updateProfile(user.id, profileData);
            toast.success('Profile updated successfully');
            if (response.user) {
                updateUser(response.user);
            }
        } catch (error: any) {
            console.error(error);
            toast.error('Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const onChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }

        setLoading(true);
        try {
            await usersApi.changePassword(user.id, {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });
            toast.success('Password changed successfully');
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="pb-12 space-y-6 text-foreground max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        {t('settings.title', 'Settings')}
                    </h1>
                    <p className="text-muted-foreground mt-2 text-sm">
                        {t('settings.subtitle', 'Manage your account configuration and security')}
                    </p>
                </div>
            </div>

            <Tabs defaultValue="profile" className="w-full">
                <TabsList className="bg-transparent border-b border-border w-full flex justify-start rounded-none h-auto p-0 gap-6 mb-8">
                    <TabsTrigger value="profile" className="data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:border-foreground bg-transparent border-b-2 border-transparent text-muted-foreground rounded-none py-3 px-1 font-semibold text-base transition-colors">
                        {t('settings.tabs.profile', 'Profile')}
                    </TabsTrigger>
                    <TabsTrigger value="security" className="data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:border-foreground bg-transparent border-b-2 border-transparent text-muted-foreground rounded-none py-3 px-1 font-semibold text-base transition-colors">
                        {t('settings.tabs.security', 'Security')}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="mt-0 focus-visible:outline-none">
                    <Card className="bg-card shadow-sm border-border">
                        <CardHeader className="flex flex-row items-center gap-4">
                            <div className="relative group">
                                <Avatar className="size-20 border-2 border-primary/20">
                                    {profileData.profilePicture && (
                                        <AvatarImage src={profileData.profilePicture.startsWith('http') ? profileData.profilePicture : `${BASE_URL}${profileData.profilePicture}`} alt={profileData.name} />
                                    )}
                                    <AvatarFallback className="bg-blue-600 text-white text-xl">
                                        {profileData.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="absolute -bottom-1 -right-1">
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="outline"
                                        className="size-7 rounded-full bg-background shadow-sm hover:bg-muted"
                                        disabled={uploading}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        {uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
                                    </Button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={onFileChange}
                                        className="hidden"
                                        accept="image/*"
                                    />
                                </div>
                            </div>
                            <div>
                                <CardTitle>{t('settings.profile.title', 'Personal Information')}</CardTitle>
                                <CardDescription>{t('settings.profile.desc', 'Update your personal details and profile picture URL.')}</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={onUpdateProfile} className="space-y-4">


                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">{t('settings.profile.fullName', 'Full Name')}</Label>
                                        <Input
                                            id="name"
                                            name="name"
                                            value={profileData.name}
                                            onChange={handleProfileChange}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">{t('settings.profile.email', 'Email')}</Label>
                                        <Input
                                            id="email"
                                            value={user?.email || ''}
                                            readOnly
                                            className="bg-muted text-muted-foreground cursor-not-allowed"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">{t('settings.profile.phone', 'Phone Number')}</Label>
                                        <Input
                                            id="phone"
                                            name="phone"
                                            value={profileData.phone}
                                            onChange={handleProfileChange}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="designation">{t('settings.profile.designation', 'Designation')}</Label>
                                        <Input
                                            id="designation"
                                            name="designation"
                                            value={profileData.designation}
                                            onChange={handleProfileChange}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="department">{t('settings.profile.department', 'Department')}</Label>
                                        <Input
                                            id="department"
                                            name="department"
                                            value={profileData.department}
                                            onChange={handleProfileChange}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="role">{t('settings.profile.role', 'Role')}</Label>
                                        <Input
                                            id="role"
                                            value={user?.role?.replace('_', ' ') || ''}
                                            readOnly
                                            className="bg-muted capitalize text-muted-foreground cursor-not-allowed"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <Button type="submit" disabled={loading}>
                                        {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                                        {t('settings.profile.save', 'Save Changes')}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="security" className="mt-0 focus-visible:outline-none">
                    <Card className="bg-card shadow-sm border-border">
                        <CardHeader>
                            <CardTitle>{t('settings.security.title', 'Change Password')}</CardTitle>
                            <CardDescription>{t('settings.security.desc', 'Ensure your account is secure by using a strong password.')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={onChangePassword} className="space-y-4 max-w-md">
                                <div className="space-y-2">
                                    <Label htmlFor="currentPassword">{t('settings.security.currentPassword', 'Current Password')}</Label>
                                    <Input
                                        id="currentPassword"
                                        name="currentPassword"
                                        type="password"
                                        value={passwordData.currentPassword}
                                        onChange={handlePasswordChange}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="newPassword">{t('settings.security.newPassword', 'New Password')}</Label>
                                    <Input
                                        id="newPassword"
                                        name="newPassword"
                                        type="password"
                                        value={passwordData.newPassword}
                                        onChange={handlePasswordChange}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">{t('settings.security.confirmPassword', 'Confirm New Password')}</Label>
                                    <Input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type="password"
                                        value={passwordData.confirmPassword}
                                        onChange={handlePasswordChange}
                                        required
                                    />
                                </div>

                                <div className="pt-4">
                                    <Button type="submit" disabled={loading} variant="destructive">
                                        {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Lock className="mr-2 size-4" />}
                                        {t('settings.security.update', 'Update Password')}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default Settings;
