import React from 'react';
import { useTranslation } from 'react-i18next';
import OfficerDirectory from '../components/OfficerDirectory';

const ProgramOfficers: React.FC = () => {
    const { t } = useTranslation();

    return (
        <OfficerDirectory
            roleFilter="program_officer"
            pageTitle={t('personnel.officers.programTitle', 'Program Officers')}
            subtitle={t('personnel.officers.programSubtitle', 'Manage all program officers across the organization')}
            searchPlaceholder={t('personnel.officers.programSearch', 'Search program officers by name, email, or department...')}
            emptyMessage={t('personnel.officers.noProgramOfficers', 'No Program Officers found.')}
        />
    );
};

export default ProgramOfficers;
