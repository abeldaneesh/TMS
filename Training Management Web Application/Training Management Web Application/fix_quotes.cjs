const fs = require('fs');
const filePaths = [
    'c:/Users/LENOVO/Downloads/Telegram Desktop/Training Management Web Application/src/app/pages/HallAvailability.tsx',
    'c:/Users/LENOVO/Downloads/Telegram Desktop/Training Management Web Application/src/app/pages/Nominations.tsx',
    'c:/Users/LENOVO/Downloads/Telegram Desktop/Training Management Web Application/src/app/pages/Analytics.tsx',
    'c:/Users/LENOVO/Downloads/Telegram Desktop/Training Management Web Application/src/app/pages/Reports.tsx',
    'c:/Users/LENOVO/Downloads/Telegram Desktop/Training Management Web Application/src/app/pages/TrainingParticipants.tsx'
];

filePaths.forEach(p => {
    let txt = fs.readFileSync(p, 'utf8');

    // Fixes instances like '{t("...")}' => t("...")
    txt = txt.replace(/'\{t\((.*?)\)\}'/g, "t($1)");
    txt = txt.replace(/"\{t\((.*?)\)\}"/g, "t($1)");
    txt = txt.replace(/'t\((.*?)\)'/g, "t($1)");
    txt = txt.replace(/"t\((.*?)\)"/g, "t($1)");
    // Fix instances like >{t("...")}< where it is fine

    fs.writeFileSync(p, txt);
    console.log(`Fixed quotes in ${p}`);
});
