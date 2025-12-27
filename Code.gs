/**
 * UCL Attendance Tracker
 * Fetches iCalendar data from UCL timetable and creates an attendance tracking sheet
 *
 * Features:
 * - Shows ALL events (past and future)
 * - Attendance checkbox for each event
 * - Real-time attendance statistics
 * - 75% attendance target calculator
 * - Optional class filtering
 *
 * Setup Instructions:
 * 1. Copy this code to Google Apps Script (script.google.com)
 * 2. Update CALENDAR_URL with your UCL timetable iCalendar link
 * 3. Run setupSheet() to initialize
 * 4. Run updateTimetable() to fetch and populate data
 */

// Configuration
const CALENDAR_URL = '';
const SHEET_NAME = 'Attendance Tracker';
const TIMEZONE = 'Europe/London';
const ATTENDANCE_TARGET = 0.75; // 75% attendance requirement

// Optional event types (won't count towards required attendance by default)
const OPTIONAL_EVENT_TYPES = ['None'];

/**
 * Main function to update the timetable and attendance tracker
 */
function updateTimetable() {
  try {
    Logger.log('Starting attendance tracker update...');

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
    }

    // Preserve existing attendance data
    const existingAttendance = getExistingAttendance(sheet);

    // Fetch and parse calendar
    const icalData = fetchCalendar(CALENDAR_URL);
    const events = parseICalendar(icalData);
    Logger.log(`Parsed ${events.length} events`);

    // Sort by date (oldest first)
    events.sort((a, b) => a.startDate - b.startDate);

    // Write to sheet with statistics
    writeToSheetWithStats(sheet, events, existingAttendance);

    Logger.log('Attendance tracker updated successfully!');
    SpreadsheetApp.getActiveSpreadsheet().toast('Attendance tracker updated!', 'Success', 3);

  } catch (error) {
    Logger.log('Error updating tracker: ' + error.toString());
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
    throw error;
  }
}

/**
 * Get existing attendance checkboxes from sheet
 */
function getExistingAttendance(sheet) {
  const attendance = {};

  if (sheet.getLastRow() < 10) return attendance; // No data yet

  try {
    // Find where data starts (after statistics section)
    const dataStartRow = findDataStartRow(sheet);
    if (dataStartRow === -1) return attendance;

    const lastRow = sheet.getLastRow();
    if (lastRow < dataStartRow) return attendance;

    // Get UIDs and attendance status
    const uidColumn = 1; // Column A
    const attendanceColumn = 9; // Column I (Attended checkbox)

    const uids = sheet.getRange(dataStartRow, uidColumn, lastRow - dataStartRow + 1, 1).getValues();
    const attendanceValues = sheet.getRange(dataStartRow, attendanceColumn, lastRow - dataStartRow + 1, 1).getValues();

    for (let i = 0; i < uids.length; i++) {
      const uid = uids[i][0];
      if (uid && uid !== 'UID') {
        attendance[uid] = attendanceValues[i][0] === true;
      }
    }
  } catch (e) {
    Logger.log('Error reading existing attendance: ' + e);
  }

  return attendance;
}

/**
 * Find the row where data table starts (after statistics)
 */
function findDataStartRow(sheet) {
  const searchRange = sheet.getRange(1, 1, Math.min(20, sheet.getLastRow()), 1).getValues();
  for (let i = 0; i < searchRange.length; i++) {
    if (searchRange[i][0] === 'UID') {
      return i + 1;
    }
  }
  return -1;
}

/**
 * Fetch iCalendar data from URL
 */
function fetchCalendar(url) {
  try {
    const response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GoogleAppsScript)'
      }
    });

    if (response.getResponseCode() !== 200) {
      throw new Error(`Failed to fetch calendar. HTTP ${response.getResponseCode()}`);
    }

    return response.getContentText();
  } catch (error) {
    throw new Error(`Failed to fetch calendar: ${error.message}`);
  }
}

/**
 * Parse iCalendar text format 
 */
function parseICalendar(icalText) {
  const events = [];
  const lines = unfoldLines(icalText);
  let currentEvent = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line === 'BEGIN:VEVENT') {
      currentEvent = {};
    } else if (line === 'END:VEVENT' && currentEvent) {
      events.push(currentEvent);
      currentEvent = null;
    } else if (currentEvent) {
      parseEventProperty(line, currentEvent);
    }
  }

  return events;
}

/**
 * Unfold lines according to iCalendar spec
 */
function unfoldLines(text) {
  const lines = text.split(/\r?\n/);
  const unfolded = [];
  let current = '';

  for (const line of lines) {
    if (line.startsWith(' ') || line.startsWith('\t')) {
      current += line.substring(1);
    } else {
      if (current) unfolded.push(current);
      current = line;
    }
  }
  if (current) unfolded.push(current);

  return unfolded;
}

/**
 * Parse a single property line
 */
function parseEventProperty(line, event) {
  const colonIndex = line.indexOf(':');
  if (colonIndex === -1) return;

  const key = line.substring(0, colonIndex);
  const value = line.substring(colonIndex + 1);
  const [propertyName] = key.split(';');

  switch (propertyName) {
    case 'SUMMARY':
      event.summary = value;
      const match = value.match(/^(.+?)\s*\[(.+?)\]$/);
      if (match) {
        event.courseName = match[1].trim();
        event.eventType = match[2].trim();
      } else {
        event.courseName = value;
        event.eventType = 'Unknown';
      }
      break;
    case 'DTSTART':
      event.startDate = parseICalDate(value);
      break;
    case 'DTEND':
      event.endDate = parseICalDate(value);
      break;
    case 'LOCATION':
      event.location = value;
      break;
    case 'DESCRIPTION':
      event.description = value;
      event.lecturers = extractLecturers(value);
      break;
    case 'CATEGORIES':
      event.category = value;
      break;
    case 'UID':
      event.uid = value;
      break;
  }
}

/**
 * Parse iCalendar date format
 */
function parseICalDate(dateString) {
  if (dateString.length < 15) return null;

  const year = parseInt(dateString.substring(0, 4));
  const month = parseInt(dateString.substring(4, 6)) - 1;
  const day = parseInt(dateString.substring(6, 8));
  const hour = parseInt(dateString.substring(9, 11));
  const minute = parseInt(dateString.substring(11, 13));
  const second = parseInt(dateString.substring(13, 15));

  return new Date(Date.UTC(year, month, day, hour, minute, second));
}

/**
 * Extract lecturer names from description
 */
function extractLecturers(description) {
  const lecturersMatch = description.match(/Lecturers:\s*([^,]+(?:,\s*[^,]+)*)/);
  if (lecturersMatch) {
    const lecturersText = lecturersMatch[1];
    const cleaned = lecturersText.split(/Event type:/)[0].trim();
    return cleaned.replace(/,\s*$/, '');
  }
  return 'Not specified';
}

/**
 * Write events to sheet with statistics section
 */
function writeToSheetWithStats(sheet, events, existingAttendance) {
  sheet.clear();

  const now = new Date();
  let currentRow = 1;

  // Calculate statistics
  const stats = calculateStatistics(events, existingAttendance, now);

  // Write statistics section
  currentRow = writeStatisticsSection(sheet, stats, currentRow);

  // Add spacing
  currentRow += 2;

  // Write data table headers
  const headers = ['UID', 'Date', 'Start', 'End', 'Course', 'Type', 'Location', 'Lecturers', 'Attended'];
  sheet.getRange(currentRow, 1, 1, headers.length).setValues([headers]);

  // Format header
  const headerRange = sheet.getRange(currentRow, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4A86E8');
  headerRange.setFontColor('#FFFFFF');

  currentRow++;

  // Prepare data rows
  const dataStartRow = currentRow;
  const data = events.map(event => {
    const isPast = event.startDate < now;
    const isOptional = OPTIONAL_EVENT_TYPES.includes(event.eventType);

    return {
      values: [
        event.uid || '',
        Utilities.formatDate(event.startDate, TIMEZONE, 'EEE, MMM dd, yyyy'),
        Utilities.formatDate(event.startDate, TIMEZONE, 'HH:mm'),
        event.endDate ? Utilities.formatDate(event.endDate, TIMEZONE, 'HH:mm') : '',
        event.courseName || event.summary,
        event.eventType || event.category || 'Unknown',
        event.location || 'Not specified',
        event.lecturers || 'Not specified',
        existingAttendance[event.uid] || false
      ],
      isPast: isPast,
      isOptional: isOptional
    };
  });

  // Write data
  if (data.length > 0) {
    const valueArray = data.map(d => d.values);
    sheet.getRange(currentRow, 1, data.length, headers.length).setValues(valueArray);

    // Set checkboxes for attendance column
    const attendanceRange = sheet.getRange(currentRow, 9, data.length, 1);
    attendanceRange.insertCheckboxes();

    // Apply formatting
    applyDataFormatting(sheet, dataStartRow, data);
  }

  // Hide UID column
  sheet.hideColumns(1);

  // Auto-resize columns
  for (let i = 2; i <= headers.length; i++) {
    sheet.autoResizeColumn(i);
  }

  // Freeze header rows (statistics + table header)
  sheet.setFrozenRows(dataStartRow);

  // Add last updated
  sheet.getRange(currentRow + data.length + 2, 1).setValue('Last updated: ' + new Date());
  sheet.getRange(currentRow + data.length + 2, 1).setFontStyle('italic');
}

/**
 * Calculate attendance statistics
 */
function calculateStatistics(events, attendance, now) {
  let totalEvents = 0;
  let totalRequired = 0;
  let attended = 0;
  let attendedRequired = 0;
  let pastEvents = 0;
  let pastRequired = 0;
  let futureRequired = 0;

  events.forEach(event => {
    const isPast = event.startDate < now;
    const isOptional = OPTIONAL_EVENT_TYPES.includes(event.eventType);
    const hasAttended = attendance[event.uid] === true;

    totalEvents++;
    if (!isOptional) totalRequired++;

    if (isPast) {
      pastEvents++;
      if (!isOptional) pastRequired++;
    } else {
      if (!isOptional) futureRequired++;
    }

    if (hasAttended) {
      attended++;
      if (!isOptional) attendedRequired++;
    }
  });

  const attendanceRate = pastRequired > 0 ? (attendedRequired / pastRequired) : 0;
  const attendanceRateAll = pastEvents > 0 ? (attended / pastEvents) : 0;

  // Calculate how many more classes needed for 75%
  const totalRequiredFinal = totalRequired;
  const neededFor75 = Math.ceil(totalRequiredFinal * ATTENDANCE_TARGET) - attendedRequired;
  const canStillMiss = futureRequired - Math.max(0, neededFor75);

  return {
    totalEvents,
    totalRequired,
    attended,
    attendedRequired,
    pastEvents,
    pastRequired,
    futureRequired,
    attendanceRate,
    attendanceRateAll,
    neededFor75: Math.max(0, neededFor75),
    canStillMiss: Math.max(0, canStillMiss)
  };
}

/**
 * Write statistics section at top of sheet
 */
function writeStatisticsSection(sheet, stats, startRow) {
  let row = startRow;

  // Title
  sheet.getRange(row, 1, 1, 5).merge();
  sheet.getRange(row, 1).setValue('📊 ATTENDANCE STATISTICS');
  sheet.getRange(row, 1).setFontSize(14).setFontWeight('bold').setBackground('#4A86E8').setFontColor('#FFFFFF');
  row++;

  // Main stats
  sheet.getRange(row, 1).setValue('Current Attendance Rate (Required Classes Only):');
  sheet.getRange(row, 2).setValue((stats.attendanceRate * 100).toFixed(1) + '%');
  sheet.getRange(row, 2).setFontWeight('bold').setFontSize(12);
  if (stats.attendanceRate >= ATTENDANCE_TARGET) {
    sheet.getRange(row, 2).setFontColor('#0F9D58'); // Green
  } else {
    sheet.getRange(row, 2).setFontColor('#DB4437'); // Red
  }
  row++;

  sheet.getRange(row, 1).setValue('Attended (Required):');
  sheet.getRange(row, 2).setValue(`${stats.attendedRequired} / ${stats.pastRequired}`);
  row++;

  // Including optional
  sheet.getRange(row, 1).setValue('Current Attendance Rate (Including Optional):');
  sheet.getRange(row, 2).setValue((stats.attendanceRateAll * 100).toFixed(1) + '%');
  row++;

  sheet.getRange(row, 1).setValue('Attended (All):');
  sheet.getRange(row, 2).setValue(`${stats.attended} / ${stats.pastEvents}`);
  row++;

  row++; // Spacing

  // Target section
  sheet.getRange(row, 1).setValue('🎯 75% ATTENDANCE TARGET');
  sheet.getRange(row, 1).setFontWeight('bold').setBackground('#F4B400').setFontColor('#000000');
  row++;

  sheet.getRange(row, 1).setValue('Required classes remaining:');
  sheet.getRange(row, 2).setValue(stats.futureRequired);
  row++;

  sheet.getRange(row, 1).setValue('Need to attend (to reach 75%):');
  sheet.getRange(row, 2).setValue(stats.neededFor75);
  sheet.getRange(row, 2).setFontWeight('bold');
  if (stats.neededFor75 === 0) {
    sheet.getRange(row, 2).setFontColor('#0F9D58'); // Green - target met
  } else if (stats.neededFor75 > stats.futureRequired) {
    sheet.getRange(row, 2).setFontColor('#DB4437'); // Red - impossible
    sheet.getRange(row, 3).setValue('⚠️ Cannot reach 75%');
    sheet.getRange(row, 3).setFontColor('#DB4437');
  } else {
    sheet.getRange(row, 2).setFontColor('#F4B400'); // Yellow - need more
  }
  row++;

  sheet.getRange(row, 1).setValue('Can still miss:');
  sheet.getRange(row, 2).setValue(stats.canStillMiss);
  sheet.getRange(row, 2).setFontWeight('bold').setFontColor('#0F9D58');
  row++;

  return row;
}

/**
 * Apply formatting to data rows
 */
function applyDataFormatting(sheet, startRow, data) {
  const now = new Date();

  for (let i = 0; i < data.length; i++) {
    const row = startRow + i;
    const rowData = data[i];

    // Color code by event type and status
    let backgroundColor = '#FFFFFF';

    if (rowData.isOptional) {
      backgroundColor = '#F5F5F5'; // Gray for optional
    } else {
      const eventType = rowData.values[5]; // Type column
      const colorMap = {
        'Lecture': '#E8F0FE',
        'Workshop': '#FFF3E0',
        'Computer Practical': '#F3E5F5'
      };
      backgroundColor = colorMap[eventType] || '#FFFFFF';
    }

    sheet.getRange(row, 1, 1, 9).setBackground(backgroundColor);

    // Dim past events
    if (rowData.isPast) {
      sheet.getRange(row, 1, 1, 9).setFontColor('#666666');
    }
  }
}

/**
 * Set up the sheet and menu
 */
function setupSheet() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📊 Attendance')
    .addItem('Update Timetable', 'updateTimetable')
    .addItem('Recalculate Stats', 'recalculateStats')
    .addItem('Setup Auto-Update', 'setupTrigger')
    .addToUi();

  SpreadsheetApp.getActiveSpreadsheet().toast('Setup complete! Use: 📊 Attendance > Update Timetable', 'Success', 5);
}

/**
 * Recalculate statistics without re-fetching calendar
 */
function recalculateStats() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      SpreadsheetApp.getUi().alert('Please run "Update Timetable" first!');
      return;
    }

    // Just refresh the display (this will recalculate stats)
    updateTimetable();

  } catch (error) {
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
  }
}

/**
 * Set up automatic daily updates
 */
function setupTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'updateTimetable') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger('updateTimetable')
    .timeBased()
    .atHour(6)
    .everyDays(1)
    .create();

  SpreadsheetApp.getUi().alert('Auto-update enabled! Tracker will refresh daily at 6 AM.');
}

/**
 * On open event - add menu
 */
function onOpen() {
  setupSheet();
}
