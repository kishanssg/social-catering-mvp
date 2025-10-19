import { apiClient } from '../lib/api';

export interface TimesheetExportParams {
  start_date?: string;
  end_date?: string;
}

// Export timesheet as CSV
export const exportTimesheet = async (params?: TimesheetExportParams): Promise<Blob> => {
  const response = await apiClient.get('/exports/timesheet', { 
    params,
    responseType: 'blob'
  });
  return response.data;
};

// Helper function to download CSV
export const downloadTimesheet = async (params?: TimesheetExportParams): Promise<void> => {
  try {
    const blob = await exportTimesheet(params);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const startDate = params?.start_date || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = params?.end_date || new Date().toISOString().split('T')[0];
    
    link.download = `timesheet_${startDate}_to_${endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading timesheet:', error);
    throw error;
  }
};
