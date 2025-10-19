import React, { useState, useEffect } from 'react';
import { Download, Calendar, DollarSign, Users, Clock } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { SortableTable } from '../../components/ui/SortableTable';
import type { Column } from '../../components/ui/SortableTable';
import { FilterBar } from '../../components/ui/FilterBar';
import { apiService } from '../../services/api';
import { useWorkers } from '../../hooks/useWorkers';
import { useLocations } from '../../hooks/useLocations';

interface TimesheetData {
  id: number;
  date: string;
  worker: {
    id: number;
    name: string;
    email: string;
  };
  shift: {
    id: number;
    client_name: string;
    role_needed: string;
    location: string;
  };
  hours_worked: number;
  hourly_rate: number;
  total_pay: number;
  status: string;
}

interface TimesheetSummary {
  total_hours: number;
  total_pay: number;
  worker_count: number;
  shift_count: number;
  date_range: {
    start: string;
    end: string;
  };
}

export default function TimesheetPage() {
  const { workers } = useWorkers();
  const { locations } = useLocations();
  
  const [timesheetData, setTimesheetData] = useState<TimesheetData[]>([]);
  const [summary, setSummary] = useState<TimesheetSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Filters
  const [dateRange, setDateRange] = useState('week');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [workerId, setWorkerId] = useState('all');
  const [locationId, setLocationId] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Initialize date range
  useEffect(() => {
    const today = new Date();
    let start: Date;
    let end: Date;

    switch (dateRange) {
      case 'week':
        start = startOfWeek(today, { weekStartsOn: 0 });
        end = endOfWeek(today, { weekStartsOn: 0 });
        break;
      case 'month':
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      case 'custom':
        return; // Don't auto-set for custom
      default:
        start = startOfWeek(today, { weekStartsOn: 0 });
        end = endOfWeek(today, { weekStartsOn: 0 });
    }

    setStartDate(format(start, 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
  }, [dateRange]);

  // Fetch timesheet data
  useEffect(() => {
    if (startDate && endDate) {
      fetchTimesheetData();
    }
  }, [startDate, endDate, workerId, locationId]);

  const fetchTimesheetData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        ...(workerId !== 'all' && { worker_id: workerId }),
        ...(locationId !== 'all' && { location_id: locationId })
      });

      const response = await apiService.get(`/reports/timesheet/preview?${params}`);
      
      if (response.data.status === 'success') {
        setTimesheetData(response.data.data.assignments);
        setSummary(response.data.data.summary);
      }
    } catch (error) {
      console.error('Failed to fetch timesheet data:', error);
      alert('Failed to load timesheet data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        ...(workerId !== 'all' && { worker_id: workerId }),
        ...(locationId !== 'all' && { location_id: locationId })
      });

      const response = await apiService.get(`/reports/timesheet?${params}`, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `timesheet_${startDate}_to_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      alert('Timesheet exported successfully');
    } catch (error) {
      console.error('Failed to export timesheet:', error);
      alert('Failed to export timesheet');
    }
  };

  // Filter data locally by search term
  const filteredData = timesheetData.filter(item => {
    if (!searchTerm) return true;
    
    const search = searchTerm.toLowerCase();
    return (
      item.worker.name.toLowerCase().includes(search) ||
      item.worker.email.toLowerCase().includes(search) ||
      item.shift.client_name.toLowerCase().includes(search) ||
      item.shift.role_needed.toLowerCase().includes(search)
    );
  });

  // Table columns
  const columns: Column<TimesheetData>[] = [
    {
      key: 'date',
      label: 'Date',
      sortable: true,
      render: (item) => (
        <div>
          <div className="font-medium">{format(new Date(item.date), 'MMM dd, yyyy')}</div>
          <div className="text-xs text-gray-500">{format(new Date(item.date), 'EEEE')}</div>
        </div>
      )
    },
    {
      key: 'worker',
      label: 'Worker',
      sortable: true,
      render: (item) => (
        <div>
          <div className="font-medium">{item.worker.name}</div>
          <div className="text-xs text-gray-500">{item.worker.email}</div>
        </div>
      )
    },
    {
      key: 'shift',
      label: 'Shift Details',
      render: (item) => (
        <div>
          <div className="font-medium">{item.shift.client_name}</div>
          <div className="text-sm text-gray-600">{item.shift.role_needed}</div>
          <div className="text-xs text-gray-500">{item.shift.location}</div>
        </div>
      )
    },
    {
      key: 'hours_worked',
      label: 'Hours',
      sortable: true,
      render: (item) => (
        <span className="font-medium">{item.hours_worked.toFixed(2)}</span>
      )
    },
    {
      key: 'hourly_rate',
      label: 'Rate',
      sortable: true,
      render: (item) => (
        <span>${item.hourly_rate.toFixed(2)}</span>
      )
    },
    {
      key: 'total_pay',
      label: 'Total',
      sortable: true,
      render: (item) => (
        <span className="font-semibold text-green-600">
          ${item.total_pay.toFixed(2)}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (item) => (
        <span
          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            item.status === 'completed'
              ? 'bg-green-100 text-green-800'
              : item.status === 'assigned'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {item.status}
        </span>
      )
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Timesheet Report</h1>
        <p className="text-gray-600 mt-2">Track hours worked and generate payroll reports</p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Hours</p>
                <p className="text-2xl font-bold">{summary.total_hours.toFixed(2)}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Pay</p>
                <p className="text-2xl font-bold">${summary.total_pay.toFixed(2)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Workers</p>
                <p className="text-2xl font-bold">{summary.worker_count}</p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Shifts</p>
                <p className="text-2xl font-bold">{summary.shift_count}</p>
              </div>
              <Calendar className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Range
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          
          {dateRange === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}
        </div>

        <FilterBar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          filters={[
            {
              key: 'worker',
              label: 'Worker',
              value: workerId,
              options: [
                { value: 'all', label: 'All Workers' },
                ...workers.map(w => ({
                  value: w.id.toString(),
                  label: `${w.first_name} ${w.last_name}`
                }))
              ],
              onChange: setWorkerId
            },
            {
              key: 'location',
              label: 'Location',
              value: locationId,
              options: [
                { value: 'all', label: 'All Locations' },
                ...locations.map(l => ({
                  value: l.id.toString(),
                  label: l.display_name
                }))
              ],
              onChange: setLocationId
            }
          ]}
          actions={
            <button
              onClick={handleExport}
              disabled={!timesheetData.length}
              className="btn-green flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-5 h-5" />
              Export CSV
            </button>
          }
        />
      </div>

      {/* Data Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64 bg-white rounded-lg shadow">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <SortableTable
          data={filteredData}
          columns={columns}
          keyExtractor={(item) => item.id}
          emptyMessage="No timesheet data found for the selected period"
        />
      )}
    </div>
  );
}
