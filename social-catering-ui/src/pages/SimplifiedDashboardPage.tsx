import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SimpleStatCard } from '../components/dashboard/SimpleStatCard';
import { MonthCalendar } from '../components/dashboard/MonthCalendar';
import { UrgentShiftsList } from '../components/dashboard/UrgentShiftsList';
import { getEvents } from '../services/eventsApi';
import { getShifts } from '../services/shiftsApi';
import { isSameDay, startOfMonth, endOfMonth } from 'date-fns';

export function SimplifiedDashboardPage() {
  const navigate = useNavigate();
  
  const [stats, setStats] = useState({
    draftEvents: 0,
    publishedEvents: 0,
    completedEvents: 0,
    gapsToFill: 0
  });
  
  const [calendarData, setCalendarData] = useState([]);
  const [urgentShifts, setUrgentShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadData();
  }, []);
  
  async function loadData() {
    try {
      setLoading(true);
      
      const [events, shiftsRes] = await Promise.all([
        getEvents(),
        getShifts()
      ]);
      
      if (shiftsRes.status === 'success') {
        const shifts = shiftsRes.data.shifts;
        
        // Calculate stats
        setStats({
          draftEvents: events.filter(e => e.status === 'draft').length,
          publishedEvents: events.filter(e => e.status === 'published').length,
          completedEvents: events.filter(e => e.status === 'completed').length,
          gapsToFill: shifts.filter(s => s.status === 'needs_workers' && new Date(s.start_time_utc) >= new Date()).length
        });
        
        // Prepare calendar data
        const monthStart = startOfMonth(new Date());
        const monthEnd = endOfMonth(new Date());
        
        const daysMap = {};
        
        shifts.forEach(shift => {
          const shiftDate = new Date(shift.start_time_utc);
          if (shiftDate >= monthStart && shiftDate <= monthEnd) {
            const dateKey = shiftDate.toDateString();
            
            if (!daysMap[dateKey]) {
              daysMap[dateKey] = {
                date: shiftDate,
                status: 'fully_staffed',
                shiftsCount: 0,
                needsWorkers: 0
              };
            }
            
            daysMap[dateKey].shiftsCount++;
            
            // Determine worst status
            if (shift.status === 'needs_workers') {
              daysMap[dateKey].status = 'needs_workers';
              daysMap[dateKey].needsWorkers += (shift.staffing_progress?.required || 1) - (shift.staffing_progress?.assigned || 0);
            } else if (shift.status === 'partially_staffed' && daysMap[dateKey].status !== 'needs_workers') {
              daysMap[dateKey].status = 'partially_staffed';
              daysMap[dateKey].needsWorkers += (shift.staffing_progress?.required || 1) - (shift.staffing_progress?.assigned || 0);
            }
          }
        });
        
        setCalendarData(Object.values(daysMap));
        
        // Get urgent shifts (upcoming + needs workers)
        const urgent = shifts
          .filter(s => 
            s.status !== 'fully_staffed' && 
            new Date(s.start_time_utc) >= new Date()
          )
          .slice(0, 10); // Top 10
        
        setUrgentShifts(urgent);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }
  
  function handleDayClick(date: Date) {
    const dateStr = date.toISOString().split('T')[0];
    navigate(`/staffing?date=${dateStr}`);
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Overview of events and staffing needs</p>
          </div>
          
          <button
            onClick={() => navigate('/events/create')}
            className="px-4 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
          >
            Create New Event
          </button>
        </div>
        
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <SimpleStatCard
            label="Draft Events"
            value={stats.draftEvents}
            onClick={() => navigate('/events?status=draft')}
          />
          <SimpleStatCard
            label="Published Events"
            value={stats.publishedEvents}
            onClick={() => navigate('/events?status=published')}
          />
          <SimpleStatCard
            label="Completed Events"
            value={stats.completedEvents}
            onClick={() => navigate('/events?status=completed')}
          />
          <SimpleStatCard
            label="Gaps to Fill"
            value={stats.gapsToFill}
            isHero
            onClick={() => navigate('/staffing?status=needs_workers')}
          />
        </div>
        
        {/* Calendar */}
        <div className="mb-8">
          <MonthCalendar
            daysData={calendarData}
            onDayClick={handleDayClick}
          />
        </div>
        
        {/* Urgent List */}
        <UrgentShiftsList shifts={urgentShifts} />
      </div>
    </div>
  );
}
