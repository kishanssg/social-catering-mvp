import React, { useState } from 'react';
import { apiClient } from '../lib/api';
import { Toast } from '../components/common/Toast';
import { 
  Download, 
  FileText, 
  Calendar, 
  DollarSign,
  Users,
  Clock,
  Filter,
  Search,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

type ReportType = 'timesheet' | 'payroll' | 'worker_hours' | 'event_summary';
type DatePreset = 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'this_month' | 'last_month' | 'custom';

interface DateRange {
  start: string;
  end: string;
}

export function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [datePreset, setDatePreset] = useState<DatePreset>('last_7_days');
  const [customDateRange, setCustomDateRange] = useState<DateRange>({
    start: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [workers, setWorkers] = useState<Array<{ id: number; name: string; skills_json?: string[] }>>([]);
  const [events, setEvents] = useState<Array<{ id: number; title: string }>>([]);
  const [skills, setSkills] = useState<string[]>([]);

  // Toast state
  const [toast, setToast] = useState<{
    isVisible: boolean;
    message: string;
    type: 'success' | 'error';
  }>({ isVisible: false, message: '', type: 'success' });

  React.useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get('/workers?active=true');
        const list = res.data?.data?.workers || res.data?.data || [];
        const mapped = list.map((w: any) => ({
          id: w.id,
          name: `${w.first_name} ${w.last_name}`,
          skills_json: w.skills_json || []
        }));
        setWorkers(mapped);
        const skillSet = new Set<string>();
        mapped.forEach(w => (w.skills_json || []).forEach((s: string) => skillSet.add(s)));
        setSkills(Array.from(skillSet).sort());
      } catch (e) {
        console.error('Failed to load workers for filters', e);
      }
    })();

    (async () => {
      try {
        const res = await apiClient.get('/events?tab=active');
        const list = res.data?.data || [];
        setEvents(list.map((ev: any) => ({ id: ev.id, title: ev.title })));
      } catch (e) {
        console.error('Failed to load events for filters', e);
      }
    })();
  }, []);
  
  // Calculate date range based on preset
  const getDateRange = (): DateRange => {
    const today = new Date();
    
    switch (datePreset) {
      case 'today':
        return {
          start: format(today, 'yyyy-MM-dd'),
          end: format(today, 'yyyy-MM-dd')
        };
      case 'yesterday':
        const yesterday = subDays(today, 1);
        return {
          start: format(yesterday, 'yyyy-MM-dd'),
          end: format(yesterday, 'yyyy-MM-dd')
        };
      case 'last_7_days':
        return {
          start: format(subDays(today, 7), 'yyyy-MM-dd'),
          end: format(today, 'yyyy-MM-dd')
        };
      case 'last_30_days':
        return {
          start: format(subDays(today, 30), 'yyyy-MM-dd'),
          end: format(today, 'yyyy-MM-dd')
        };
      case 'this_month':
        return {
          start: format(startOfMonth(today), 'yyyy-MM-dd'),
          end: format(endOfMonth(today), 'yyyy-MM-dd')
        };
      case 'last_month':
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        return {
          start: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
          end: format(endOfMonth(lastMonth), 'yyyy-MM-dd')
        };
      case 'custom':
        return customDateRange;
      default:
        return customDateRange;
    }
  };
  
  async function handleExport(reportType: ReportType) {
    if (!selectedReport) {
      setToast({
        isVisible: true,
        message: 'Please select a report type first',
        type: 'error'
      });
      return;
    }
    
    setExporting(true);
    
    try {
      const dateRange = getDateRange();
      let endpoint = '';
      
      switch (reportType) {
        case 'timesheet':
          endpoint = `/reports/timesheet?start_date=${dateRange.start}&end_date=${dateRange.end}`;
          if (selectedEventId) endpoint += `&event_id=${selectedEventId}`;
          if (selectedWorkerId) endpoint += `&worker_id=${selectedWorkerId}`;
          if (selectedSkill) endpoint += `&skill_name=${encodeURIComponent(selectedSkill)}`;
          break;
          
        case 'payroll':
          endpoint = `/reports/payroll?start_date=${dateRange.start}&end_date=${dateRange.end}`;
          if (selectedEventId) endpoint += `&event_id=${selectedEventId}`;
          if (selectedWorkerId) endpoint += `&worker_id=${selectedWorkerId}`;
          break;
          
        case 'worker_hours':
          endpoint = `/reports/worker_hours?start_date=${dateRange.start}&end_date=${dateRange.end}`;
          if (selectedWorkerId) endpoint += `&worker_id=${selectedWorkerId}`;
          if (selectedSkill) endpoint += `&skill_name=${encodeURIComponent(selectedSkill)}`;
          break;
          
        case 'event_summary':
          endpoint = `/reports/event_summary?start_date=${dateRange.start}&end_date=${dateRange.end}`;
          if (selectedEventId) endpoint += `&event_id=${selectedEventId}`;
          break;
          
      }

      // Request as blob via API client and trigger download
      const response = await apiClient.get(endpoint, { responseType: 'blob' });

      const disposition = (response.headers as any)['content-disposition'] as string | undefined;
      const suggestedName = disposition?.match(/filename="?([^";]+)"?/i)?.[1];
      const fileName = suggestedName || `report_${dateRange.start}_to_${dateRange.end}.csv`;

      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Failed to export:', error);
      setToast({
        isVisible: true,
        message: 'Failed to export report',
        type: 'error'
      });
    } finally {
      setExporting(false);
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>
          <p className="text-gray-600 mt-1">Export timesheets and payroll data for processing</p>
        </div>
        
        {/* Quick Export Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Timesheet Report */}
          <ReportCard
            icon={<FileText size={24} />}
            title="Weekly Timesheet"
            description="Detailed time records with clock-in/clock-out times. Use as backup documentation if needed."
            color="teal"
            lastExport="Last 7 days"
            onExport={() => {
              setDatePreset('last_7_days');
              handleExport('timesheet');
            }}
            exporting={exporting}
          />
          
          {/* Payroll Report */}
          <ReportCard
            icon={<DollarSign size={24} />}
            title="Payroll Summary"
            description="See total hours and compensation per worker. Perfect for processing weekly or monthly payroll."
            color="indigo"
            lastExport="Last 7 days"
            onExport={() => {
              setDatePreset('last_7_days');
              handleExport('payroll');
            }}
            exporting={exporting}
          />
          
          {/* Worker Hours Report */}
          <ReportCard
            icon={<Users size={24} />}
            title="Worker Hours Report"
            description="Individual worker breakdown showing all shifts worked. Good for performance reviews and audits."
            color="blue"
            lastExport="This month"
            onExport={() => {
              setDatePreset('this_month');
              handleExport('worker_hours');
            }}
            exporting={exporting}
          />
          
          {/* Event Summary Report */}
          <ReportCard
            icon={<Calendar size={24} />}
            title="Event Summary"
            description="Track labor costs per event. See which events are most expensive and monitor monthly spending."
            color="purple"
            lastExport="Last 30 days"
            onExport={() => {
              setDatePreset('last_30_days');
              handleExport('event_summary');
            }}
            exporting={exporting}
          />
          
        </div>
        
        {/* Advanced Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Advanced Export Options</h2>
          
          <div className="space-y-6">
            {/* Report Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Report Type
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <button
                  onClick={() => setSelectedReport('timesheet')}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedReport === 'timesheet'
                      ? 'border-teal-600 bg-teal-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      selectedReport === 'timesheet' ? 'bg-teal-100 text-teal-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      <FileText size={20} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">Timesheet Report</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Job ID, Worker, Role, Hours, Break Time, Supervisor
                      </p>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => setSelectedReport('payroll')}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedReport === 'payroll'
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      selectedReport === 'payroll' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      <DollarSign size={20} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">Payroll Summary</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Date, Event, Worker, Hours, Rate, Total Pay
                      </p>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => setSelectedReport('worker_hours')}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedReport === 'worker_hours'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      selectedReport === 'worker_hours' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      <Clock size={20} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">Worker Hours</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Total hours by worker for period
                      </p>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => setSelectedReport('event_summary')}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedReport === 'event_summary'
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      selectedReport === 'event_summary' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      <TrendingUp size={20} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">Event Summary</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Complete staffing details by event
                      </p>
                    </div>
                  </div>
                </button>
                
              </div>
            </div>
            
            {/* Date Range Selection */}
            {selectedReport && (
              <>
                <div className="border-t border-gray-200 pt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Date Range
                  </label>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                    {[
                      { value: 'today', label: 'Today' },
                      { value: 'yesterday', label: 'Yesterday' },
                      { value: 'last_7_days', label: 'Last 7 Days' },
                      { value: 'last_30_days', label: 'Last 30 Days' },
                      { value: 'this_month', label: 'This Month' },
                      { value: 'last_month', label: 'Last Month' },
                      { value: 'custom', label: 'Custom Range' }
                    ].map(preset => (
                      <button
                        key={preset.value}
                    onClick={() => {
                      setDatePreset(preset.value as DatePreset);
                      // Reset custom date range when switching to a preset
                      if (preset.value !== 'custom') {
                        setCustomDateRange({
                          start: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
                          end: format(new Date(), 'yyyy-MM-dd')
                        });
                      }
                    }}
                        className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                          datePreset === preset.value
                            ? 'bg-teal-100 text-teal-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  
                  {/* Custom Date Inputs */}
                  {datePreset === 'custom' && (
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={customDateRange.start}
                          onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                      
                      <div className="pt-6">
                        <span className="text-gray-500">to</span>
                      </div>
                      
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          End Date
                        </label>
                        <input
                          type="date"
                          value={customDateRange.end}
                          onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Date Range Preview */}
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-blue-700">
                      <Calendar size={16} />
                      <span className="font-medium">
                        Selected Range: {format(new Date(getDateRange().start), 'MMM d, yyyy')} - {format(new Date(getDateRange().end), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Optional Filters */}
                <div className="border-t border-gray-200 pt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Optional Filters
                  </label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Worker Filter */}
                    {(selectedReport === 'timesheet' || selectedReport === 'payroll' || selectedReport === 'worker_hours') && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-2">
                          Filter by Worker (optional)
                        </label>
                        <select
                          value={selectedWorkerId || ''}
                          onChange={(e) => setSelectedWorkerId(e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                          <option value="">All Workers</option>
                          {workers.map(w => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    
                    {/* Event Filter */}
                    {(selectedReport === 'timesheet' || selectedReport === 'payroll' || selectedReport === 'event_summary') && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-2">
                          Filter by Event (optional)
                        </label>
                        <select
                          value={selectedEventId || ''}
                          onChange={(e) => setSelectedEventId(e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                          <option value="">All Events</option>
                          {events.map(ev => (
                            <option key={ev.id} value={ev.id}>{ev.title}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Skill Filter */}
                    {(selectedReport === 'timesheet' || selectedReport === 'worker_hours') && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-2">
                          Filter by Skill (optional)
                        </label>
                        <select
                          value={selectedSkill || ''}
                          onChange={(e) => setSelectedSkill(e.target.value || null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                          <option value="">All Skills</option>
                          {skills.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Export Button */}
                <div className="border-t border-gray-200 pt-6">
                  <button
                    onClick={() => selectedReport && handleExport(selectedReport)}
                    disabled={exporting}
                    className="w-full md:w-auto px-6 py-3 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Download size={20} />
                    {exporting ? 'Exporting...' : 'Export CSV Report'}
                  </button>
                  
                  {/* Info Box */}
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-700">
                        <p className="font-medium text-blue-800 mb-2">Export Information:</p>
                        <ul className="space-y-1 text-xs">
                          <li>• <strong>Timesheet Format:</strong> Matches your sample exactly (JOB_ID, SKILL_NAME, etc.)</li>
                          <li>• <strong>Break Policy:</strong> 30 minutes (0.5 hours) per shift by default</li>
                          <li>• <strong>Hours Calculation:</strong> (End Time - Start Time) - Break Time</li>
                          <li>• <strong>Status Filter:</strong> Only completed/approved shifts are exported</li>
                          <li>• <strong>Date Format:</strong> MM/DD/YYYY, Times in 12-hour format (AM/PM)</li>
                          <li>• <strong>Overnight Shifts:</strong> Use start date for shift date</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Help Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            📋 Which Report Should I Use?
          </h3>
          
          <div className="space-y-4">
            {/* Payroll Summary */}
            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-indigo-600 font-semibold">💰</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">
                    Payroll Summary
                  </h4>
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Use this to pay your workers.</strong> Shows one row per worker with total hours and total amount you owe them.
                  </p>
                  <p className="text-xs text-gray-500">
                    <strong>Columns:</strong> Worker Name, Total Hours, Average Rate, Total Compensation, Shifts Worked, Events
                  </p>
                </div>
              </div>
            </div>

            {/* Event Summary */}
            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-purple-600 font-semibold">📊</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">
                    Event Summary
                  </h4>
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Use this to track event costs.</strong> Shows how many workers per event and total labor cost. Perfect for monthly cost tracking.
                  </p>
                  <p className="text-xs text-gray-500">
                    <strong>Columns:</strong> Event Title, Date, Venue, Workers Needed/Assigned, Total Event Cost, Supervisor
                  </p>
                </div>
              </div>
            </div>

            {/* Weekly Timesheet */}
            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-teal-600 font-semibold">🕐</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">
                    Weekly Timesheet
                  </h4>
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Detailed time tracking.</strong> Shows clock-in/clock-out times for each shift. Use this as backup if a worker disputes their hours.
                  </p>
                  <p className="text-xs text-gray-500">
                    <strong>Columns:</strong> Worker Name, Shift Date, Start Time, End Time, Break Time, Total Hours, Supervisor
                  </p>
                </div>
              </div>
            </div>

            {/* Worker Hours Report */}
            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-blue-600 font-semibold">👤</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">
                    Worker Hours Report
                  </h4>
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Individual worker breakdown.</strong> Shows all shifts for specific workers. Good for performance reviews or checking one person's work history.
                  </p>
                  <p className="text-xs text-gray-500">
                    <strong>Columns:</strong> Worker Name, Event Name, Date, Role, Hours, Pay Rate, Payout (with TOTAL row)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="mt-6 pt-4 border-t border-blue-200">
            <h4 className="font-semibold text-gray-900 mb-2 text-sm">💡 Quick Tips:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• <strong>Weekly payroll?</strong> Use "Payroll Summary" with "Last 7 days"</li>
              <li>• <strong>Monthly cost review?</strong> Use "Event Summary" with "This month"</li>
              <li>• <strong>Worker disputed hours?</strong> Use "Weekly Timesheet" to show proof</li>
              <li>• <strong>All reports open in Excel/Numbers</strong> - just download and use!</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </div>
  );
}

// Report Card Component
interface ReportCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: 'teal' | 'indigo' | 'blue' | 'purple';
  lastExport: string;
  onExport: () => void;
  exporting: boolean;
}

function ReportCard({ icon, title, description, color, lastExport, onExport, exporting }: ReportCardProps) {
  const colorClasses = {
    teal: 'bg-teal-100 text-teal-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600'
  };
  
  const buttonColorClasses = {
    teal: 'hover:bg-teal-700',
    indigo: 'hover:bg-indigo-700',
    blue: 'hover:bg-blue-700',
    purple: 'hover:bg-purple-700'
  };
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-lg ${colorClasses[color]} flex items-center justify-center`}>
          {icon}
        </div>
        <button
          onClick={onExport}
          disabled={exporting}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
          title="Quick export"
        >
          <Download size={20} />
        </button>
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {title}
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        {description}
      </p>
      
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Calendar size={16} />
        <span>{lastExport}</span>
      </div>
    </div>
  );
}