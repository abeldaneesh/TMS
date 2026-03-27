import { Training, TrainingStatus } from '../types';

export type TrainingStatusPresentation = TrainingStatus | 'overdue';

export const getTrainingStatusPresentation = (
  training: Pick<Training, 'status' | 'date'>,
  referenceDate = new Date()
): TrainingStatusPresentation => {
  const currentDay = new Date(referenceDate);
  currentDay.setHours(0, 0, 0, 0);

  const trainingDay = new Date(training.date);
  trainingDay.setHours(0, 0, 0, 0);

  if ((training.status === 'scheduled' || training.status === 'ongoing') && trainingDay < currentDay) {
    return 'overdue';
  }

  return training.status;
};
