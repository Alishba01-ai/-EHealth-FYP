/**
 * ============================================================
 * Google Sheets Integration Module
 * ============================================================
 * Handles syncing data to Google Sheets via Google Apps Script.
 * Supports multiple sheets: Appointments, Patients, ActivityLogs
 * ============================================================
 */

// =============================================
// STEP 1: Replace this URL after deploying your Apps Script
// =============================================
const GOOGLE_SCRIPT_URL = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL';

/**
 * Send data to Google Sheets.
 * The `data.sheet` property tells Apps Script which sheet to write to.
 * @param {Object} data - Data object with a `sheet` property
 */
async function syncToGoogleSheets(data) {
    // Skip if URL not configured
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('YOUR_GOOGLE')) {
        console.log('[Sheets] URL not configured. Data saved locally only:', data.sheet);
        return;
    }

    try {
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            cache: 'no-cache',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        console.log(`[Sheets] Synced to "${data.sheet}" sheet.`);
    } catch (error) {
        console.error('[Sheets] Sync error:', error);
    }
}

/**
 * ============================================================
 * GOOGLE APPS SCRIPT CODE (Paste in your Google Sheet)
 * ============================================================
 * 
 * SETUP INSTRUCTIONS:
 * 
 * 1. Create a new Google Spreadsheet at https://sheets.new
 * 
 * 2. Create 4 sheets (tabs) at the bottom, named exactly:
 *    - Appointments
 *    - Patients
 *    - ActivityLogs
 *    - Doctors
 * 
 * 3. Go to Extensions > Apps Script
 * 
 * 4. Delete all existing code and paste the following:
 * 
 * ─────────────── COPY FROM HERE ───────────────
 *
 * function doPost(e) {
 *   try {
 *     var data = JSON.parse(e.postData.contents);
 *     var sheetName = data.sheet || 'ActivityLogs';
 *     var ss = SpreadsheetApp.getActiveSpreadsheet();
 *     var sheet = ss.getSheetByName(sheetName);
 *     
 *     if (!sheet) {
 *       sheet = ss.insertSheet(sheetName);
 *     }
 *     
 *     // Add headers if sheet is empty
 *     if (sheet.getLastRow() === 0) {
 *       var headers = getHeaders(sheetName);
 *       sheet.appendRow(headers);
 *       sheet.getRange(1, 1, 1, headers.length)
 *            .setFontWeight('bold')
 *            .setBackground('#f1f5f9');
 *     }
 *     
 *     // Build row based on sheet type
 *     var row = buildRow(sheetName, data);
 *     sheet.appendRow(row);
 *     
 *     return ContentService.createTextOutput(
 *       JSON.stringify({ result: 'success', sheet: sheetName })
 *     ).setMimeType(ContentService.MimeType.JSON);
 *     
 *   } catch (error) {
 *     return ContentService.createTextOutput(
 *       JSON.stringify({ result: 'error', error: error.toString() })
 *     ).setMimeType(ContentService.MimeType.JSON);
 *   }
 * }
 * 
 * function getHeaders(sheetName) {
 *   switch (sheetName) {
 *     case 'Appointments':
 *       return ['Appointment ID', 'Patient ID', 'Patient Name', 'Patient Email', 'Patient Phone',
 *               'Doctor ID', 'Doctor Name', 'Doctor Email', 'Doctor Specialty',
 *               'Date', 'Time', 'Fee', 'Status', 'Booked At', 'Action'];
 *     case 'Patients':
 *       return ['Patient ID', 'Name', 'Email', 'Phone', 'Registered At'];
 *     case 'ActivityLogs':
 *       return ['Activity ID', 'User Role', 'User Name', 'User Email',
 *               'Activity Type', 'Description', 'Appointment ID', 'Date', 'Time'];
 *     case 'Doctors':
 *       return ['Doctor ID', 'Name', 'Email', 'Specialty', 'Hospital', 'Fee'];
 *     default:
 *       return ['Data'];
 *   }
 * }
 * 
 * function buildRow(sheetName, data) {
 *   switch (sheetName) {
 *     case 'Appointments':
 *       return [
 *         data.id || '', data.patientId || '', data.patientName || '',
 *         data.patientEmail || '', data.patientPhone || '',
 *         data.doctorId || '', data.doctorName || '', data.doctorEmail || '',
 *         data.doctorSpecialty || '', data.date || '', data.time || '',
 *         data.fee || '', data.status || '', data.bookedAt || '',
 *         data.action || 'NEW'
 *       ];
 *     case 'Patients':
 *       return [
 *         data.id || '', data.name || '', data.email || '',
 *         data.phone || '', data.registeredAt || ''
 *       ];
 *     case 'ActivityLogs':
 *       return [
 *         data.activityId || '', data.userRole || '', data.userName || '',
 *         data.userEmail || '', data.activityType || '', data.description || '',
 *         data.appointmentId || '', data.date || '', data.time || ''
 *       ];
 *     case 'Doctors':
 *       return [
 *         data.id || '', data.name || '', data.email || '',
 *         data.specialty || '', data.hospital || '', data.fee || ''
 *       ];
 *     default:
 *       return [JSON.stringify(data)];
 *   }
 * }
 *
 * ─────────────── COPY UNTIL HERE ───────────────
 * 
 * 5. Click "Deploy" > "New deployment"
 * 6. Type: "Web app"
 * 7. Execute as: "Me"
 * 8. Who has access: "Anyone"
 * 9. Click "Deploy" and copy the Web App URL
 * 10. Paste that URL into GOOGLE_SCRIPT_URL above (line 12)
 * 
 * DONE! All data will now auto-sync to your Google Sheet.
 * ============================================================
 */
