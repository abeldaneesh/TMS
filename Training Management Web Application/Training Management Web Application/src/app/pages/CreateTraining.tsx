import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import LoadingAnimation from '../components/LoadingAnimation';
import { trainingsApi, hallsApi, institutionsApi, hallRequestsApi } from '../../services/api';
import api from '../../services/api';
import { Hall, Institution, TrainingStatus } from '../../types';
import { AlertCircle, ArrowLeft, CheckCircle2, Clock3, DoorOpen, FileQuestion, MapPin, Save, Sparkles, Users, XCircle } from 'lucide-react';
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
import { MultiSelect } from '../components/ui/multi-select';
import { ClockTimePicker } from '../components/ui/clock-time-picker';
import { motion } from 'framer-motion';

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

const targetAudienceOptions = [
  'Program Officer',
  'Charge Medical Officer',
  'Block Medical Officer',
  'Health Supervisor',
  'Public Health Nurse Supervisor',
  'Health Inspector',
  'Public Health Nurse',
  'Junior Health Inspector',
  'Junior Public Health Nurse',
  'Mid Level Service Provider',
  'Nursing Officer',
  'Senior Nursing Officer',
  'Pharmacist',
  'Lab Technician',
  'RBSK Nurse',
  'Primary Palliative Nurse',
  'Secondary Palliative Nurse',
  'Physiotherapist',
  'Nursing Assistant',
  'Block Epidemiologist',
  'Entomologist',
  'Data Manager',
  'Ministerial Staff',
  'PH Admins',
  'One Health LSGD Mentor',
  'Other',
];

const presetTargetAudienceOptions = targetAudienceOptions.filter((option) => option !== 'Other');

const getTrainingSessionType = (startTime: string, endTime: string) => {
  if (startTime === '10:00' && endTime === '13:30') return 'morning';
  if (startTime === '14:00' && endTime === '17:00') return 'afternoon';
  if (startTime === '10:00' && endTime === '17:00') return 'fullday';
  if (startTime || endTime) return 'custom';
  return '';
};

const isPresetTrainingSession = (startTime: string, endTime: string) =>
  getTrainingSessionType(startTime, endTime) !== 'custom' &&
  getTrainingSessionType(startTime, endTime) !== '';

const normalizeTargetAudienceForForm = (value: string[] | string | undefined) => {
  const audienceList = Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];
  const presetSelections = audienceList.filter((audience) => presetTargetAudienceOptions.includes(audience));
  const customSelections = audienceList.filter((audience) => !targetAudienceOptions.includes(audience));

  if (audienceList.length === 0) {
    return {
      targetAudience: [] as string[],
      customTargetAudience: '',
    };
  }

  if (customSelections.length === 0) {
    return {
      targetAudience: presetSelections,
      customTargetAudience: '',
    };
  }

  return {
    targetAudience: [...presetSelections, 'Other'],
    customTargetAudience: customSelections.join(', '),
  };
};

const CreateTraining: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const { t } = useTranslation();
  const prefilledDateFromRoute = (location.state as { selectedDate?: string } | null)?.selectedDate || queryParams.get('date') || '';

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
    customProgram: '',
    targetAudience: [] as string[],
    customTargetAudience: '',
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
          try {
            const response = await api.get(`/trainings/${id}`);
            const training = response.data;

            const isCustomProgram = !programs.includes(training.program);
            const normalizedTargetAudience = normalizeTargetAudienceForForm(training.targetAudience);

            setFormData({
              title: training.title,
              description: training.description,
              program: isCustomProgram ? 'Other' : training.program,
              customProgram: isCustomProgram ? training.program : '',
              targetAudience: normalizedTargetAudience.targetAudience,
              customTargetAudience: normalizedTargetAudience.customTargetAudience,
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
        } else if (location.state?.prefilledTraining) {
          const training = location.state.prefilledTraining;
          const isCustomProgram = !programs.includes(training.program);
          const normalizedTargetAudience = normalizeTargetAudienceForForm(training.targetAudience);
          setFormData(prev => ({
            ...prev,
            title: training.title,
            description: training.description,
            program: isCustomProgram ? 'Other' : training.program,
            customProgram: isCustomProgram ? training.program : '',
            targetAudience: normalizedTargetAudience.targetAudience,
            customTargetAudience: normalizedTargetAudience.customTargetAudience,
            date: /^\d{4}-\d{2}-\d{2}$/.test(prefilledDateFromRoute)
              ? prefilledDateFromRoute
              : prev.date,
            capacity: training.capacity?.toString() || '',
            requiredInstitutions: training.requiredInstitutions || [],
          }));

          // Clear location state to prevent re-filling if user navigates away and back via back button
          window.history.replaceState({}, document.title)
        } else if (prefilledDateFromRoute) {
          setFormData(prev => ({
            ...prev,
            date: /^\d{4}-\d{2}-\d{2}$/.test(prefilledDateFromRoute) ? prefilledDateFromRoute : prev.date,
          }));
        }

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setInitialLoading(false);
      }
    };
    fetchData();
  }, [id, isEditMode, navigate, location.state, prefilledDateFromRoute]);

  const checkHallAvailability = async () => {
    if (!formData.date || !formData.startTime || !formData.endTime) {
      setErrors({ ...errors, hall: 'Please select date and time first' });
      return;
    }

    setCheckingAvailability(true);
    try {
      const available = await hallsApi.getAvailableHalls(
        formData.date,
        formData.startTime,
        formData.endTime,
        isEditMode ? id : undefined
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
  const selectedHall = useMemo(
    () => halls.find((hall) => hall.id === formData.hallId) || null,
    [halls, formData.hallId]
  );
  const requestedCapacity = formData.capacity ? parseInt(formData.capacity, 10) : 0;
  const capacityExceedsSelectedHall = Boolean(
    selectedHall && formData.capacity && requestedCapacity > selectedHall.capacity
  );
  const capacityLimitMessage = capacityExceedsSelectedHall && selectedHall
    ? `The selected hall can host only ${selectedHall.capacity} participants. Please reduce the training capacity to ${selectedHall.capacity} or choose a larger hall.`
    : '';
  const hasInvalidTimeRange = Boolean(
    formData.startTime &&
    formData.endTime &&
    formData.startTime >= formData.endTime
  );
  const timeRangeMessage = hasInvalidTimeRange
    ? 'The selected time range is not applicable. Please choose an end time that is later than the start time.'
    : '';
  const canCheckAvailability = Boolean(
    formData.date &&
    formData.startTime &&
    formData.endTime &&
    !hasInvalidTimeRange
  );
  const selectedSessionType = getTrainingSessionType(formData.startTime, formData.endTime);
  const hallCards = useMemo(() => {
    const availableHallIds = new Set(availableHalls.map((hall) => hall.id));

    return halls.map((hall) => {
      const isAvailable = availableHallIds.has(hall.id);
      const isSelected = formData.hallId === hall.id;
      const status = !canCheckAvailability ? 'idle' : isAvailable ? 'available' : 'booked';

      return {
        ...hall,
        isAvailable,
        isSelected,
        status,
      };
    });
  }, [availableHalls, canCheckAvailability, formData.hallId, halls]);

  useEffect(() => {
    const checkDetails = async () => {
      if (!formData.hallId || !formData.date || !formData.startTime || !formData.endTime || hasInvalidTimeRange) return;

      try {
        const details = await hallsApi.getAvailabilityDetails(
          formData.hallId,
          formData.date,
          formData.startTime,
          formData.endTime,
          isEditMode ? id : undefined
        );

        if (!details.isAvailable) {
          setUnavailableReason(details.reason || 'Hall is not available for this time slot');
        } else {
          setUnavailableReason(null);
        }
      } catch (error) {
        console.error('Error checking hall details:', error);
      }
    };

    if (formData.hallId && formData.date && formData.startTime && formData.endTime && !hasInvalidTimeRange) {
      checkDetails();
    }
  }, [formData.hallId, formData.date, formData.startTime, formData.endTime, hasInvalidTimeRange, isEditMode, id]);

  useEffect(() => {
    if (formData.date && formData.startTime && formData.endTime && !hasInvalidTimeRange) {
      checkHallAvailability();
    }
  }, [formData.date, formData.startTime, formData.endTime, hasInvalidTimeRange]);

  useEffect(() => {
    if (hasInvalidTimeRange) {
      setAvailableHalls([]);
      setUnavailableReason(null);
    }
  }, [hasInvalidTimeRange]);

  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const handleTargetAudienceChange = (value: string[]) => {
    setFormData((prev) => ({
      ...prev,
      targetAudience: value,
      customTargetAudience: value.includes('Other') ? prev.customTargetAudience : '',
    }));
    setErrors((prev) => ({
      ...prev,
      targetAudience: '',
      customTargetAudience: value.includes('Other') ? prev.customTargetAudience : '',
    }));
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
    if (formData.program === 'Other' && (!formData.customProgram || !formData.customProgram.trim())) {
      newErrors.customProgram = 'Custom program name is required';
    }
    if (formData.targetAudience.length === 0) newErrors.targetAudience = 'Select at least one target audience';
    if (formData.targetAudience.includes('Other') && (!formData.customTargetAudience || !formData.customTargetAudience.trim())) {
      newErrors.customTargetAudience = 'Custom target audience is required';
    }
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.startTime) newErrors.startTime = 'Start time is required';
    if (!formData.endTime) newErrors.endTime = 'End time is required';
    if (!formData.hallId) newErrors.hallId = 'Hall is required';
    if (!formData.capacity || parseInt(formData.capacity) <= 0) newErrors.capacity = 'Valid capacity is required';
    if (selectedHall && formData.capacity && parseInt(formData.capacity) > selectedHall.capacity) {
      newErrors.capacity = `Capacity cannot exceed ${selectedHall.capacity} seats for the selected hall`;
    }
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
        program: formData.program === 'Other' ? formData.customProgram : formData.program,
        targetAudience: formData.targetAudience.map((audience) =>
          audience === 'Other' ? formData.customTargetAudience.trim() : audience
        ),
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

      if (!trainingId) {
        const payload = {
          title: formData.title,
          description: formData.description,
          program: formData.program === 'Other' ? formData.customProgram : formData.program,
          targetAudience: formData.targetAudience.map((audience) =>
            audience === 'Other' ? formData.customTargetAudience.trim() : audience
          ),
          date: new Date(formData.date),
          startTime: formData.startTime,
          endTime: formData.endTime,
          hallId: formData.hallId,
          capacity: parseInt(formData.capacity),
          requiredInstitutions: formData.requiredInstitutions,
          status: 'draft' as TrainingStatus
        };

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



  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <LoadingAnimation text={t('createTraining.saving', 'Loading...')} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate('/trainings')}>
          <ArrowLeft className="size-4 mr-2" />
          {t('createTraining.back', 'Back')}
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{isEditMode ? t('createTraining.titleEdit', 'Edit Training') : t('createTraining.titleCreate', 'Create Training')}</h1>
          <p className="text-gray-500 mt-1">{isEditMode ? t('createTraining.descEdit', 'Update training details') : t('createTraining.descCreate', 'Schedule a new training session')}</p>
        </div>
      </div>

      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('createTraining.dialog.title', 'Request Hall Approval')}</DialogTitle>
            <DialogDescription>
              {t('createTraining.dialog.desc', 'Submit a request to the Admin for this hall booking.')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>{t('createTraining.fields.title', 'Training Title *')}</Label>
              <Input value={formData.title} disabled className="bg-gray-100" />
            </div>
            <div>
              <Label>{t('createTraining.dialog.requestedHall', 'Requested Hall')}</Label>
              <Input value={halls.find(h => h.id === formData.hallId)?.name || ''} disabled className="bg-gray-100" />
            </div>
            <div>
              <Label>{t('createTraining.dialog.timeSlot', 'Time Slot')}</Label>
              <Input value={`${new Date(formData.date).toLocaleDateString()} | ${formData.startTime} - ${formData.endTime}`} disabled className="bg-gray-100" />
            </div>
            <div>
              <Label>{t('createTraining.dialog.priority', 'Priority')}</Label>
              <Select value={requestPriority} onValueChange={(val: any) => setRequestPriority(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">{t('createTraining.dialog.normal', 'Normal')}</SelectItem>
                  <SelectItem value="urgent">{t('createTraining.dialog.urgent', 'Urgent')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('createTraining.dialog.remarks', 'Remarks (Optional)')}</Label>
              <Textarea
                value={requestRemarks}
                onChange={(e) => setRequestRemarks(e.target.value)}
                placeholder={t('createTraining.dialog.remarksPlaceholder', 'Reason for urgency or special requirements...')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestDialog(false)}>{t('createTraining.buttons.cancel', 'Cancel')}</Button>
            <Button onClick={handleRequestHall} disabled={requestLoading}>
              {requestLoading ? t('createTraining.buttons.sending', 'Sending...') : t('createTraining.buttons.sendRequest', 'Send Request')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('createTraining.sections.basic.title', 'Basic Information')}</CardTitle>
            <CardDescription>{t('createTraining.sections.basic.desc', 'Enter the training details')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">{t('createTraining.fields.title', 'Training Title *')}</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder={t('createTraining.fields.titlePlaceholder', 'e.g., Emergency Response & First Aid')}
              />
              {errors.title && <p className="text-sm text-red-600 mt-1">{errors.title}</p>}
            </div>

            <div>
              <Label htmlFor="description">{t('createTraining.fields.desc', 'Description *')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder={t('createTraining.fields.descPlaceholder', 'Detailed description of the training program')}
                rows={4}
              />
              {errors.description && <p className="text-sm text-red-600 mt-1">{errors.description}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="program">{t('createTraining.fields.program', 'Program *')}</Label>
                <Select value={formData.program} onValueChange={(value) => handleChange('program', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('createTraining.fields.programPlaceholder', 'Select program')} />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map((program) => (
                      <SelectItem key={program} value={program}>
                        {program}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.program === 'Other' && (
                  <div className="mt-3">
                    <Input
                      value={formData.customProgram}
                      onChange={(e) => handleChange('customProgram', e.target.value)}
                      placeholder={t('createTraining.fields.customProgramPlaceholder', 'Enter custom program name')}
                    />
                    {errors.customProgram && <p className="text-sm text-red-600 mt-1">{errors.customProgram}</p>}
                  </div>
                )}
                {errors.program && <p className="text-sm text-red-600 mt-1">{errors.program}</p>}
              </div>

              <div>
                <Label htmlFor="targetAudience">{t('createTraining.fields.targetAudience', 'Target Audience *')}</Label>
                <MultiSelect
                  options={targetAudienceOptions.map((audience) => ({ label: audience, value: audience }))}
                  selected={formData.targetAudience}
                  onChange={handleTargetAudienceChange}
                  placeholder={t('createTraining.fields.targetAudiencePlaceholder', 'Select target audience')}
                />
                {formData.targetAudience.includes('Other') && (
                  <div className="mt-3">
                    <Input
                      value={formData.customTargetAudience}
                      onChange={(e) => handleChange('customTargetAudience', e.target.value)}
                      placeholder={t('createTraining.fields.customTargetAudiencePlaceholder', 'Enter custom audience')}
                    />
                    {errors.customTargetAudience && <p className="text-sm text-red-600 mt-1">{errors.customTargetAudience}</p>}
                  </div>
                )}
                {errors.targetAudience && <p className="text-sm text-red-600 mt-1">{errors.targetAudience}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('createTraining.sections.schedule.title', 'Schedule & Venue')}</CardTitle>
            <CardDescription>{t('createTraining.sections.schedule.desc', 'Set the date, time, and location')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">{t('createTraining.fields.date', 'Date *')}</Label>
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
                <Label htmlFor="session">{t('createTraining.fields.session', 'Training Session *')}</Label>
                <Select
                  value={selectedSessionType}
                  onValueChange={(val) => {
                    if (val === 'morning') {
                      setFormData(prev => ({ ...prev, startTime: '10:00', endTime: '13:30' }));
                      setErrors(prev => ({ ...prev, startTime: '', endTime: '' }));
                    } else if (val === 'afternoon') {
                      setFormData(prev => ({ ...prev, startTime: '14:00', endTime: '17:00' }));
                      setErrors(prev => ({ ...prev, startTime: '', endTime: '' }));
                    } else if (val === 'fullday') {
                      setFormData(prev => ({ ...prev, startTime: '10:00', endTime: '17:00' }));
                      setErrors(prev => ({ ...prev, startTime: '', endTime: '' }));
                    } else if (val === 'custom') {
                      setFormData(prev => {
                        const nextStartTime = isPresetTrainingSession(prev.startTime, prev.endTime)
                          ? '09:00'
                          : (prev.startTime || '09:00');
                        const nextEndTime = isPresetTrainingSession(prev.startTime, prev.endTime)
                          ? '16:00'
                          : (prev.endTime || '17:00');

                        return {
                          ...prev,
                          startTime: nextStartTime,
                          endTime: nextEndTime,
                        };
                      });
                      setErrors(prev => ({ ...prev, startTime: '', endTime: '' }));
                    }
                  }}
                >
                  <SelectTrigger className={errors.startTime || errors.endTime ? "border-red-500" : ""}>
                    <SelectValue placeholder={t('createTraining.fields.sessionPlaceholder', 'Select session')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning (10:00 AM - 1:30 PM)</SelectItem>
                    <SelectItem value="afternoon">Afternoon (2:00 PM - 5:00 PM)</SelectItem>
                    <SelectItem value="fullday">Full Day (10:00 AM - 5:00 PM)</SelectItem>
                    <SelectItem value="custom">Custom Time</SelectItem>
                  </SelectContent>
                </Select>
                {(errors.startTime || errors.endTime) && <p className="text-sm text-red-600 mt-1">{errors.startTime || errors.endTime}</p>}
                {timeRangeMessage && <p className="text-sm text-amber-400 mt-1">{timeRangeMessage}</p>}
              </div>
            </div>

            {(selectedSessionType === 'custom') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime">{t('createTraining.fields.startTime', 'Custom Start Time *')}</Label>
                  <ClockTimePicker
                    value={formData.startTime}
                    onChange={(val) => handleChange('startTime', val)}
                    className={errors.startTime ? "border-red-500" : ""}
                  />
                  {errors.startTime && <p className="text-sm text-red-600 mt-1">{errors.startTime}</p>}
                </div>
                <div>
                  <Label htmlFor="endTime">{t('createTraining.fields.endTime', 'Custom End Time *')}</Label>
                  <ClockTimePicker
                    value={formData.endTime}
                    onChange={(val) => handleChange('endTime', val)}
                    className={errors.endTime ? "border-red-500" : ""}
                  />
                  {errors.endTime && <p className="text-sm text-red-600 mt-1">{errors.endTime}</p>}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-border bg-card p-5 text-foreground shadow-sm md:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Hall Selection</p>
                  <h3 className="mt-1 text-xl font-semibold text-foreground">Choose the best venue for this session</h3>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    Review live availability, capacity, and booking state before you lock the hall for this training.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={checkHallAvailability}
                  disabled={!canCheckAvailability || checkingAvailability}
                  className="h-11 rounded-2xl bg-gradient-to-r from-violet-500 via-indigo-500 to-sky-500 px-5 text-white shadow-[0_18px_40px_rgba(79,70,229,0.25)] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_22px_45px_rgba(59,130,246,0.32)] active:scale-[0.98]"
                >
                  <Sparkles className="mr-2 size-4" />
                  {checkingAvailability ? 'Checking...' : 'Check Availability'}
                </Button>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-border bg-background p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Selected slot</p>
                  <p className="mt-2 flex items-center gap-2 text-sm font-medium text-foreground">
                    <Clock3 className="size-4 text-primary" />
                    {canCheckAvailability ? `${formData.startTime} - ${formData.endTime}` : 'Choose session timing'}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-background p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Availability count</p>
                  <p className="mt-2 flex items-center gap-2 text-sm font-medium text-foreground">
                    <CheckCircle2 className="size-4 text-emerald-500" />
                    {hasInvalidTimeRange
                      ? timeRangeMessage
                      : checkingAvailability
                      ? t('createTraining.hallStatus.checking', 'Checking hall availability...')
                      : canCheckAvailability
                        ? `${availableHalls.length} ${t('createTraining.hallStatus.available', 'hall(s) available for the selected time slot')}`
                        : 'Pick date and time to inspect halls'}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-background p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Selected hall</p>
                  <p className="mt-2 flex items-center gap-2 text-sm font-medium text-foreground">
                    <DoorOpen className="size-4 text-primary" />
                    {selectedHall ? selectedHall.name : 'No hall selected yet'}
                  </p>
                </div>
              </div>

              {canCheckAvailability && (
                <div className="mt-5 space-y-4">
                  <Alert className="border-border bg-background text-foreground">
                    <AlertCircle className="size-4 text-primary" />
                    <AlertDescription className="text-muted-foreground">
                      {checkingAvailability ? (
                        t('createTraining.hallStatus.checking', 'Checking hall availability...')
                      ) : availableHalls.length > 0 ? (
                        `${availableHalls.length} ${t('createTraining.hallStatus.available', 'hall(s) available for the selected time slot')}`
                      ) : (
                        t('createTraining.hallStatus.none', 'No halls available for the selected time slot.')
                      )}
                    </AlertDescription>
                  </Alert>

                  {!checkingAvailability && (availableHalls.length === 0 || (formData.hallId && !availableHalls.find(h => h.id === formData.hallId))) && (
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-200">
                        <AlertCircle className="size-4" />
                        {t('createTraining.hallStatus.notAvailable', 'Hall Not Available')}
                      </h4>
                      <p className="mt-2 text-sm text-amber-700/90 dark:text-amber-100/90">
                        {unavailableReason
                          ? <span className="font-semibold">{unavailableReason}</span>
                          : t('createTraining.hallStatus.booked', 'The selected hall is booked or blocked.')}
                        <br />
                        {t('createTraining.hallStatus.submitRequest', 'You can submit a request to the Admin for approval.')}
                      </p>
                      <Button
                        type="button"
                        className="mt-4 rounded-xl bg-amber-500 text-white hover:bg-amber-600"
                        onClick={() => {
                          if (!validateForm()) {
                            toast.error('Please fill all training details first');
                            return;
                          }
                          setShowRequestDialog(true);
                        }}
                      >
                        <FileQuestion className="mr-2 size-4" />
                        {t('createTraining.buttons.requestHall', 'Request Hall Approval')}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6">
                <Label htmlFor="hallId" className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  {t('createTraining.fields.hall', 'Hall *')}
                </Label>
                <div className="mt-3 grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {hallCards.map((hall, index) => (
                    <motion.button
                      key={hall.id}
                      type="button"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22, delay: index * 0.02 }}
                      whileHover={{ y: -4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleChange('hallId', hall.id)}
                      className={`rounded-xl border p-5 text-left transition-all duration-200 ${
                        hall.isSelected
                          ? 'border-primary/40 bg-primary/10 shadow-sm'
                          : hall.status === 'available'
                            ? 'border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/35'
                            : hall.status === 'booked'
                              ? 'border-rose-500/20 bg-rose-500/5 hover:border-rose-500/35'
                              : 'border-border bg-background hover:border-primary/25'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="text-lg font-semibold text-foreground">{hall.name}</h4>
                          <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="size-4 text-muted-foreground" />
                            {hall.location}
                          </p>
                        </div>
                        <div className={`rounded-full border px-3 py-1 text-xs font-medium ${
                          hall.status === 'available'
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
                            : hall.status === 'booked'
                              ? 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-200'
                              : 'border-border bg-muted text-muted-foreground'
                        }`}>
                          {hall.status === 'available' ? 'Available' : hall.status === 'booked' ? 'Booked' : 'Pending'}
                        </div>
                      </div>

                      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                        <span className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="size-4 text-muted-foreground" />
                          {hall.capacity} seats
                        </span>
                        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                          {hall.status === 'available' ? (
                            <CheckCircle2 className="size-4 text-emerald-500" />
                          ) : (
                            <XCircle className="size-4 text-rose-500" />
                          )}
                          {hall.isSelected ? 'Selected' : hall.status === 'available' ? 'Ready to assign' : 'Needs approval'}
                        </span>
                      </div>
                    </motion.button>
                  ))}
                </div>
                {errors.hallId && <p className="text-sm text-red-600 mt-2">{errors.hallId}</p>}
              </div>

              <div className="mt-6">
                <Label htmlFor="capacity">{t('createTraining.fields.capacity', 'Training Capacity *')}</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => handleChange('capacity', e.target.value)}
                  placeholder={t('createTraining.fields.capacityPlaceholder', 'Maximum participants')}
                  min="1"
                  className={`mt-2 ${capacityExceedsSelectedHall ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
                {selectedHall && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Selected hall capacity: <span className="font-medium text-foreground">{selectedHall.capacity} seats</span>
                  </p>
                )}
                {capacityLimitMessage && (
                  <p className="mt-2 text-sm text-red-600">{capacityLimitMessage}</p>
                )}
                {errors.capacity && <p className="text-sm text-red-600 mt-1">{errors.capacity}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('createTraining.sections.institutions.title', 'Required Institutions')}</CardTitle>
            <CardDescription>{t('createTraining.sections.institutions.desc', 'Select institutions to nominate participants from')}</CardDescription>
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
            {loading ? t('createTraining.buttons.saving', 'Saving...') : (isEditMode ? t('createTraining.buttons.update', 'Update Training') : t('createTraining.buttons.create', 'Create Training'))}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/trainings')}>
            {t('createTraining.buttons.cancel', 'Cancel')}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateTraining;
