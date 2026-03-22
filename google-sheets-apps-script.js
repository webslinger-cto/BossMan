// Google Apps Script Code
// Deploy this as a Web App in Google Apps Script to handle Sheets integration
// This goes in script.google.com, not in your Node.js app

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    switch (action) {
      case 'addProspect':
        return handleAddProspect(data.data);
      case 'updateStatus':
        return handleUpdateStatus(data.prospectId, data.status);
      case 'addContent':
        return handleAddContent(data.weekStart, data.content);
      default:
        return ContentService
          .createTextOutput(JSON.stringify({ error: 'Unknown action' }))
          .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  const action = e.parameter.action;
  
  switch (action) {
    case 'getOverdue':
      return handleGetOverdue();
    default:
      return ContentService
        .createTextOutput(JSON.stringify({ error: 'Unknown GET action' }))
        .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleAddProspect(prospectData) {
  // Get the BossMan Sales Pipeline spreadsheet
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName('Sales Tracking') || spreadsheet.getSheets()[0];
  
  // Add row with prospect data
  const now = new Date();
  const followUpDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days later
  
  const row = [
    now,                           // A: Date
    prospectData.name,             // B: Name  
    prospectData.company,          // C: Company
    prospectData.email,            // D: Email
    prospectData.phone,            // E: Phone
    prospectData.linkedin,         // F: LinkedIn
    prospectData.source,           // G: Source
    'New',                         // H: Status
    prospectData.notes,            // I: Notes
    '',                           // J: Outreach Type
    '',                           // K: Template Used
    '',                           // L: Response Date
    followUpDate,                 // M: Follow Up Date
    'No',                         // N: Demo Scheduled
    'No',                         // O: Trial Started
    'No'                          // P: Converted
  ];
  
  sheet.appendRow(row);
  
  return ContentService
    .createTextOutput(JSON.stringify({ success: true, message: 'Prospect added' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleUpdateStatus(prospectId, status) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName('Sales Tracking') || spreadsheet.getSheets()[0];
  
  const data = sheet.getDataRange().getValues();
  
  // Find prospect by ID (assuming row number as ID for simplicity)
  const rowIndex = parseInt(prospectId);
  if (rowIndex > 0 && rowIndex < data.length) {
    sheet.getRange(rowIndex + 1, 8).setValue(status); // Column H (Status)
    
    // Update response date if status indicates response
    if (status === 'Responded') {
      sheet.getRange(rowIndex + 1, 12).setValue(new Date()); // Column L (Response Date)
    }
  }
  
  return ContentService
    .createTextOutput(JSON.stringify({ success: true, message: 'Status updated' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleGetOverdue() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName('Sales Tracking') || spreadsheet.getSheets()[0];
  
  const data = sheet.getDataRange().getValues();
  const today = new Date();
  const overdueProspects = [];
  
  // Skip header row
  for (let i = 1; i < data.length; i++) {
    const followUpDate = data[i][12]; // Column M (Follow Up Date)
    const status = data[i][7];        // Column H (Status)
    const name = data[i][1];          // Column B (Name)
    const company = data[i][2];       // Column C (Company)
    
    if (followUpDate && followUpDate < today && status !== 'Converted' && status !== 'Not Interested') {
      overdueProspects.push({
        id: i,
        name: name,
        company: company,
        status: status,
        followUpDate: followUpDate,
        daysOverdue: Math.floor((today - followUpDate) / (1000 * 60 * 60 * 24))
      });
    }
  }
  
  return ContentService
    .createTextOutput(JSON.stringify({ prospects: overdueProspects }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleAddContent(weekStart, content) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName('Content Calendar');
  
  // Create sheet if it doesn't exist
  if (!sheet) {
    sheet = spreadsheet.insertSheet('Content Calendar');
    // Add headers
    sheet.getRange(1, 1, 1, 8).setValues([
      ['Week Start', 'Monday Post', 'Wednesday Post', 'Friday Post', 'Apollo Template', 'Performance', 'Notes', 'Created']
    ]);
  }
  
  const row = [
    new Date(weekStart),
    content.monday || '',
    content.wednesday || '',
    content.friday || '',
    content.apollo || '',
    '',  // Performance placeholder
    '',  // Notes placeholder
    new Date()
  ];
  
  sheet.appendRow(row);
  
  return ContentService
    .createTextOutput(JSON.stringify({ success: true, message: 'Content added' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Utility function to set up sheets with proper formatting
function setupSheets() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  
  // Set up Sales Tracking sheet
  let salesSheet = spreadsheet.getSheetByName('Sales Tracking');
  if (!salesSheet) {
    salesSheet = spreadsheet.insertSheet('Sales Tracking');
  }
  
  // Headers for Sales Tracking
  const salesHeaders = [
    'Date', 'Name', 'Company', 'Email', 'Phone', 'LinkedIn', 'Source', 'Status',
    'Notes', 'Outreach Type', 'Template Used', 'Response Date', 'Follow Up Date',
    'Demo Scheduled', 'Trial Started', 'Converted'
  ];
  
  salesSheet.getRange(1, 1, 1, salesHeaders.length).setValues([salesHeaders]);
  salesSheet.getRange(1, 1, 1, salesHeaders.length).setFontWeight('bold');
  
  // Set up Content Calendar sheet
  let contentSheet = spreadsheet.getSheetByName('Content Calendar');
  if (!contentSheet) {
    contentSheet = spreadsheet.insertSheet('Content Calendar');
  }
  
  const contentHeaders = [
    'Week Start', 'Monday Post', 'Wednesday Post', 'Friday Post', 
    'Apollo Template', 'Performance', 'Notes', 'Created'
  ];
  
  contentSheet.getRange(1, 1, 1, contentHeaders.length).setValues([contentHeaders]);
  contentSheet.getRange(1, 1, 1, contentHeaders.length).setFontWeight('bold');
  
  return 'Sheets setup complete!';
}