# UCL Attendance Tracker

A Google Apps Script that automatically fetches your UCL timetable from iCalendar and creates a comprehensive attendance tracking system with real-time statistics and 75% attendance target monitoring.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-V8-green.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)

## ✨ Features

### 📊 Attendance Tracking
- **All Events Display**: Shows ALL events (past and future), not just upcoming
- **Checkbox System**: Simple checkbox for each class to mark attendance
- **Persistent Data**: Attendance records preserved across updates
- **Past Event Dimming**: Past events appear grayed out for easy distinction

### 📈 Real-Time Statistics
- **Current Attendance Rate**: For required classes only
- **Including Optional**: Separate rate including optional events
- **Attendance Counts**: Shows attended vs. total classes

### 🎯 75% Target Calculator
- **Requirement Tracking**: Automatically calculates how many more classes needed for 75%
- **Flexibility Calculator**: Shows how many classes you can still miss
- **Visual Indicators**:
  - 🟢 Green: Target met or achievable
  - 🟡 Yellow: Need to attend more
  - 🔴 Red: Target impossible to reach
- **Real-time Updates**: Recalculates as you check off attendance

### 🎨 Smart Formatting
- **Color Coding by Event Type**:
  - 🔵 Lectures: Light blue
  - 🟠 Workshops: Light orange
  - 🟣 Computer Practicals: Light purple
  - ⚪ Optional Events: Gray
- **Past Events**: Dimmed text for clarity
- **Professional Layout**: Clean, organized interface

### ⚙️ Configuration
- **Optional Events**: Configure which event types don't count (e.g., "None")
- **Auto-Updates**: Daily automatic refresh of timetable
- **Manual Recalculation**: Refresh stats without re-fetching calendar

## 📸 Screenshot

```
╔══════════════════════════════════════════════════════════╗
║           📊 ATTENDANCE STATISTICS                       ║
╠══════════════════════════════════════════════════════════╣
║ Current Attendance Rate (Required Only): 85.7% ✅        ║
║ Attended (Required): 12 / 14                            ║
║                                                          ║
║ Current Attendance Rate (Including Optional): 83.3%     ║
║ Attended (All): 15 / 18                                 ║
╠══════════════════════════════════════════════════════════╣
║           🎯 75% ATTENDANCE TARGET                       ║
╠══════════════════════════════════════════════════════════╣
║ Required classes remaining: 20                           ║
║ Need to attend (to reach 75%): 14                       ║
║ Can still miss: 6 ✅                                     ║
╚══════════════════════════════════════════════════════════╝

┌────────┬──────────┬───────┬────────┬─────────────────────────┬──────────┬────────────────┬──────────┐
│ Date   │ Start    │ End   │ Course │ Type                    │ Location │ Lecturers      │ Attended │
├────────┼──────────┼───────┼────────┼─────────────────────────┼──────────┼────────────────┼──────────┤
│ Mon... │ 11:00    │ 13:00 │ PoP    │ Lecture                 │ BMA Hall │ Prof Roberts   │ ☑        │
│ Tue... │ 14:00    │ 16:00 │ OOP    │ Computer Practical      │ MPEB 1.2 │ Dr Fu          │ ☑        │
...
```

## 🚀 Quick Start

### 1. Get Your Calendar URL

Find your UCL timetable iCalendar URL:
- Go to your UCL timetable
- Look for iCalendar/ICS export option
- Copy the URL (format: `https://timetable.apps.ucl.ac.uk/icalendar/XXXXX`)

### 2. Create Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new blank spreadsheet
3. Name it "UCL Attendance Tracker"

### 3. Install Script

1. Click **Extensions** → **Apps Script**
2. Delete any existing code
3. Copy the entire content of [`Code.gs`](Code.gs)
4. Paste into the editor
5. **Important**: Update line 20 with YOUR calendar URL:
   ```javascript
   const CALENDAR_URL = 'YOUR_UCL_CALENDAR_URL_HERE';
   ```
6. Click Save (💾)

### 4. Run Setup

1. In Apps Script, select `setupSheet` from the function dropdown
2. Click **Run** (▶️)
3. Authorize when prompted:
   - Click "Review permissions"
   - Choose your Google account
   - Click "Advanced" → "Go to [Project Name] (unsafe)"
   - Click "Allow"

### 5. Import Your Timetable

1. Return to your Google Sheet
2. Click **📊 Attendance** → **Update Timetable**
3. Wait a few seconds
4. Done! Your tracker is ready 🎉

## 📖 Usage

### Marking Attendance

Simply check/uncheck the "Attended" checkbox for each class. Statistics update automatically when you refresh.

### Updating Timetable

- **Manual**: Click **📊 Attendance** → **Update Timetable**
- **Automatic**: Set up daily updates via **📊 Attendance** → **Setup Auto-Update**

### Recalculating Statistics

After marking attendance, click **📊 Attendance** → **Recalculate Stats** to refresh statistics without re-fetching the calendar.

## ⚙️ Configuration

### Change Attendance Target

Edit line 23 in `Code.gs`:
```javascript
const ATTENDANCE_TARGET = 0.75; // Change to 0.80 for 80%, etc.
```

### Configure Optional Events

Edit line 26 to specify which event types don't count toward required attendance:
```javascript
const OPTIONAL_EVENT_TYPES = ['None', 'Induction', 'Social'];
```

### Change Auto-Update Time

Edit the `setupTrigger()` function (line 543):
```javascript
.atHour(6)  // Change to 0-23 for different hour
```

### Change Sheet Name

Edit line 21:
```javascript
const SHEET_NAME = 'My Custom Name';
```

## 🔧 Technical Details

### How It Works

1. **Fetches** iCalendar data from UCL's timetable system
2. **Parses** RFC 5545 compliant iCalendar format
3. **Extracts** all event details (course, time, location, lecturers)
4. **Preserves** your attendance checkboxes across updates
5. **Calculates** statistics in real-time
6. **Displays** everything in an organized Google Sheet

### Data Structure

- **UID**: Hidden column for event identification (preserves attendance)
- **Date**: Event date in readable format
- **Start/End**: Event times in HH:mm format
- **Course**: Course name extracted from event
- **Type**: Event type (Lecture, Workshop, etc.)
- **Location**: Venue information
- **Lecturers**: Teaching staff
- **Attended**: Checkbox for attendance tracking

### Statistics Calculations

- **Attendance Rate**: `(Attended Required) / (Total Past Required)` × 100%
- **Including Optional**: `(All Attended) / (All Past Events)` × 100%
- **Need to Attend**: `⌈(Total Required × 0.75)⌉ - (Currently Attended)`
- **Can Still Miss**: `(Future Required) - (Need to Attend)`

## 🐛 Troubleshooting

### No Events Showing
- Verify your `CALENDAR_URL` is correct (line 20)
- Try accessing the URL directly in a browser
- Check you have internet connection
- Ensure calendar is publicly accessible

### Statistics Not Updating
- Click **📊 Attendance** → **Recalculate Stats**
- Check that checkboxes are properly marked
- Verify system recognizes event types correctly

### Authorization Expired
- Go to Apps Script → Settings
- Remove old authorizations
- Re-run setup process

### Attendance Lost After Update
- Don't delete the UID column (it's hidden by default)
- If UIDs change, you'll need to re-mark attendance
- Consider backing up your sheet regularly

### Script Timeout
- If you have 200+ events, the script may timeout
- Run it again, and it will continue
- Or increase the trigger frequency

## 📊 Tips & Best Practices

1. **Regular Updates**: Run "Update Timetable" weekly to catch any timetable changes
2. **Mark Promptly**: Check attendance boxes shortly after each class
3. **Backup**: Make periodic copies of your sheet
4. **Share**: You can share with friends (they need their own copy though)
5. **Color Codes**: Use the color coding to quickly identify event types
6. **Past Events**: Don't delete past events - they're needed for statistics
7. **Optional Classes**: Configure what counts as optional to get accurate 75% calculations

## 🎓 Why This Matters

UCL requires 75% attendance for most courses. This tracker helps you:
- Know exactly where you stand at any moment
- Plan ahead (can you afford to miss today?)
- Avoid surprises at the end of term
- Stay organized throughout the semester

## 🔐 Privacy & Security

- All data stays in YOUR Google account
- No data sent to external servers (except UCL's timetable)
- Only you can see and edit your attendance
- Calendar URL should be kept private
- Open source - inspect the code yourself

## 🛠️ Development

### File Structure

```
calendar-scraper/
├── Code.gs              # Main script
├── appsscript.json      # Configuration
└── README.md            # This file
```

### Extending

Want to add features? Some ideas:
- Email notifications for low attendance
- Export to PDF
- Charts and graphs
- Per-course attendance breakdown
- Integration with other UCL services

Feel free to fork and customize!

## 📝 License

MIT License - Feel free to use and modify

## 🤝 Contributing

Found a bug? Have a feature request?
- Open an issue on GitHub
- Submit a pull request
- Share your improvements

## 🙏 Acknowledgments

- Built for UCL students
- Uses Google Apps Script
- Follows RFC 5545 (iCalendar specification)
- Inspired by the need to track attendance easily

## 📞 Support

- Check this README for common issues
- Review the code comments for implementation details
- Test with Apps Script logger for debugging
- Ask in UCL student forums

---

**Made with ❤️ for UCL students**

*Last updated: November 2025*

## 🚨 Disclaimer

This is an unofficial tool not affiliated with UCL. Attendance records in this tracker are for personal use only. Always verify your official attendance records through UCL systems.
