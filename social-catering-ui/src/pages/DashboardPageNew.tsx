import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatCard } from '../components/dashboard/StatCard';
import { CalendarWidget } from '../components/dashboard/CalendarWidget';
import { UrgentShiftsList } from '../components/dashboard/UrgentShiftsList';
import { getEvents } from '../services/eventsApi';
import { getShifts } from '../services/shiftsApi';

interface DashboardStats {
  activeEvents: number;
  todayShifts: number;
  weekShifts: number;
  gapsToFill: number;
}

interface CalendarShift {
  id: number;
  date: Date;
  status: 'fully_staffed' | 'needs_workers' | 'partially_staffed';
  count: number;
}

interface UrgentShift {
  id: number;
  event_title: string;
  role_needed: string;
  start_time_utc: string;
  staffing_progress: {
    assigned: number;
    required: number;
    percentage: number;
  };
  status: string;
}

export function DashboardPageNew() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    activeEvents: 0,
    todayShifts: 0,
    weekShifts: 0,
    gapsToFill: 0
  });
  const [calendarShifts, setCalendarShifts] = useState<CalendarShift[]>([]);
  const [urgentShifts, setUrgentShifts] = useState<UrgentShift[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadDashboardData();
  }, []);
  
  async function loadDashboardData() {
    try {
      setLoading(true);
      
      // Get events and shifts
      const [events, shiftsResponse] = await Promise.all([
        getEvents(),
        getShifts({ status: 'needs_workers,partially_staffed,fully_staffed' })
      ]);
      
      if (shiftsResponse.status === 'success') {
        const shifts = shiftsResponse.data.shifts;
        
        // Calculate stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayShifts = shifts.filter(s => {
          const shiftDate = new Date(s.start_time_utc);
          shiftDate.setHours(0, 0, 0, 0);
          return shiftDate.getTime() === today.getTime();
        });
        
        const weekEnd = new Date();
        weekEnd.setDate(weekEnd.getDate() + 7);
        
        const weekShifts = shifts.filter(s => {
          const shiftDate = new Date(s.start_time_utc);
          return shiftDate >= today && shiftDate <= weekEnd;
        });
        
        const gapsShifts = shifts.filter(s => {
          const assigned = s.assigned_count || 0;
          const required = s.capacity || 1;
          const percentage = Math.round((assigned / required) * 100);
          return percentage < 100 && new Date(s.start_time_utc) >= today;
        });
        
        setStats({
          activeEvents: events.filter(e => e.status !== 'completed').length,
          todayShifts: todayShifts.length,
          weekShifts: weekShifts.length,
          gapsToFill: gapsShifts.length
        });
        
        // Format shifts for calendar
        const formattedShifts = shifts.map(s => {
          let status: 'fully_staffed' | 'needs_workers' | 'partially_staffed' = 'fully_staffed';
          
          // Map shift status to calendar status based on staffing progress
          const assigned = s.assigned_count || 0;
          const required = s.capacity || 1;
          const percentage = Math.round((assigned / required) * 100);
          
          if (percentage === 0) {
            status = 'needs_workers';
          } else if (percentage < 100) {
            status = 'partially_staffed';
          } else {
            status = 'fully_staffed';
          }
          
          return {
            id: s.id,
            date: new Date(s.start_time_utc),
            status,
            count: 1
          };
        });
        
        // Group by date for calendar
        const groupedShifts = formattedShifts.reduce((acc, shift) => {
          const dateKey = shift.date.toDateString();
          if (!acc[dateKey]) {
            acc[dateKey] = { ...shift, count: 0 };
          }
          acc[dateKey].count++;
          // Set status to most urgent
          if (shift.status === 'needs_workers') acc[dateKey].status = 'needs_workers';
          else if (shift.status === 'partially_staffed' && acc[dateKey].status !== 'needs_workers') {
            acc[dateKey].status = 'partially_staffed';
          }
          return acc;
        }, {} as Record<string, CalendarShift>);
        
        setCalendarShifts(Object.values(groupedShifts));
        
        // Format urgent shifts
        const urgentShiftsFormatted = gapsShifts.slice(0, 5).map(shift => ({
          id: shift.id,
          event_title: shift.client_name || 'Untitled Event',
          role_needed: shift.role_needed,
          start_time_utc: shift.start_time_utc,
          staffing_progress: {
            assigned: shift.assigned_count || 0,
            required: shift.capacity,
            percentage: Math.round(((shift.assigned_count || 0) / shift.capacity) * 100)
          },
          status: shift.status
        }));
        
        setUrgentShifts(urgentShiftsFormatted);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }
  
  function handleDayClick(date: Date) {
    // Navigate to assignments page filtered by date
    const dateStr = date.toISOString().split('T')[0];
    navigate(`/assignments?date=${dateStr}`);
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }
  
  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Overview of your staffing and upcoming events</p>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          label="Active Events"
          value={stats.activeEvents}
          onClick={() => navigate('/events')}
        />
        <StatCard
          label="Today's Shifts"
          value={stats.todayShifts}
          onClick={() => navigate('/staffing?filter=today')}
        />
        <StatCard
          label="This Week"
          value={stats.weekShifts}
          onClick={() => navigate('/staffing?filter=week')}
        />
        <StatCard
          label="Gaps to Fill"
          value={stats.gapsToFill}
          onClick={() => navigate('/staffing?status=needs_workers')}
        />
      </div>
      
      {/* Calendar */}
      <div className="mb-8">
        <CalendarWidget
          shifts={calendarShifts}
          onDayClick={handleDayClick}
        />
      </div>
      
      {/* Urgent Shifts */}
      <UrgentShiftsList shifts={urgentShifts} />
    </div>
  );
}
