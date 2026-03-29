export const HALL_TURNOVER_BUFFER_MINUTES = 60;

const timeToMinutes = (time: string) => {
    const [hours = '0', minutes = '0'] = String(time || '0:0').split(':');
    return Number(hours) * 60 + Number(minutes);
};

export const formatMinutesAsTime = (totalMinutes: number) => {
    const normalizedMinutes = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
    const hours = Math.floor(normalizedMinutes / 60);
    const minutes = normalizedMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

export const getHallTurnoverEndTime = (endTime: string, bufferMinutes = HALL_TURNOVER_BUFFER_MINUTES) =>
    formatMinutesAsTime(timeToMinutes(endTime) + bufferMinutes);

export const hasBufferedTrainingConflict = (
    candidateStartTime: string,
    candidateEndTime: string,
    existingStartTime: string,
    existingEndTime: string,
    bufferMinutes = HALL_TURNOVER_BUFFER_MINUTES
) => {
    const candidateStart = timeToMinutes(candidateStartTime);
    const candidateEndWithBuffer = timeToMinutes(candidateEndTime) + bufferMinutes;
    const existingStart = timeToMinutes(existingStartTime);
    const existingEndWithBuffer = timeToMinutes(existingEndTime) + bufferMinutes;

    return candidateStart < existingEndWithBuffer && candidateEndWithBuffer > existingStart;
};
