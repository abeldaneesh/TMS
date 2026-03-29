import { Training, TrainingStatus } from '../types';

export type TrainingStatusPresentation = TrainingStatus | 'overdue';

const TRAINING_TIMEZONE_OFFSET_MINUTES = 330;

const getTrainingCalendarDateParts = (dateValue: Date | string) => {
  const sourceDate = new Date(dateValue);
  const shifted = new Date(sourceDate.getTime() + TRAINING_TIMEZONE_OFFSET_MINUTES * 60 * 1000);

  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
  };
};

export const parseTrainingDateTime = (dateValue: Date | string, timeValue: string) => {
  const { year, month, day } = getTrainingCalendarDateParts(dateValue);
  const [hours = '0', minutes = '0'] = String(timeValue || '0:0').split(':');

  return new Date(
    Date.UTC(year, month, day, Number(hours), Number(minutes), 0, 0) -
      TRAINING_TIMEZONE_OFFSET_MINUTES * 60 * 1000
  );
};

export const getTrainingStartDateTime = (training: Pick<Training, 'date' | 'startTime'>) =>
  parseTrainingDateTime(training.date, training.startTime);

export const getTrainingEndDateTime = (training: Pick<Training, 'date' | 'endTime'>) =>
  parseTrainingDateTime(training.date, training.endTime);

export const getTrainingStatusPresentation = (
  training: Pick<Training, 'status' | 'date' | 'startTime' | 'endTime'>,
  referenceDate = new Date()
): TrainingStatusPresentation => {
  const currentStatus = String(training.status || 'scheduled') as TrainingStatus;

  if (currentStatus === 'draft' || currentStatus === 'completed' || currentStatus === 'cancelled') {
    return currentStatus;
  }

  if (!training.startTime || !training.endTime) {
    const currentDay = new Date(referenceDate);
    currentDay.setHours(0, 0, 0, 0);

    const trainingDay = new Date(training.date);
    trainingDay.setHours(0, 0, 0, 0);

    if ((currentStatus === 'scheduled' || currentStatus === 'ongoing') && trainingDay < currentDay) {
      return 'overdue';
    }

    return currentStatus;
  }

  const start = getTrainingStartDateTime(training);
  const end = getTrainingEndDateTime(training);

  if (referenceDate < start) {
    return 'scheduled';
  }

  if (referenceDate <= end) {
    return 'ongoing';
  }

  return 'overdue';
};
