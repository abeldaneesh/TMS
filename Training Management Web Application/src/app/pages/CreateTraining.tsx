import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { trainingsApi, hallsApi, institutionsApi, hallRequestsApi } from '../../services/api';
import api from '../../services/api';
import { Hall, Institution, TrainingStatus } from '../../types';
import { Calendar, Save, ArrowLeft, AlertCircle, FileQuestion } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from 'sonner';

const CreateTraining: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;

  const [halls, setHalls] = useState<Hall[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [availableHalls, setAvailableHalls] = useState<Hall[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Hall Request State
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [requestPriority, setRequestPriority] = useState<'normal' | 'urgent'>('normal');
  const [requestRemarks, setRequestRemarks] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    program: '',
    targetAudience: '',
    date: '',
    startTime: '',
    endTime: '',
    hallId: '',
    capacity: '',
    requiredInstitutions: [] as string[],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [hallsData, institutionsData] = await Promise.all([
          hallsApi.getAll(),
          institutionsApi.getAll(),
        ]);
        setHalls(hallsData);
        setInstitutions(institutionsData);

        if (isEditMode && id) {
          // Fetch training details to edit
          // Note: MockApi might need getById. Checking api usage elsewhere.
          // Usually api.get(`/trainings/${id}`)
          try {
            // Using the direct axios instance if mockApi doesn't expose getById explicitly yet
            // Or assuming trainingsApi.getAll() returns all and filtering (less efficient but works for mock)
            // Let's rely on api call pattern seen in Trainings.tsx
            const response = await api.get(`/trainings/${id}`);
            const training = response.data;

            setFormData({
              title: training.title,
              description: training.description,
              program: training.program,
              targetAudience: training.targetAudience,
              date: new Date(training.date).toISOString().split('T')[0],
              startTime: training.startTime,
              endTime: training.endTime,
              hallId: training.hallId,
              capacity: training.capacity.toString(),
              requiredInstitutions: training.requiredInstitutions || [],
            });
          } catch (err) {
            console.error("Failed to fetch training", err);
            toast.error("Failed to load training details");
            navigate('/trainings');
          }
        }

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setInitialLoading(false);
      }
    };
    fetchData();
  }, [id, isEditMode, navigate]);

  const checkHallAvailability = async () => {
    if (!formData.date || !formData.startTime || !formData.endTime) {
      setErrors({ ...errors, hall: 'Please select date and time first' });
      return;
    }

    setCheckingAvailability(true);
    try {
      const available = await hallsApi.getAvailableHalls(
        new Date(formData.date),
        formData.startTime,
        formData.endTime
      );
      setAvailableHalls(available);

      if (available.length === 0) {
        toast.error('No halls available for the selected time slot');
      } else {
        toast.success(`${available.length} hall(s) available`);
      }
    } catch (error) {
      console.error('Error checking availability:', error);
      toast.error('Error checking hall availability');
    } finally {
      setCheckingAvailability(false);
    }
  };

  const [unavailableReason, setUnavailableReason] = useState<string | null>(null);

  // Check details if selected hall is unavailable
  useEffect(() => {
    const checkDetails = async () => {
      if (!formData.hallId || !formData.date || !formData.startTime || !formData.endTime) return;

      // Only check if we know it's unavailable or just to be sure when selecting a hall
      // If hallId is selected, and it's NOT in availableHalls (if availableHalls is populated)
      // Or we can just ALWAYS fetch details for the selected hall to get the reason if ANY.

      try {
        const details = await hallsApi.getAvailabilityDetails(
          formData.hallId,
          new Date(formData.date),
          formData.startTime,
          formData.endTime
        );

        if (!details.isAvailable) {
          setUnavailableReason(details.reason || 'Unavailable');
        } else {
          setUnavailableReason(null);
        }
      } catch (error) {
        console.error(error);
      }
    };

    if (formData.hallId && formData.date && formData.startTime && formData.endTime) {
      checkDetails();
    }
  }, [formData.hallId, formData.date, formData.startTime, formData.endTime]);

  useEffect(() => {
    if (formData.date && formData.startTime && formData.endTime) {
      checkHallAvailability();
    }
  }, [formData.date, formData.startTime, formData.endTime]);

  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const toggleInstitution = (institutionId: string) => {
    const current = formData.requiredInstitutions;
    if (current.includes(institutionId)) {
      handleChange('requiredInstitutions', current.filter(id => id !== institutionId));
    } else {
      handleChange('requiredInstitutions', [...current, institutionId]);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.program.trim()) newErrors.program = 'Program is required';
    if (!formData.targetAudience.trim()) newErrors.targetAudience = 'Target audience is required';
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.startTime) newErrors.startTime = 'Start time is required';
    if (!formData.endTime) newErrors.endTime = 'End time is required';
    if (!formData.hallId) newErrors.hallId = 'Hall is required';
    if (!formData.capacity || parseInt(formData.capacity) <= 0) newErrors.capacity = 'Valid capacity is required';
    if (formData.requiredInstitutions.length === 0) newErrors.requiredInstitutions = 'Select at least one institution';

    if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
      newErrors.endTime = 'End time must be after start time';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    if (!user) return;

    setLoading(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        program: formData.program,
        targetAudience: formData.targetAudience,
        date: new Date(formData.date),
        startTime: formData.startTime,
        endTime: formData.endTime,
        hallId: formData.hallId,
        capacity: parseInt(formData.capacity),
        requiredInstitutions: formData.requiredInstitutions,
        status: 'scheduled' as TrainingStatus,
      };

      if (isEditMode && id) {
        await api.put(`/trainings/${id}`, payload);
        toast.success('Training updated successfully!');
      } else {
        await trainingsApi.create({
          ...payload,
          trainerId: user.id,
          createdById: user.id,
        });
        toast.success('Training created successfully!');
      }
      navigate('/trainings');
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || error.message || 'Error saving training');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestHall = async () => {
    if (!user) return;

    if (!formData.hallId) {
      toast.error("Please select a hall first");
      return;
    }

    setRequestLoading(true);
    try {
      let trainingId = id;

      // If not in edit mode (new training), creates a draft first
      if (!trainingId) {
        const payload = {
          title: formData.title,
          description: formData.description,
          program: formData.program,
          targetAudience: formData.targetAudience,
          date: new Date(formData.date),
          startTime: formData.startTime,
          endTime: formData.endTime,
          hallId: formData.hallId,
          capacity: parseInt(formData.capacity),
          requiredInstitutions: formData.requiredInstitutions,
          status: 'draft' as TrainingStatus
        };

        // Validate minimal fields for draft? 
        // At least title and hall/date are needed for the request context.
        if (!formData.title) {
          toast.error("Please enter a title");
          setRequestLoading(false);
          return;
        }

        const newTraining = await trainingsApi.create({
          ...payload,
          trainerId: user.id,
          createdById: user.id
        });
        trainingId = newTraining.id;
      }

      await hallRequestsApi.create({
        trainingId: trainingId,
        hallId: formData.hallId,
        priority: requestPriority,
        remarks: requestRemarks
      });

      toast.success('Hall request submitted successfully!');
      setShowRequestDialog(false);
      navigate('/trainings');

    } catch (error: any) {
      console.error('Error submitting request:', error);
      toast.error(error.message || 'Failed to submit hall request');
    } finally {
      setRequestLoading(false);
    }
  };

  const programs = [
    'Emergency Medicine',
    'Infection Control',
    'MCH Program',
    'Digital Health',
    'TB Control Program',
    'Mental Health',
    'Immunization',
    'AYUSH',
    'Other',
  ];

  if (initialLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate('/trainings')}>
          <ArrowLeft className="size-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{isEditMode ? 'Edit Training' : 'Create Training'}</h1>
          <p className="text-gray-500 mt-1">{isEditMode ? 'Update training details' : 'Schedule a new training session'}</p>
        </div>
      </div>

      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Hall Approval</DialogTitle>
            <DialogDescription>
              Submit a request to the Admin for this hall booking.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Training Title</Label>
              <Input value={formData.title} disabled className="bg-gray-100" />
            </div>
            <div>
              <Label>Requested Hall</Label>
              <Input value={halls.find(h => h.id === formData.hallId)?.name || ''} disabled className="bg-gray-100" />
            </div>
            <div>
              <Label>Time Slot</Label>
              <Input value={`${new Date(formData.date).toLocaleDateString()} | ${formData.startTime} - ${formData.endTime}`} disabled className="bg-gray-100" />
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={requestPriority} onValueChange={(val: any) => setRequestPriority(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Remarks (Optional)</Label>
              <Textarea
                value={requestRemarks}
                onChange={(e) => setRequestRemarks(e.target.value)}
                placeholder="Reason for urgency or special requirements..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestDialog(false)}>Cancel</Button>
            <Button onClick={handleRequestHall} disabled={requestLoading}>
              {requestLoading ? 'Sending...' : 'Send Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Enter the training details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Training Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="e.g., Emergency Response & First Aid"
              />
              {errors.title && <p className="text-sm text-red-600 mt-1">{errors.title}</p>}
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Detailed description of the training program"
                rows={4}
              />
              {errors.description && <p className="text-sm text-red-600 mt-1">{errors.description}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="program">Program *</Label>
                <Select value={formData.program} onValueChange={(value) => handleChange('program', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select program" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map((program) => (
                      <SelectItem key={program} value={program}>
                        {program}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.program && <p className="text-sm text-red-600 mt-1">{errors.program}</p>}
              </div>

              <div>
                <Label htmlFor="targetAudience">Target Audience *</Label>
                <Input
                  id="targetAudience"
                  value={formData.targetAudience}
                  onChange={(e) => handleChange('targetAudience', e.target.value)}
                  placeholder="e.g., Nurses, Doctors, All Staff"
                />
                {errors.targetAudience && <p className="text-sm text-red-600 mt-1">{errors.targetAudience}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schedule & Venue</CardTitle>
            <CardDescription>Set the date, time, and location</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
                {errors.date && <p className="text-sm text-red-600 mt-1">{errors.date}</p>}
              </div>

              <div>
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => handleChange('startTime', e.target.value)}
                />
                {errors.startTime && <p className="text-sm text-red-600 mt-1">{errors.startTime}</p>}
              </div>

              <div>
                <Label htmlFor="endTime">End Time *</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => handleChange('endTime', e.target.value)}
                />
                {errors.endTime && <p className="text-sm text-red-600 mt-1">{errors.endTime}</p>}
              </div>
            </div>

            {formData.date && formData.startTime && formData.endTime && (
              <div className="space-y-4">
                <Alert variant={availableHalls.length > 0 ? "default" : "destructive"}>
                  <AlertCircle className="size-4" />
                  <AlertDescription>
                    {checkingAvailability ? (
                      'Checking hall availability...'
                    ) : availableHalls.length > 0 ? (
                      `${availableHalls.length} hall(s) available for the selected time slot`
                    ) : (
                      'No halls available for the selected time slot.'
                    )}
                  </AlertDescription>
                </Alert>

                {/* Show Request Button if NO halls available, OR if selected hall is NOT in available list */}
                {!checkingAvailability && (availableHalls.length === 0 || (formData.hallId && !availableHalls.find(h => h.id === formData.hallId))) && (
                  <div className="p-4 border rounded-md bg-yellow-50 border-yellow-200">
                    <h4 className="font-semibold text-yellow-800 flex items-center gap-2">
                      <AlertCircle className="size-5" />
                      Hall Not Available
                    </h4>
                    <p className="text-sm text-yellow-700 mt-1 mb-3">
                      {unavailableReason
                        ? <span className="font-semibold">{unavailableReason}</span>
                        : "The selected hall is booked or blocked."}
                      <br />
                      You can submit a request to the Admin for approval.
                    </p>
                    <Button
                      type="button"
                      className="bg-yellow-600 hover:bg-yellow-700 text-white"
                      onClick={() => {
                        if (!validateForm()) {
                          toast.error('Please fill all training details first');
                          return;
                        }
                        setShowRequestDialog(true);
                      }}
                    >
                      <FileQuestion className="size-4 mr-2" />
                      Request Hall Approval
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hallId">Hall *</Label>
                <Select
                  value={formData.hallId}
                  onValueChange={(value) => handleChange('hallId', value)}
                  disabled={availableHalls.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select hall" />
                  </SelectTrigger>
                  <SelectContent>
                    {(availableHalls.length > 0 ? availableHalls : halls).map((hall) => (
                      <SelectItem key={hall.id} value={hall.id}>
                        {hall.name} - Capacity: {hall.capacity} {availableHalls.find(h => h.id === hall.id) ? '(Available)' : '(Unavailable)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.hallId && <p className="text-sm text-red-600 mt-1">{errors.hallId}</p>}
              </div>

              <div>
                <Label htmlFor="capacity">Training Capacity *</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => handleChange('capacity', e.target.value)}
                  placeholder="Maximum participants"
                  min="1"
                />
                {errors.capacity && <p className="text-sm text-red-600 mt-1">{errors.capacity}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Required Institutions</CardTitle>
            <CardDescription>Select institutions to nominate participants from</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {institutions.map((institution) => (
                <div key={institution.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={institution.id}
                    checked={formData.requiredInstitutions.includes(institution.id)}
                    onCheckedChange={() => toggleInstitution(institution.id)}
                  />
                  <label
                    htmlFor={institution.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {institution.name} ({institution.type})
                  </label>
                </div>
              ))}
            </div>
            {errors.requiredInstitutions && (
              <p className="text-sm text-red-600 mt-2">{errors.requiredInstitutions}</p>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={loading} className="flex items-center gap-2">
            <Save className="size-4" />
            {loading ? 'Saving...' : (isEditMode ? 'Update Training' : 'Create Training')}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/trainings')}>
            Cancel
          </Button>
        </div>
      </form>

      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Hall Approval</DialogTitle>
            <DialogDescription>
              Submit a request to the Admin for this hall booking.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Training Title</Label>
              <Input value={formData.title} disabled className="bg-gray-100" />
            </div>
            <div>
              <Label>Requested Hall</Label>
              <Input value={halls.find(h => h.id === formData.hallId)?.name || ''} disabled className="bg-gray-100" />
            </div>
            <div>
              <Label>Time Slot</Label>
              <Input value={`${new Date(formData.date).toLocaleDateString()} | ${formData.startTime} - ${formData.endTime}`} disabled className="bg-gray-100" />
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={requestPriority} onValueChange={(val: any) => setRequestPriority(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Remarks (Optional)</Label>
              <Textarea
                value={requestRemarks}
                onChange={(e) => setRequestRemarks(e.target.value)}
                placeholder="Reason for urgency or special requirements..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestDialog(false)}>Cancel</Button>
            <Button onClick={handleRequestHall} disabled={requestLoading}>
              {requestLoading ? 'Sending...' : 'Send Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreateTraining;
