import json
import os

def update_json(filepath, new_data):
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    for key, value in new_data.items():
        data[key] = value
        
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

en_data = {
  "notificationsPage": {
    "title": "Alerts",
    "subtitle": "Updates and notifications",
    "markAllAsRead": "Mark all as read",
    "noFeeds": "You have no active feeds"
  },
  "scanQrPage": {
    "title1": "Scan",
    "title2": "QR Code",
    "subtitle": "Mark your presence in the system",
    "scannerTitle": "QR Scanner",
    "scannerDesc": "Position the code within the detection field",
    "sensorReady": "SENSOR READY",
    "activateDesc": "Click below to activate the optical imaging system",
    "initiateScan": "INITIATE SCAN",
    "stopScanning": "Stop Scanning",
    "scanAnother": "Scan Another",
    "close": "Close",
    "manualTitle": "Operation Manual",
    "instruction1": "Click \"INITIATE SCAN\" to activate primary sensor",
    "instruction2": "Grant security clearance for camera access",
    "instruction3": "Align QR certificate within the capture frame",
    "instruction4": "Maintain steady handshake until data syncs",
    "instruction5": "Attendance log will be updated in real-time",
    "advisoryTitle": "MISSION ADVISORY:",
    "advisoryDesc": "Data uplink is only active during the scheduled session window. Ensure GPS coordinates match the training objective site.",
    "diagnosticsTitle": "System Diagnostics",
    "opticalFailure": "In case of optical failure:",
    "diag1": "Verify camera permissions in system settings",
    "diag2": "Ensure adequate photon levels (environmental lighting)",
    "diag3": "Inspect physical QR medium for data corruption",
    "diag4": "Recalibrate lens (clean with soft cloth)",
    "reportAnomaly": "REPORT SYSTEM ANOMALY",
    "success": "Attendance marked successfully!",
    "errorFormat": "Invalid QR code format",
    "errorMissing": "Training ID not found in QR code",
    "manualEntryInfo": "Manual entry feature coming soon"
  }
}

ml_data = {
  "notificationsPage": {
    "title": "അറിയിപ്പുകൾ",
    "subtitle": "പുതിയ വിവരങ്ങളും അറിയിപ്പുകളും",
    "markAllAsRead": "എല്ലാം വായിച്ചതായി അടയാളപ്പെടുത്തുക",
    "noFeeds": "നിങ്ങൾക്ക് പുതിയ അറിയിപ്പുകളൊന്നുമില്ല"
  },
  "scanQrPage": {
    "title1": "സ്കാൻ",
    "title2": "ക്യുആർ കോഡ് (QR Code)",
    "subtitle": "സിസ്റ്റത്തിൽ നിങ്ങളുടെ സാന്നിധ്യം രേഖപ്പെടുത്തുക",
    "scannerTitle": "ക്യുആർ സ്കാനർ (QR Scanner)",
    "scannerDesc": "ക്യാമറയ്ക്ക് മുന്നിൽ കോഡ് കാണിക്കുക",
    "sensorReady": "സെൻസർ തയ്യാറാണ്",
    "activateDesc": "ക്യാമറ പ്രവർത്തിപ്പിക്കാൻ താഴെ ക്ലിക്ക് ചെയ്യുക",
    "initiateScan": "സ്കാൻ തുടങ്ങുക",
    "stopScanning": "സ്കാൻ നിർത്തുക",
    "scanAnother": "മറ്റൊന്ന് സ്കാൻ ചെയ്യുക",
    "close": "അടയ്ക്കുക",
    "manualTitle": "നിർദ്ദേശങ്ങൾ",
    "instruction1": "ക്യാമറ സജീവമാക്കാൻ \"സ്കാൻ തുടങ്ങുക\" ക്ലിക്ക് ചെയ്യുക",
    "instruction2": "ക്യാമറ ഉപയോഗിക്കാൻ അനുമതി നൽകുക",
    "instruction3": "QR കോഡ് ക്യാമറയ്ക്കുള്ളിൽ കൃത്യമായി കാണിക്കുക",
    "instruction4": "വിവരമെടുക്കുന്നതുവരെ ഫോൺ ഇളക്കാതെ പിടിക്കുക",
    "instruction5": "ഹാജർ തത്സമയം രേഖപ്പെടുത്തും",
    "advisoryTitle": "പ്രധാന അറിയിപ്പ്:",
    "advisoryDesc": "പരിശീലന സമയത്ത് മാത്രമേ ഹാജർ രേഖപ്പെടുത്താൻ കഴിയൂ. നിങ്ങളുടെ ലൊക്കേഷൻ പരിശീലന സ്ഥലത്താണെന്ന് ഉറപ്പാക്കുക.",
    "diagnosticsTitle": "സിസ്റ്റം പരിശോധന",
    "opticalFailure": "ക്യാമറ പ്രവർത്തിക്കുന്നില്ലെങ്കിൽ:",
    "diag1": "ഫോൺ സെറ്റിങ്സിൽ ക്യാമറയ്ക്ക് അനുമതിയുണ്ടോയെന്ന് പരിശോധിക്കുക",
    "diag2": "ആവശ്യത്തിന് വെളിച്ചമുണ്ടെന്ന് ഉറപ്പാക്കുക",
    "diag3": "ക്യുആർ കോഡ് വ്യക്തമാണോയെന്ന് പരിശോധിക്കുക",
    "diag4": "ക്യാമറ ലെൻസ് വൃത്തിയാക്കുക",
    "reportAnomaly": "പ്രശ്നം റിപ്പോർട്ട് ചെയ്യുക",
    "success": "ഹാജർ വിജയകരമായി രേഖപ്പെടുത്തി!",
    "errorFormat": "തെറ്റായ QR കോഡ് ഘടന",
    "errorMissing": "QR കോഡിൽ പരിശീലന ID കണ്ടെത്തിയില്ല",
    "manualEntryInfo": "മാനുവൽ എൻട്രി സൗകര്യം ഉടൻ വരും"
  }
}

update_json("src/locales/en/translation.json", en_data)
update_json("src/locales/ml/translation.json", ml_data)

print("Translation JSONs updated successfully!")
