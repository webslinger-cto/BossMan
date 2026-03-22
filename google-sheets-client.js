// Google Sheets Integration Client
// Uses Google Apps Script Web App as intermediary for authentication
// This avoids complex OAuth flows and uses a simple webhook approach

class GoogleSheetsClient {
  constructor(webAppUrl) {
    this.webAppUrl = webAppUrl;
  }

  // Send data to Google Sheets via Apps Script Web App
  async addProspect(prospectData) {
    try {
      const response = await fetch(this.webAppUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'addProspect',
          data: prospectData
        })
      });
      
      return await response.json();
    } catch (error) {
      console.error('Error adding prospect to sheets:', error);
      throw error;
    }
  }

  // Update prospect status in sheets
  async updateProspectStatus(prospectId, status) {
    try {
      const response = await fetch(this.webAppUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'updateStatus',
          prospectId,
          status
        })
      });
      
      return await response.json();
    } catch (error) {
      console.error('Error updating prospect status:', error);
      throw error;
    }
  }

  // Get overdue prospects from sheets
  async getOverdueProspects() {
    try {
      const response = await fetch(`${this.webAppUrl}?action=getOverdue`);
      return await response.json();
    } catch (error) {
      console.error('Error getting overdue prospects:', error);
      throw error;
    }
  }

  // Add content to content calendar
  async addWeeklyContent(weekStart, content) {
    try {
      const response = await fetch(this.webAppUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'addContent',
          weekStart,
          content
        })
      });
      
      return await response.json();
    } catch (error) {
      console.error('Error adding content to calendar:', error);
      throw error;
    }
  }
}

module.exports = GoogleSheetsClient;