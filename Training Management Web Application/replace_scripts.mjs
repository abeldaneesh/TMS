import fs from 'fs';

const filePaths = [
    'c:/Users/LENOVO/Downloads/Telegram Desktop/Training Management Web Application/src/app/pages/HallAvailability.tsx',
    'c:/Users/LENOVO/Downloads/Telegram Desktop/Training Management Web Application/src/app/pages/Nominations.tsx',
    'c:/Users/LENOVO/Downloads/Telegram Desktop/Training Management Web Application/src/app/pages/Analytics.tsx',
    'c:/Users/LENOVO/Downloads/Telegram Desktop/Training Management Web Application/src/app/pages/Reports.tsx',
    'c:/Users/LENOVO/Downloads/Telegram Desktop/Training Management Web Application/src/app/pages/TrainingParticipants.tsx'
];

function processFile(filePath, keyPrefix, reps) {
    let txt = fs.readFileSync(filePath, 'utf8');

    // Add import if missing
    if (!txt.includes('useTranslation')) {
        txt = txt.replace(
            "import React, { useEffect, useState } from 'react';",
            "import React, { useEffect, useState } from 'react';\nimport { useTranslation } from 'react-i18next';"
        ).replace(
            "import React, { useEffect, useState, useCallback } from 'react';",
            "import React, { useEffect, useState, useCallback } from 'react';\nimport { useTranslation } from 'react-i18next';"
        ).replace(
            "import React, { useState, useEffect } from 'react';",
            "import React, { useState, useEffect } from 'react';\nimport { useTranslation } from 'react-i18next';"
        );
    }

    // Fallback if import is still missing
    if (!txt.includes('useTranslation')) {
        txt = "import { useTranslation } from 'react-i18next';\n" + txt;
    }

    // Add hook
    const functionalComponentMatch = txt.match(/const [A-Za-z]+: React\.FC = \(\) => \{/);
    if (functionalComponentMatch && !txt.includes('const { t } = useTranslation();')) {
        txt = txt.replace(functionalComponentMatch[0], `${functionalComponentMatch[0]}\n  const { t } = useTranslation();`);
    }

    // Replace strings
    for (const [search, replace] of reps) {
        txt = txt.split(search).join(replace);
    }

    fs.writeFileSync(filePath, txt);
    console.log(`Processed ${filePath}`);
}

// 1. HallAvailability.tsx
processFile(filePaths[0], 'hallAvailability', [
    ["'Please specify a reason'", "t('hallAvailability.specifyReason')"],
    ["'Hall blocked successfully'", "t('hallAvailability.blockSuccess')"],
    ["'Failed to block hall'", "t('hallAvailability.blockFail')"],
    ["Loading hall availability...", "{t('hallAvailability.loading')}"],
    ["<h1 className=\"text-3xl font-bold\">Hall Availability</h1>", "<h1 className=\"text-3xl font-bold\">{t('hallAvailability.title')}</h1>"],
    ["<p className=\"text-gray-500 mt-1\">Check venue availability for training sessions</p>", "<p className=\"text-gray-500 mt-1\">{t('hallAvailability.subtitle')}</p>"],
    ["Check Availability", "{t('hallAvailability.checkAvail')}"],
    ["Select date and time to check which halls are available", "{t('hallAvailability.checkDesc')}"],
    ["<Label htmlFor=\"date\">Date</Label>", "<Label htmlFor=\"date\">{t('hallAvailability.date')}</Label>"],
    ["<Label htmlFor=\"startTime\">Start Time</Label>", "<Label htmlFor=\"startTime\">{t('hallAvailability.startTime')}</Label>"],
    ["<Label htmlFor=\"endTime\">End Time</Label>", "<Label htmlFor=\"endTime\">{t('hallAvailability.endTime')}</Label>"],
    ["{checking ? 'Checking...' : 'Check Availability'}", "{checking ? t('hallAvailability.checking') : t('hallAvailability.checkAvail')}"],
    ["<span className=\"text-gray-600\">Capacity</span>", "<span className=\"text-gray-600\">{t('hallAvailability.capacity')}</span>"],
    ["{hall.capacity} people", "{hall.capacity} {t('hallAvailability.people')}"],
    ["<p className=\"text-sm text-gray-600 mb-2\">Facilities</p>", "<p className=\"text-sm text-gray-600 mb-2\">{t('hallAvailability.facilities')}</p>"],
    ["<span className=\"text-sm font-medium\">Status</span>", "<span className=\"text-sm font-medium\">{t('hallAvailability.status')}</span>"],
    ["{isAvailable ? 'Available' : 'Booked'}", "{isAvailable ? t('hallAvailability.available') : t('hallAvailability.booked')}"],
    ["Schedule on {format(new Date(selectedDate), 'MMM dd')}:", "{t('hallAvailability.scheduleOn')} {format(new Date(selectedDate), 'MMM dd')}:"],
    ["<span>Blocked: {block.reason}</span>", "<span>{t('hallAvailability.blocked')}: {block.reason}</span>"],
    [">Block Hall<", ">{t('hallAvailability.blockHall')}<"],
    ["'Block Hall'", "t('hallAvailability.blockHall')"],
    ["Total Halls", "{t('hallAvailability.totalHalls')}"],
    ["<p className=\"text-sm text-gray-600 mt-1\">Available</p>", "<p className=\"text-sm text-gray-600 mt-1\">{t('hallAvailability.available')}</p>"],
    ["<p className=\"text-sm text-gray-600 mt-1\">Booked</p>", "<p className=\"text-sm text-gray-600 mt-1\">{t('hallAvailability.booked')}</p>"],
    ["<DialogTitle>Block Hall - {blockingHall?.name}</DialogTitle>", "<DialogTitle>{t('hallAvailability.blockHall')} - {blockingHall?.name}</DialogTitle>"],
    ["Mark this hall as unavailable for a specific period.", "{t('hallAvailability.markUnavailable')}"],
    ["<Label>Date</Label>", "<Label>{t('hallAvailability.date')}</Label>"],
    ["<Label>Start Time</Label>", "<Label>{t('hallAvailability.startTime')}</Label>"],
    ["<Label>End Time</Label>", "<Label>{t('hallAvailability.endTime')}</Label>"],
    ["<Label>Reason</Label>", "<Label>{t('hallAvailability.reason')}</Label>"],
    ["placeholder=\"Select reason\"", "placeholder={t('hallAvailability.selectReason')}"],
    ["<Label>Custom Reason</Label>", "<Label>{t('hallAvailability.customReason')}</Label>"],
    ["placeholder=\"Enter reason...\"", "placeholder={t('hallAvailability.enterReason')}"],
    [">Cancel<", ">{t('hallAvailability.cancel')}<"],
    ["'Blocking...'", "t('hallAvailability.blocking')"]
]);

// 2. Nominations.tsx
processFile(filePaths[1], 'nominationsProps', [
    ["'Sync failed. Checking mobile network connectivity...'", "t('nominationsProps.syncFailed')"],
    ["'Failed to check participant availability'", "t('nominationsProps.checkAvailFail')"],
    ["'Nomination approved'", "t('nominationsProps.nomApproved')"],
    ["'Error approving'", "t('nominationsProps.errorApproving')"],
    ["'Nomination rejected'", "t('nominationsProps.nomRejected')"],
    ["'Error rejecting'", "t('nominationsProps.errorRejecting')"],
    ["`${successCount} Personnel successfully nominated`", "t('nominationsProps.nomSuccess', { count: successCount })"],
    ["\"MISSION ABORTED\"", "t('nominationsProps.missionAborted')"],
    ["\"All selected personnel were already nominated or have conflicts.\"", "t('nominationsProps.missionAbortedDesc')"],
    ["'Global Nomination System Error'", "t('nominationsProps.globalError')"],
    ["Access Denied: Please log in.", "{t('nominationsProps.accessDenied')}"],
    ["Debug List", "{t('nominationsProps.debugList')}"],
    ["Exit Debug", "{t('nominationsProps.exitDebug')}"],
    ["Personnel:", "{t('nominationsProps.personnel')}:"],
    ["Total Records:", "{t('nominationsProps.totalRecords')}:"],
    ["Participant:", "{t('nominationsProps.participant')}:"],
    ["Training:", "{t('nominationsProps.training')}:"],
    ["Status:", "{t('nominationsProps.status')}:"],
    ["<h1 className=\"text-2xl font-semibold text-foreground flex items-center gap-3\">\n            <Users className=\"size-6 text-primary\" />\n            Nominations\n          </h1>", "<h1 className=\"text-2xl font-semibold text-foreground flex items-center gap-3\">\n            <Users className=\"size-6 text-primary\" />\n            {t('nominationsProps.title')}\n          </h1>"],
    ["Nominate Personnel", "{t('nominationsProps.nominatePersonnel')}"],
    ["placeholder=\"Search nominations...\"", "placeholder={t('nominationsProps.search')}"],
    ["No nominations found.", "{t('nominationsProps.noNominations')}"],
    ["Institution:", "{t('nominationsProps.institution')}:"],
    ["Scheduled for:", "{t('nominationsProps.scheduledFor')}:"],
    [">Approve<", ">{t('nominationsProps.approve')}<"],
    [">Reject<", ">{t('nominationsProps.reject')}<"],
    ["Reason: {nomination.rejectionReason}", "{t('nominationsProps.reason')}: {nomination.rejectionReason}"],
    ["Reject Nomination", "{t('nominationsProps.rejectNomination')}"],
    ["placeholder=\"Reason for rejection...\"", "placeholder={t('nominationsProps.reasonPlaceholder')}"],
    [">Cancel<", ">{t('nominationsProps.cancel')}<"],
    ["Confirm Rejection", "{t('nominationsProps.confirmRejection')}"],
    ["1. Select Training Session", "{t('nominationsProps.selectTraining')}"],
    [">Select a training session...<", ">{t('nominationsProps.selectTrainingPlaceholder')}<"],
    ["2. Select Participants ({selectedParticipantIds.length})", "{t('nominationsProps.selectParticipants')} ({selectedParticipantIds.length})"],
    ["Already Assigned", "{t('nominationsProps.alreadyAssigned')}"],
    [">Busy<", ">{t('nominationsProps.busy')}<"],
    ["'Submitting...'", "t('nominationsProps.submitting')"],
    ["'Submit Nominations'", "t('nominationsProps.submitNominations')"],
    [">Error Loading Data<", ">{t('nominationsProps.errorLoading')}<"],
    ["'An unexpected error occurred.'", "t('nominationsProps.unexpectedError')"],
    [">Retry<", ">{t('nominationsProps.retry')}<"]
]);

// 3. Analytics.tsx
processFile(filePaths[2], 'analyticsPage', [
    ["Platform Analytics", "{t('analyticsPage.title')}"],
    ["Overview of training programs and engagement", "{t('analyticsPage.subtitle')}"],
    ["'Total Programs'", "t('analyticsPage.totalPrograms')"],
    ["'Total Trainings'", "t('analyticsPage.totalTrainings')"],
    ["'Total Institutions'", "t('analyticsPage.totalInstitutions')"],
    ["'Attendance Rate'", "t('analyticsPage.attendanceRate')"],
    ["Program Distribution", "{t('analyticsPage.programDist')}"],
    ["Trainings categorized by program", "{t('analyticsPage.programDistDesc')}"],
    [">Training Status<", ">{t('analyticsPage.trainingStatus')}<"],
    ["Current status of all scheduled trainings", "{t('analyticsPage.trainingStatusDesc')}"],
    ["Training Specific Intel", "{t('analyticsPage.trainingIntel')}"],
    ["Detailed telemetry for deep-dive analysis", "{t('analyticsPage.trainingIntelDesc')}"],
    [">Select Training<", ">{t('analyticsPage.selectTraining')}<"],
    ["placeholder=\"Choose a target training\"", "placeholder={t('analyticsPage.chooseTraining')}"],
    ["'Nominated'", "t('analyticsPage.nominated')"],
    ["'Approved'", "t('analyticsPage.approved')"],
    ["'Attended'", "t('analyticsPage.attended')"],
    ["'Rate'", "t('analyticsPage.rate')"],
    ["Participation by Institution", "{t('analyticsPage.participationByInst')}"]
]);

// 4. Reports.tsx
processFile(filePaths[3], 'reportsPage', [
    [">Reports & Analytics<", ">{t('reportsPage.title')}<"],
    ["Training Program Data & Institutional Metrics", "{t('reportsPage.subtitle')}"],
    ["Report Generator", "{t('reportsPage.generator')}"],
    ["Select parameters to generate training or institutional reports.", "{t('reportsPage.generatorDesc')}"],
    [">Report Type<", ">{t('reportsPage.reportType')}<"],
    ["placeholder=\"Select Report Type...\"", "placeholder={t('reportsPage.selectType')}"],
    [">TRAINING REPORT<", ">{t('reportsPage.typeTraining')}<"],
    [">INSTITUTION REPORT<", ">{t('reportsPage.typeInstitution')}<"],
    [">DISTRICT SUMMARY<", ">{t('reportsPage.typeDistrict')}<"],
    [">Select Training<", ">{t('reportsPage.selectTraining')}<"],
    ["placeholder=\"Identify Training...\"", "placeholder={t('reportsPage.identifyTraining')}"],
    [">Select Institution<", ">{t('reportsPage.selectInst')}<"],
    ["placeholder=\"Identify Institution...\"", "placeholder={t('reportsPage.identifyInst')}"],
    ["GENERATE PDF REPORT", "{t('reportsPage.generatePdf')}"],
    ["EXPORT TO CSV", "{t('reportsPage.exportCsv')}"],
    [">TRAINING ANALYTICS<", ">{t('reportsPage.trainingAnalytics')}<"],
    ["Detailed analysis of training sessions, participation rates, and attendance success metrics.", "{t('reportsPage.trainingAnalyticsDesc')}"],
    [">INSTITUTION DATA<", ">{t('reportsPage.instData')}<"],
    ["Reports on staff training status, program coverage, and preparedness levels across sectors.", "{t('reportsPage.instDataDesc')}"],
    [">DISTRICT DATA<", ">{t('reportsPage.districtData')}<"],
    ["Consolidated overview of all training activities and professional readiness across the district.", "{t('reportsPage.districtDataDesc')}"],
    ["'Failed to load report data'", "t('reportsPage.failLoad')"],
    ["'Report generation complete'", "t('reportsPage.reportReady')"],
    ["'Failed to generate report PDF'", "t('reportsPage.failPdf')"],
    ["'Report data exported to CSV'", "t('reportsPage.exportedCsv')"],
    ["'Failed to export CSV'", "t('reportsPage.failCsv')"],
    ["'Institution report ready'", "t('reportsPage.instReady')"],
    ["'Failed to generate institution report'", "t('reportsPage.failInst')"],
    ["'Global summary report generated'", "t('reportsPage.globalReady')"],
    ["'Failed to generate summary report'", "t('reportsPage.failGlobal')"],
    ["'Please select a report type'", "t('reportsPage.selectTypeError')"],
    ["'Please select a training'", "t('reportsPage.selectTrainingError')"],
    ["'Please select an institution'", "t('reportsPage.selectInstError')"]
]);

// 5. TrainingParticipants.tsx
processFile(filePaths[4], 'participantsManage', [
    ["\"Not authorized to manage participants for this training.\"", "t('participantsManage.notAuth')"],
    ["'Could not load participants'", "t('participantsManage.couldNotLoad')"],
    ["`Are you sure you want to completely remove ${participantName} from this training? They will be notified that their status was rejected.`", "t('participantsManage.confirmRemove', { name: participantName })"],
    ["`Removed ${participantName} from training`", "t('participantsManage.removedSuccess', { name: participantName })"],
    ["'Failed to remove participant'", "t('participantsManage.failedRemove')"],
    [">Training not found.<", ">{t('participantsManage.notFound')}<"],
    [">Manage Participants<", ">{t('participantsManage.title')}<"],
    ["Assigned Personnel", "{t('participantsManage.assignedPersonnel')}"],
    ["Total Assigned:", "{t('participantsManage.totalAssigned')}:"],
    ["No participants are currently assigned to this training session.", "{t('participantsManage.noParticipants')}"],
    [">Participant<", ">{t('participantsManage.colParticipant')}<"],
    [">Contact & Role<", ">{t('participantsManage.colContactRole')}<"],
    [">Institution<", ">{t('participantsManage.colInstitution')}<"],
    [">Status<", ">{t('participantsManage.colStatus')}<"],
    [">Actions<", ">{t('participantsManage.colActions')}<"],
    ["'Unknown'", "t('participantsManage.unknown')"],
    ["'N/A'", "t('participantsManage.na')"],
    ["\"Cannot remove someone who already attended\"", "t('participantsManage.cannotRemoveAttended')"],
    ["\"Remove user from training\"", "t('participantsManage.removeUser')"],
    [">Remove<", ">{t('participantsManage.remove')}<"]
]);
