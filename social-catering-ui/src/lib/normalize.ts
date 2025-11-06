type AnyRecord = Record<string, any>

export function normalizeVenue(venue: AnyRecord | null | undefined) {
  return venue ?? { name: '', formatted_address: '' }
}

export function normalizeShift(shift: AnyRecord): AnyRecord {
  return {
    id: shift.id,
    start_time_utc: shift.start_time_utc || null,
    end_time_utc: shift.end_time_utc || null,
    status: shift.status || 'draft',
    pay_rate: typeof shift.pay_rate === 'number' ? shift.pay_rate : null,
    staffing_progress: shift.staffing_progress || { assigned: 0, required: 0, percentage: 0 },
    assignments: Array.isArray(shift.assignments) ? shift.assignments : [],
  }
}

export function normalizeEvent(event: AnyRecord): AnyRecord {
  const schedule = event.schedule || null
  const shiftsByRole = Array.isArray(event.shifts_by_role) ? event.shifts_by_role : []
  return {
    ...event,
    title: event.title || '',
    venue: normalizeVenue(event.venue),
    schedule: schedule ? {
      start_time_utc: schedule.start_time_utc || null,
      end_time_utc: schedule.end_time_utc || null,
      break_minutes: typeof schedule.break_minutes === 'number' ? schedule.break_minutes : 0,
    } : null,
    assigned_workers_count: event.assigned_workers_count || 0,
    total_workers_needed: event.total_workers_needed || 0,
    unfilled_roles_count: event.unfilled_roles_count || 0,
    staffing_percentage: event.staffing_percentage || 0,
    staffing_status: event.staffing_status || 'needs_workers',
    shifts_by_role: shiftsByRole.map((role: AnyRecord) => ({
      role_name: role.role_name || '',
      total_shifts: role.total_shifts || 0,
      filled_shifts: role.filled_shifts || 0,
      pay_rate: role.pay_rate ?? null,
      shifts: Array.isArray(role.shifts) ? role.shifts.map(normalizeShift) : [],
    })),
  }
}

export function normalizeEventsList(events: any): AnyRecord[] {
  if (!Array.isArray(events)) return []
  return events.map((e) => normalizeEvent(e || {}))
}

export function deepDefault<T extends AnyRecord>(obj: T, defaults: AnyRecord): T {
  if (obj == null || typeof obj !== 'object') return defaults as T
  const out: AnyRecord = Array.isArray(obj) ? [] : {}
  const keys = new Set([...Object.keys(defaults || {}), ...Object.keys(obj || {})])
  keys.forEach((k) => {
    const v: any = (obj as AnyRecord)[k]
    const d: any = (defaults as AnyRecord)[k]
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = deepDefault(v, d || {})
    } else if (Array.isArray(v)) {
      out[k] = v
    } else if (v === undefined || v === null) {
      out[k] = d
    } else {
      out[k] = v
    }
  })
  return out as T
}


