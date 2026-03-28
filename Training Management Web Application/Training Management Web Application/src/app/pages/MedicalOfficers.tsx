import React from 'react';
import { useTranslation } from 'react-i18next';
import OfficerDirectory from '../components/OfficerDirectory';

const MedicalOfficers: React.FC = () => {
    const { t } = useTranslation();

    return (
        <OfficerDirectory
            roleFilter="medical_officer"
            pageTitle={t('personnel.officers.medicalTitle', 'Medical Officers')}
            subtitle={t('personnel.officers.medicalSubtitle', 'Manage all medical officers across the organization')}
            searchPlaceholder={t('personnel.officers.medicalSearch', 'Search medical officers by name, email, or department...')}
            emptyMessage={t('personnel.officers.noMedicalOfficers', 'No Medical Officers found.')}
        />
    );
};

export default MedicalOfficers;
