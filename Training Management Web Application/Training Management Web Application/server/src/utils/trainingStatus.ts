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

export const getTrainingStartDateTime = (training: { date: Date | string; startTime: string }) =>
    parseTrainingDateTime(training.date, training.startTime);

export const deriveEffectiveTrainingStatus = (
    training: { status?: string; date: Date | string; startTime: string },
    now = new Date()
) => {
    const currentStatus = String(training.status || 'scheduled');

    if (currentStatus === 'draft' || currentStatus === 'completed' || currentStatus === 'cancelled') {
        return currentStatus;
    }

    if (currentStatus === 'ongoing') {
        return currentStatus;
    }

    return now >= getTrainingStartDateTime(training) ? 'ongoing' : 'scheduled';
};

export const withEffectiveTrainingStatus = <T extends { status?: string; date: Date | string; startTime: string }>(training: T) => ({
    ...training,
    status: deriveEffectiveTrainingStatus(training),
});
