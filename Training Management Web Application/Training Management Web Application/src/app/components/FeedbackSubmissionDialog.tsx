import React, { useEffect, useState } from 'react';
import { MessageSquareMore, Sparkles, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { feedbackApi } from '../../services/api';
import { TrainingFeedback, TrainingFeedbackSubmission } from '../../types';

interface FeedbackSubmissionDialogProps {
    trainingId: string;
    trainingTitle: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmitted?: (feedback: TrainingFeedback) => void;
}

const INITIAL_FORM: TrainingFeedbackSubmission = {
    suggestions: '',
    futureTrainingRequests: '',
    arrangementsFeedback: '',
    rating: undefined,
    overallExperience: undefined,
    anonymous: false
};

const EXPERIENCE_OPTIONS = [
    'Excellent',
    'Very good',
    'Good',
    'Needs improvement'
];

const FeedbackSubmissionDialog: React.FC<FeedbackSubmissionDialogProps> = ({
    trainingId,
    trainingTitle,
    open,
    onOpenChange,
    onSubmitted
}) => {
    const [formData, setFormData] = useState<TrainingFeedbackSubmission>(INITIAL_FORM);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            setFormData(INITIAL_FORM);
        }
    }, [open]);

    const handleSubmit = async () => {
        if (!formData.suggestions?.trim() || !formData.futureTrainingRequests?.trim() || !formData.arrangementsFeedback?.trim()) {
            toast.error('Please complete the required feedback sections.');
            return;
        }

        setSubmitting(true);
        try {
            const feedback = await feedbackApi.submit(trainingId, formData);
            toast.success('Feedback submitted successfully');
            onSubmitted?.(feedback);
            onOpenChange(false);
        } catch (error: any) {
            console.error('Feedback submission failed:', error);
            toast.error(error?.response?.data?.message || 'Failed to submit feedback');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden border-border bg-card text-foreground sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <MessageSquareMore className="size-5 text-primary" />
                        Participant Feedback
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Share your experience for {trainingTitle}. Your feedback helps improve future sessions.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 space-y-5 overflow-y-auto pr-2">
                    <div className="rounded-2xl border border-border bg-background/60 p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <Sparkles className="size-4 text-primary" />
                            Rate the session
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {[1, 2, 3, 4, 5].map((value) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setFormData((prev) => ({ ...prev, rating: prev.rating === value ? undefined : value }))}
                                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-all ${
                                        formData.rating === value
                                            ? 'border-amber-400 bg-amber-500/10 text-amber-500'
                                            : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
                                    }`}
                                >
                                    <Star className={`size-4 ${formData.rating && value <= formData.rating ? 'fill-current' : ''}`} />
                                    {value}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-foreground">Overall experience</Label>
                            <Select
                                value={formData.overallExperience || ''}
                                onValueChange={(value) => setFormData((prev) => ({ ...prev, overallExperience: value }))}
                            >
                                <SelectTrigger className="border-border bg-background text-foreground">
                                    <SelectValue placeholder="Select experience" />
                                </SelectTrigger>
                                <SelectContent>
                                    {EXPERIENCE_OPTIONS.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-end rounded-2xl border border-border bg-background/60 p-4">
                            <label className="flex items-start gap-3 text-sm text-muted-foreground">
                                <Checkbox
                                    checked={Boolean(formData.anonymous)}
                                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, anonymous: Boolean(checked) }))}
                                />
                                <span>
                                    <span className="block font-medium text-foreground">Submit anonymously</span>
                                    Your name will be hidden from the reviewer list.
                                </span>
                            </label>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-foreground">Suggestions</Label>
                        <Textarea
                            value={formData.suggestions}
                            onChange={(event) => setFormData((prev) => ({ ...prev, suggestions: event.target.value }))}
                            className="min-h-24 border-border bg-background"
                            placeholder="What would you improve in this training?"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-foreground">Requests for future training</Label>
                        <Textarea
                            value={formData.futureTrainingRequests}
                            onChange={(event) => setFormData((prev) => ({ ...prev, futureTrainingRequests: event.target.value }))}
                            className="min-h-24 border-border bg-background"
                            placeholder="Tell us which topics or sessions you want next."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-foreground">Feedback on arrangements</Label>
                        <Textarea
                            value={formData.arrangementsFeedback}
                            onChange={(event) => setFormData((prev) => ({ ...prev, arrangementsFeedback: event.target.value }))}
                            className="min-h-24 border-border bg-background"
                            placeholder="Share your thoughts about venue, timing, and coordination."
                        />
                    </div>
                </div>

                <DialogFooter className="border-t border-border bg-card pt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={submitting}>
                        {submitting ? 'Submitting...' : 'Submit Feedback'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default FeedbackSubmissionDialog;
