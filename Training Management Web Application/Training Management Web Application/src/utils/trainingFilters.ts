import { format } from 'date-fns';

import { Training } from '../types';

const TRAINING_TIMEZONE_OFFSET_MINUTES = 330;

const padNumber = (value: number) => String(value).padStart(2, '0');

export const normalizeTrainingMatchValue = (value?: string) =>
  (value || '').trim().replace(/\s+/g, ' ').toLowerCase();

type TrainingDateParts = {
  year: number;
  monthIndex: number;
  day: number;
};

const getTrainingDateParts = (dateValue: Date | string | undefined | null): TrainingDateParts | null => {
  if (!dateValue) return null;

  if (typeof dateValue === 'string') {
    const isoDateMatch = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoDateMatch) {
      return {
        year: Number(isoDateMatch[1]),
        monthIndex: Number(isoDateMatch[2]) - 1,
        day: Number(isoDateMatch[3]),
      };
    }
  }

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return null;

  const shifted = new Date(parsed.getTime() + TRAINING_TIMEZONE_OFFSET_MINUTES * 60 * 1000);

  return {
    year: shifted.getUTCFullYear(),
    monthIndex: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
  };
};

export const getTrainingDateInputValue = (dateValue: Date | string | undefined | null) => {
  const parts = getTrainingDateParts(dateValue);
  if (!parts) return '';

  return `${parts.year}-${padNumber(parts.monthIndex + 1)}-${padNumber(parts.day)}`;
};

export const getTrainingSearchableDateText = (dateValue: Date | string | undefined | null) => {
  const parts = getTrainingDateParts(dateValue);
  if (!parts) return '';

  const month = padNumber(parts.monthIndex + 1);
  const day = padNumber(parts.day);
  const year = String(parts.year);
  const calendarDate = new Date(parts.year, parts.monthIndex, parts.day);

  return [
    format(calendarDate, 'MMM dd, yyyy'),
    format(calendarDate, 'dd MMM yyyy'),
    format(calendarDate, 'MMMM dd, yyyy'),
    `${year}-${month}-${day}`,
    `${day}-${month}-${year}`,
    `${day}/${month}/${year}`,
    `${month}/${day}/${year}`,
    `${day}.${month}.${year}`,
  ].join(' ');
};

export const getTrainingSortTimestamp = (training: Training) => {
  const parts = getTrainingDateParts(training.date);
  if (parts) {
    const [hours = '00', minutes = '00'] = String(training.startTime || '00:00').split(':');
    const sessionTimestamp = new Date(
      parts.year,
      parts.monthIndex,
      parts.day,
      Number(hours),
      Number(minutes),
      0,
      0
    ).getTime();

    if (!Number.isNaN(sessionTimestamp)) return sessionTimestamp;
  }

  const fallbackTimestamp = new Date(training.date).getTime();
  return Number.isNaN(fallbackTimestamp) ? 0 : fallbackTimestamp;
};
