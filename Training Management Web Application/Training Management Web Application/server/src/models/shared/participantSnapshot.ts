import { Schema } from 'mongoose';

export interface IParticipantSnapshot {
    participantId: string;
    fullName: string;
    role?: string;
    designation?: string;
    department?: string;
    institutionId?: string;
    institutionName?: string;
    email?: string;
    phone?: string;
    isDeleted?: boolean;
    deletedAt?: Date;
    snapshotAt?: Date;
}

export const ParticipantSnapshotSchema = new Schema<IParticipantSnapshot>(
    {
        participantId: { type: String, required: true },
        fullName: { type: String, required: true },
        role: { type: String },
        designation: { type: String },
        department: { type: String },
        institutionId: { type: String },
        institutionName: { type: String },
        email: { type: String },
        phone: { type: String },
        isDeleted: { type: Boolean, default: false },
        deletedAt: { type: Date },
        snapshotAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

const asTrimmed = (value: unknown): string | undefined => {
    if (value === null || value === undefined) return undefined;
    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : undefined;
};

const mergeField = <T>(primary: T | undefined, fallback: T | undefined): T | undefined =>
    primary !== undefined && primary !== null && primary !== '' ? primary : fallback;

export const buildParticipantSnapshot = (participant: any, institution?: any): IParticipantSnapshot => ({
    participantId: asTrimmed(participant?._id || participant?.id) || '',
    fullName: asTrimmed(participant?.name) || 'Participant (Removed)',
    role: asTrimmed(participant?.role),
    designation: asTrimmed(participant?.designation),
    department: asTrimmed(participant?.department),
    institutionId: asTrimmed(participant?.institutionId?._id || participant?.institutionId?.id || participant?.institutionId),
    institutionName: asTrimmed(institution?.name || participant?.institutionId?.name || participant?.institution?.name),
    email: asTrimmed(participant?.email),
    phone: asTrimmed(participant?.phone),
    isDeleted: Boolean(participant?.isDeleted),
    deletedAt: participant?.deletedAt ? new Date(participant.deletedAt) : undefined,
    snapshotAt: new Date(),
});

export const mergeParticipantSnapshots = (
    primary?: Partial<IParticipantSnapshot> | null,
    fallback?: Partial<IParticipantSnapshot> | null
): IParticipantSnapshot | undefined => {
    if (!primary && !fallback) return undefined;

    return {
        participantId: mergeField(asTrimmed(primary?.participantId), asTrimmed(fallback?.participantId)) || '',
        fullName: mergeField(asTrimmed(primary?.fullName), asTrimmed(fallback?.fullName)) || 'Participant (Removed)',
        role: mergeField(asTrimmed(primary?.role), asTrimmed(fallback?.role)),
        designation: mergeField(asTrimmed(primary?.designation), asTrimmed(fallback?.designation)),
        department: mergeField(asTrimmed(primary?.department), asTrimmed(fallback?.department)),
        institutionId: mergeField(asTrimmed(primary?.institutionId), asTrimmed(fallback?.institutionId)),
        institutionName: mergeField(asTrimmed(primary?.institutionName), asTrimmed(fallback?.institutionName)),
        email: mergeField(asTrimmed(primary?.email), asTrimmed(fallback?.email)),
        phone: mergeField(asTrimmed(primary?.phone), asTrimmed(fallback?.phone)),
        isDeleted: Boolean(primary?.isDeleted || fallback?.isDeleted),
        deletedAt: primary?.deletedAt || fallback?.deletedAt,
        snapshotAt: primary?.snapshotAt || fallback?.snapshotAt || new Date(),
    };
};

export const upsertTrainingParticipantSnapshot = (training: any, snapshot?: IParticipantSnapshot | null) => {
    if (!training || !snapshot?.participantId) return;

    if (!Array.isArray(training.participantSnapshots)) {
        training.participantSnapshots = [];
    }

    const existingIndex = training.participantSnapshots.findIndex(
        (entry: IParticipantSnapshot) => String(entry.participantId) === String(snapshot.participantId)
    );

    if (existingIndex === -1) {
        training.participantSnapshots.push(snapshot);
        return;
    }

    training.participantSnapshots[existingIndex] = mergeParticipantSnapshots(
        training.participantSnapshots[existingIndex],
        snapshot
    );
};

export const markSnapshotAsDeleted = (snapshot?: Partial<IParticipantSnapshot> | null) => {
    if (!snapshot) return snapshot;
    return {
        ...snapshot,
        isDeleted: true,
        deletedAt: snapshot.deletedAt || new Date(),
    };
};

export const toArchivedParticipantProfile = (
    participantId: string,
    liveParticipant?: any,
    snapshot?: Partial<IParticipantSnapshot> | null
) => {
    const mergedSnapshot = mergeParticipantSnapshots(snapshot, liveParticipant ? buildParticipantSnapshot(liveParticipant) : undefined);
    const isRemoved = Boolean(liveParticipant?.isDeleted || mergedSnapshot?.isDeleted || (!liveParticipant && mergedSnapshot));
    const fullName = mergedSnapshot?.fullName || 'Participant (Removed)';

    return {
        id: participantId,
        _id: participantId,
        name: isRemoved && fullName !== 'Participant (Removed)' ? `${fullName} (Archived)` : fullName,
        email: mergedSnapshot?.email || 'N/A',
        designation: mergedSnapshot?.designation || mergedSnapshot?.role || 'N/A',
        department: mergedSnapshot?.department || 'N/A',
        role: mergedSnapshot?.role,
        phone: mergedSnapshot?.phone || 'N/A',
        institutionId: mergedSnapshot?.institutionId,
        institutionName: mergedSnapshot?.institutionName,
        isDeleted: isRemoved,
    };
};
