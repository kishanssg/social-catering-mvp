import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
dayjs.extend(utc);
dayjs.extend(timezone);
import plusIcon from '../../assets/icons/plus.svg';
import crossIcon from '../../assets/icons/cross.svg';
import checkIcon from '../../assets/icons/check.svg';
import bartenderIcon from '../../assets/icons/Skills/Bartender.svg';
import banquetServerIcon from '../../assets/icons/Skills/Banquet Server.svg';
import captainIcon from '../../assets/icons/Skills/Captain.svg';
import eventHelperIcon from '../../assets/icons/Skills/Event Helper.svg';
import prepCookIcon from '../../assets/icons/Skills/Prep Cook.svg';
import formalUniformIcon from '../../assets/icons/Uniforms/formal_uniform.png';
import blackPoloIcon from '../../assets/icons/Uniforms/black_polo.png';
import theBistroIcon from '../../assets/icons/Uniforms/the_bistro.png';
import blackAndWhiteIcon from '../../assets/icons/Uniforms/black_and_white.png';
import chefsCoatIcon from '../../assets/icons/Uniforms/chef_coat.png';
import { VenueAutocomplete } from '../../components/ui/VenueAutocomplete';
import { createEvent, updateEvent, getEvent, type Event } from '../../services/eventsApi';
import { venuesApi } from '../../services/venuesApi';
import type { Venue } from '../../types/venues';
import { Toast } from '../../components/common/Toast';
import { apiClient } from '../../lib/api';

// Define types locally to avoid import issues
interface EventSkillRequirement {
  id?: number;
  skill_name: string;
  needed_workers: number;
  description?: string;
  uniform_name?: string;
  certification_name?: string;
  pay_rate?: number;
}

interface EventSchedule {
  start_time_utc: string;
  end_time_utc: string;
  break_minutes: number;
}

interface Step {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  active: boolean;
}

interface SkillDetail {
  name: string;
  icon: string;
  neededWorkers: number;
  uniform: string;
  description: string;
  certification: string;
  pay_rate?: number;
}

interface CreateEventWizardProps {
  editEvent?: Event;
  isEditing?: boolean;
}

export default function CreateEventWizard({ editEvent, isEditing = false }: CreateEventWizardProps) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  // Determine if we're in edit mode based on URL params
  const isEditMode = !!id;
  const [currentEvent, setCurrentEvent] = useState<Event | null>(editEvent || null);
  const [isLoadingEvent, setIsLoadingEvent] = useState(isEditMode && !editEvent);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isSkillsDropdownOpen, setIsSkillsDropdownOpen] = useState(false);
  const [selectedSkillDetails, setSelectedSkillDetails] = useState<SkillDetail[]>([]);
  const [openUniformDropdown, setOpenUniformDropdown] = useState<string | null>(null);
  const [openCertificationDropdown, setOpenCertificationDropdown] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState<string | null>(null);
  const [cachedPayRates, setCachedPayRates] = useState<{ [skillName: string]: number }>({});
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [toast, setToast] = useState<{ isVisible: boolean; message: string; type: 'success' | 'error' }>({ isVisible: false, message: '', type: 'error' });

  const showError = (message: string) => setToast({ isVisible: true, message, type: 'error' });
  const showSuccess = (message: string) => setToast({ isVisible: true, message, type: 'success' });
  
  // Fetch suggested pay rate for a skill
  const fetchSuggestedPayRate = async (skillName: string): Promise<number | null> => {
    try {
      const response = await fetch(`/api/v1/skills?name=${encodeURIComponent(skillName)}`);
      if (response.ok) {
        const skills = await response.json();
        const skill = skills.find((s: any) => s.name === skillName);
        return skill?.suggested_pay_rate || null;
      }
    } catch (error) {
      console.error('Failed to fetch suggested pay rate:', error);
    }
    return null;
  };
  
  // Schedule step state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState<string>('08:00');
  const [endTime, setEndTime] = useState<string>('17:00');
  const [breakMinutes, setBreakMinutes] = useState<number>(15);
  const [isStartTimeOpen, setIsStartTimeOpen] = useState(false);
  const [isEndTimeOpen, setIsEndTimeOpen] = useState(false);
  const [isBreakOpen, setIsBreakOpen] = useState(false);

  // Build 15-min increment time options with 12-hour labels
  const timeOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 15) {
        const hh = String(h).padStart(2, '0');
        const mm = String(m).padStart(2, '0');
        const hour12 = ((h + 11) % 12) + 1;
        const ampm = h < 12 ? 'AM' : 'PM';
        const label = `${String(hour12).padStart(2, '0')}:${mm} ${ampm}`;
        options.push({ value: `${hh}:${mm}`, label });
      }
    }
    return options;
  }, []);

  const getTimeLabel = (value: string) => {
    const found = timeOptions.find((t) => t.value === value);
    return found ? found.label : value;
  };
  
  // How to Check-in step state
  const defaultCheckInText = 'Upon arrival, please locate the on-site supervisor and have them scan your QR code to check you in. Make sure to arrive a few minutes early and be in proper uniform.';
  const [checkInText, setCheckInText] = useState(defaultCheckInText);
  const [checkInEdited, setCheckInEdited] = useState(false);
  const supervisorOptions = ['Noah Park', 'Madison Clark', 'Sara Brown'];
  const [selectedSupervisor, setSelectedSupervisor] = useState<string>('');
  const [isSupervisorOpen, setIsSupervisorOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  
  // Event creation state
  const [isCreating, setIsCreating] = useState(false);
  const [eventTitle, setEventTitle] = useState<string>('');

  // Fetch event data when in edit mode
  useEffect(() => {
    if (isEditMode && id && !currentEvent) {
      const fetchEventData = async () => {
        try {
          setIsLoadingEvent(true);
          const event = await getEvent(parseInt(id));
          setCurrentEvent(event);
        } catch (error) {
          console.error('Failed to fetch event:', error);
          navigate('/events');
        } finally {
          setIsLoadingEvent(false);
        }
      };
      fetchEventData();
    }
  }, [isEditMode, id, currentEvent, navigate]);

  // Initialize form with existing event data if editing
  useEffect(() => {
    const loadEventData = async () => {
      const eventToUse = currentEvent || editEvent;
      if (eventToUse && (isEditMode || isEditing)) {
        setEventTitle(eventToUse.title);
        
        // Set venue if exists
        if (eventToUse.venue_id || eventToUse.venue) {
          const venueId = eventToUse.venue_id || eventToUse.venue?.id;
          if (venueId) {
            // Fetch the actual venue details
            try {
              const venue = await venuesApi.getById(venueId);
              setSelectedVenue(venue);
            } catch (error) {
              console.error('Failed to load venue:', error);
              // Fallback to venue data from event if available
              if (eventToUse.venue) {
                setSelectedVenue(eventToUse.venue as Venue);
              } else {
                // Fallback to placeholder if venue fetch fails
                setSelectedVenue({
                  id: venueId,
                  name: 'Venue not found',
                  formatted_address: 'Address unavailable'
                } as Venue);
              }
            }
          }
        }
      
      // Set check-in details
      if (eventToUse.check_in_instructions) {
        setCheckInText(eventToUse.check_in_instructions);
        setCheckInEdited(true);
      }
      if (eventToUse.supervisor_name) {
        setSelectedSupervisor(eventToUse.supervisor_name);
      }
      if (eventToUse.supervisor_phone) {
        setPhoneNumber(eventToUse.supervisor_phone);
      }
      
      // Set schedule if exists
      if (eventToUse.schedule) {
        const startDate = new Date(eventToUse.schedule.start_time_utc);
        setSelectedDate(startDate);
        setStartTime(startDate.toTimeString().slice(0, 5));
        
        const endDate = new Date(eventToUse.schedule.end_time_utc);
        setEndTime(endDate.toTimeString().slice(0, 5));
        
        if (eventToUse.schedule.break_minutes) {
          setBreakMinutes(eventToUse.schedule.break_minutes);
        }
      }
      
      // Set skill requirements if exist
      if (eventToUse.skill_requirements && eventToUse.skill_requirements.length > 0) {
        const skills: SkillDetail[] = eventToUse.skill_requirements.map(req => ({
          name: req.skill_name,
          icon: getSkillIcon(req.skill_name),
          neededWorkers: req.needed_workers,
          uniform: req.uniform_name || '',
          description: req.description || '',
          certification: req.certification_name || '',
          pay_rate: req.pay_rate || undefined
        }));
        setSelectedSkillDetails(skills);
      }
      
      // Mark all steps as completed for editing
      setCompletedSteps([0, 1, 2, 3]);
      }
    };
    
    loadEventData();
  }, [currentEvent, editEvent, isEditMode, isEditing]);

  const getSkillIcon = (skillName: string): string => {
    const skillIconMap: { [key: string]: string } = {
      'Bartender': bartenderIcon,
      'Banquet Server': banquetServerIcon,
      'Captain': captainIcon,
      'Event Helper': eventHelperIcon,
      'Prep Cook': prepCookIcon,
    };
    return skillIconMap[skillName] || bartenderIcon; // Default to bartender icon
  };

  const validatePhone = (value: string) => {
    if (!value) { setPhoneError(''); return; }
    const re = /^\d{3}-\d{3}-\d{4}$/;
    setPhoneError(re.test(value) ? '' : 'Enter phone as 123-456-7890');
  };

  const availableSkills = [
    { name: 'Bartender', icon: bartenderIcon },
    { name: 'Banquet Server/Runner', icon: banquetServerIcon },
    { name: 'Captain', icon: captainIcon },
    { name: 'Event Helper', icon: eventHelperIcon },
    { name: 'Prep Cook', icon: prepCookIcon },
  ];

  const uniformOptions = [
    { name: 'Formal Uniform', icon: formalUniformIcon },
    { name: 'Black Polo', icon: blackPoloIcon },
    { name: 'The Bistro', icon: theBistroIcon },
    { name: 'Black & White', icon: blackAndWhiteIcon },
    { name: 'Chefs Coat', icon: chefsCoatIcon },
  ];

  const uniformDescriptions: { [key: string]: string } = {
    'Formal Uniform': 'Clean and pressed. White long-sleeve button up shirt, black vest, black bowtie, black slacks, black socks, black non-slip shoes.',
    'Black Polo': 'Black polo shirt tucked in, black slacks, black belt, black socks, black non-slip shoes. Hair neat and presentable.',
    'The Bistro': 'Black long-sleeve shirt with bistro apron, black slacks, black socks, black non-slip shoes. Apron clean and wrinkle-free.',
    'Black & White': 'White long-sleeve shirt with black tie, black slacks, black socks, black non-slip shoes. Shirt clean and ironed.',
    'Chefs Coat': 'Clean white chef coat, black or checkered chef pants, appropriate kitchen-safe footwear, hair restrained as required.',
  };

  const skillDescriptions: { [key: string]: string } = {
    'Bartender': 'Strong knowledge of drink mixing, cocktails, and wines is essential, along with the ability to multitask efficiently in a fast-paced environment. Bartenders are also expected to serve alcohol responsibly, with certifications such as TIPs or ServSafe often required.',
    'Banquet Server/Runner': 'Responsible for serving food and beverages at events with professionalism and efficiency. Must have excellent customer service skills, the ability to work in a team, and maintain composure during high-volume service.',
    'Captain': 'Oversees the service team during events, ensuring smooth operations and guest satisfaction. Requires leadership skills, attention to detail, and the ability to handle challenging situations with grace and professionalism.',
    'Event Helper': 'Provides general support during events including setup, breakdown, and assisting other team members. Should be physically capable, reliable, and willing to take on various tasks as needed to ensure event success.',
    'Prep Cook': 'Handles food preparation tasks including chopping, cooking, and assembling dishes according to recipes and specifications. Must maintain cleanliness, follow food safety guidelines, and work efficiently in a kitchen environment.',
  };

  const certificationOptions = [
    'TIPs Certification',
    'ServSafe Food Handler',
    'ServSafe Alcohol',
    'Food Safety Manager',
    'Allergen Awareness',
  ];

  const steps: Step[] = [
    {
      id: 1,
      title: 'Event Details',
      description: 'Enter event title and pick the skills needed.',
      completed: completedSteps.includes(0) || currentStepIndex > 0,
      active: currentStepIndex === 0,
    },
    {
      id: 2,
      title: 'Location',
      description: 'Add work site details and directions.',
      completed: completedSteps.includes(1) || currentStepIndex > 1,
      active: currentStepIndex === 1,
    },
    {
      id: 3,
      title: 'Schedule',
      description: 'Set shift time and break duration.',
      completed: completedSteps.includes(2) || currentStepIndex > 2,
      active: currentStepIndex === 2,
    },
    {
      id: 4,
      title: 'How to Check-in',
      description: 'Add check-in steps for your team to follow on arrival.',
      completed: completedSteps.includes(3) || currentStepIndex > 3,
      active: currentStepIndex === 3,
    },
    {
      id: 5,
      title: 'Event Summary',
      description: 'Take a moment to review all job details before posting.',
      completed: completedSteps.includes(4) || currentStepIndex > 4,
      active: currentStepIndex === 4,
    },
  ];

  const handleCancel = () => {
    navigate('/events');
  };

  const handleContinue = async () => {
    console.log('🔄 handleContinue called:', {
      currentStepIndex,
      stepsLength: steps.length,
      isLastStep: currentStepIndex === steps.length - 1,
      canContinue
    });

    // Mark current step as completed
    if (!completedSteps.includes(currentStepIndex)) {
      setCompletedSteps([...completedSteps, currentStepIndex]);
    }

    // If this is the last step (Event Summary), create the event
    if (currentStepIndex === steps.length - 1) {
      console.log('🎯 Last step - calling handleCreateEvent');
      await handleCreateEvent();
      return;
    }

    // Move to next step
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleCreateEvent = async () => {
    if (isCreating) return;
    
    // Validate required fields
    if (!selectedVenue) {
      showError('Please select a venue before creating the event.');
      return;
    }
    
    if (!eventTitle || eventTitle.trim() === '') {
      showError('Please enter an event title.');
      return;
    }
    
    if (selectedSkillDetails.length === 0) {
      showError('Please add at least one skill requirement.');
      return;
    }
    
    console.log('🚀 Creating event with data:', {
      eventTitle,
      selectedVenue,
      selectedDate,
      startTime,
      endTime,
      selectedSkillDetails,
      isEditMode,
      isEditing
    });
    
    setIsCreating(true);
    try {
      // Convert selected skills to API format
      const skillRequirements: EventSkillRequirement[] = selectedSkillDetails.map(skill => ({
        skill_name: skill.name,
        needed_workers: skill.neededWorkers,
        description: skill.description,
        uniform_name: skill.uniform,
        certification_name: skill.certification || undefined,
        pay_rate: skill.pay_rate || undefined
      }));

      // Build schedule - convert local time to UTC properly
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const eventDateISO = selectedDate.toISOString().split('T')[0];
      
      // Convert local time strings to UTC ISO strings
      const toUtcIso = (dateISO: string, timeHHmm: string): string => {
        const dt = dayjs.tz(`${dateISO} ${timeHHmm}`, 'YYYY-MM-DD HH:mm', userTimezone);
        const utc = dt.utc();
        return utc.toISOString();
      };
      
      const startUtcIso = toUtcIso(eventDateISO, startTime);
      let endUtcIso = toUtcIso(eventDateISO, endTime);
      
      // Handle overnight events (end < start means it wraps to next day)
      if (dayjs.utc(endUtcIso).valueOf() <= dayjs.utc(startUtcIso).valueOf()) {
        // Add 24 hours to end time
        endUtcIso = dayjs.utc(endUtcIso).add(1, 'day').toISOString();
      }
      
      // Temporary debug logging
      console.table({
        userTimezone,
        dateISO: eventDateISO,
        startLocal: startTime,
        endLocal: endTime,
        startUtcIso,
        endUtcIso,
      });

      // Create schedule data
      const schedule: EventSchedule = {
        start_time_utc: startUtcIso,
        end_time_utc: endUtcIso,
        break_minutes: breakMinutes
      };

      // Create event data
      const eventData = {
        title: eventTitle || 'New Event',
        status: (isEditMode || isEditing) ? (currentEvent?.status || 'draft') : 'published' as const, // Preserve existing status when editing
          venue_id: selectedVenue?.id,
          check_in_instructions: checkInText,
          supervisor_name: selectedSupervisor,
          supervisor_phone: phoneNumber,
          skill_requirements: skillRequirements,
          schedule: schedule,
          auto_publish: !isEditMode // Auto-publish new events, not edits
      };

      let response;
      if ((isEditMode || isEditing) && currentEvent) {
        // Update existing event
        response = await updateEvent(currentEvent.id!, eventData);
        console.log('Event updated successfully:', response);
      } else {
        // Create new event
        response = await createEvent(eventData);
        console.log('Event created and published successfully:', response);
      }
      
      // If created and published, navigate to Active tab and auto-expand
      if (!isEditMode && eventData.status === 'published' && response?.id) {
        navigate(`/events?tab=active&event_id=${response.id}`);
      } else {
        // Fallback: navigate to events list
        navigate('/events');
      }
    } catch (error: any) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} event:`, error);
      const errorMessage = error?.message || 'Failed to create event. Please try again.';
      showError(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveDraft = async () => {
    if (isSavingDraft) return;
    
    // Validate required fields for draft
    if (!eventTitle || eventTitle.trim() === '') {
      showError('Please enter an event title.');
      return;
    }
    
    if (selectedSkillDetails.length === 0) {
      showError('Please add at least one skill requirement.');
      return;
    }
    
    // Build schedule - convert local time to UTC properly (same as handleCreateEvent)
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const eventDateISO = selectedDate.toISOString().split('T')[0];
    
    // Convert local time strings to UTC ISO strings
    const toUtcIso = (dateISO: string, timeHHmm: string): string => {
      const dt = dayjs.tz(`${dateISO} ${timeHHmm}`, 'YYYY-MM-DD HH:mm', userTimezone);
      const utc = dt.utc();
      return utc.toISOString();
    };
    
    const startUtcIso = toUtcIso(eventDateISO, startTime);
    let endUtcIso = toUtcIso(eventDateISO, endTime);
    
    // Handle overnight events (end < start means it wraps to next day)
    if (dayjs.utc(endUtcIso).valueOf() <= dayjs.utc(startUtcIso).valueOf()) {
      // Add 24 hours to end time
      endUtcIso = dayjs.utc(endUtcIso).add(1, 'day').toISOString();
    }

    setIsSavingDraft(true);
    try {
      const skillRequirements: EventSkillRequirement[] = selectedSkillDetails.map(skill => ({
        skill_name: skill.name,
        needed_workers: skill.neededWorkers,
        description: skill.description,
        uniform_name: skill.uniform,
        certification_name: skill.certification || undefined,
        pay_rate: skill.pay_rate || undefined
      }));

      const schedule: EventSchedule = {
        start_time_utc: startUtcIso,
        end_time_utc: endUtcIso,
        break_minutes: breakMinutes
      };

      const eventData = {
        title: eventTitle || 'New Event',
        status: 'draft' as const,
        venue_id: selectedVenue?.id,
        check_in_instructions: checkInText,
        supervisor_name: selectedSupervisor,
        supervisor_phone: phoneNumber,
        skill_requirements: skillRequirements,
        schedule: schedule,
        auto_publish: false
      };

      let response;
      if ((isEditMode || isEditing) && currentEvent) {
        response = await updateEvent(currentEvent.id!, eventData);
        console.log('Draft event updated successfully:', response);
      } else {
        response = await createEvent(eventData);
        console.log('Draft event created successfully:', response);
      }

      // Show success message
      showSuccess('Event saved as draft successfully!');
      
      // Navigate to draft events
      navigate('/events?tab=draft');
    } catch (error: any) {
      console.error('Error saving draft event:', error);
      const errorMessage = error?.message || 'Failed to save draft. Please try again.';
      showError(errorMessage);
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Individual skill management functions
  const addSkillToEvent = async (eventId: number, skill: SkillDetail) => {
    try {
      const skillData = {
        skill_name: skill.name,
        needed_workers: skill.neededWorkers,
        description: skill.description,
        uniform_name: skill.uniform,
        certification_name: skill.certification || undefined
      };

      // Note: This function may need to be updated based on the events API structure
      // For now, we'll comment it out as it's not used in the current flow
      console.log('Skill added to event:', skillData);
      return skillData;
    } catch (error) {
      console.error('Error adding skill to job:', error);
      throw error;
    }
  };

  const updateSkillInEvent = async (eventId: number, skillId: number, skill: Partial<SkillDetail>) => {
    try {
      const skillData = {
        skill_name: skill.name,
        needed_workers: skill.neededWorkers,
        description: skill.description,
        uniform_name: skill.uniform,
        certification_name: skill.certification
      };

      // Note: This function may need to be updated based on the events API structure
      // For now, we'll comment it out as it's not used in the current flow
      console.log('Skill updated in event:', skillData);
      return skillData;
    } catch (error) {
      console.error('Error updating skill in job:', error);
      throw error;
    }
  };

  const removeSkillFromEvent = async (eventId: number, skillId: number) => {
    try {
      // Note: This function may need to be updated based on the events API structure
      // For now, we'll comment it out as it's not used in the current flow
      console.log('Skill removed from event');
    } catch (error) {
      console.error('Error removing skill from job:', error);
      throw error;
    }
  };

  const toggleSkillsDropdown = () => {
    setIsSkillsDropdownOpen(!isSkillsDropdownOpen);
  };

  const handleSkillClick = async (skillName: string) => {
    const skillIcon = availableSkills.find(s => s.name === skillName)?.icon || '';
    const isAlreadySelected = selectedSkillDetails.some(s => s.name === skillName);
    
    if (!isAlreadySelected) {
      // Fetch suggested pay rate for this skill
      const suggestedPayRate = await fetchSuggestedPayRate(skillName);
      
      const newSkill: SkillDetail = {
        name: skillName,
        icon: skillIcon,
        neededWorkers: 1,
        uniform: '',
        description: skillDescriptions[skillName] || '',
        certification: '',
        pay_rate: suggestedPayRate || undefined,
      };
      setSelectedSkillDetails([...selectedSkillDetails, newSkill]);
      
      // Cache the pay rate for future use
      if (suggestedPayRate) {
        setCachedPayRates(prev => ({ ...prev, [skillName]: suggestedPayRate }));
      }
    }
    
    // Close dropdown after selection
    setIsSkillsDropdownOpen(false);
  };

  const handleRemoveSkill = (skillName: string) => {
    setSelectedSkillDetails(selectedSkillDetails.filter(s => s.name !== skillName));
  };

  const handleUpdateNeededWorkers = (skillName: string, delta: number) => {
    setSelectedSkillDetails(selectedSkillDetails.map(skill => {
      if (skill.name === skillName) {
        const newCount = Math.max(1, skill.neededWorkers + delta);
        return { ...skill, neededWorkers: newCount };
      }
      return skill;
    }));
  };

  const handleUpdateUniform = (skillName: string, uniformName: string) => {
    setSelectedSkillDetails(selectedSkillDetails.map(skill => {
      if (skill.name === skillName) {
        return { ...skill, uniform: uniformName };
      }
      return skill;
    }));
    setOpenUniformDropdown(null);
  };

  const handleUpdateCertification = (skillName: string, certificationName: string) => {
    setSelectedSkillDetails(selectedSkillDetails.map(skill => {
      if (skill.name === skillName) {
        return { ...skill, certification: certificationName };
      }
      return skill;
    }));
    setOpenCertificationDropdown(null);
  };

  const handleClearCertification = (skillName: string) => {
    setSelectedSkillDetails(selectedSkillDetails.map(skill => {
      if (skill.name === skillName) {
        return { ...skill, certification: '' };
      }
      return skill;
    }));
  };

  const handleClearUniform = (skillName: string) => {
    setSelectedSkillDetails(selectedSkillDetails.map(skill => {
      if (skill.name === skillName) {
        return { ...skill, uniform: '' };
      }
      return skill;
    }));
  };

  const handleUpdateDescription = (skillName: string, newDescription: string) => {
    setSelectedSkillDetails(selectedSkillDetails.map(skill => {
      if (skill.name === skillName) {
        return { ...skill, description: newDescription };
      }
      return skill;
    }));
  };

  const handleUpdatePayRate = (skillName: string, payRate: number | null) => {
    setSelectedSkillDetails(selectedSkillDetails.map(skill => {
      if (skill.name === skillName) {
        return { ...skill, pay_rate: payRate };
      }
      return skill;
    }));
  };

  const handleVenueSelect = (venue: Venue) => {
    setSelectedVenue(venue);
  };

  const handleVenueInstructionsUpdate = (venueId: number, instructions: { arrival_instructions?: string; parking_info?: string }) => {
    if (selectedVenue && selectedVenue.id === venueId) {
      setSelectedVenue({
        ...selectedVenue,
        ...instructions,
      });
    }
  };

  const canContinue = currentStepIndex === 0 
    ? eventTitle.trim() !== '' && selectedSkillDetails.some(skill => skill.neededWorkers > 0) && selectedSkillDetails.every(skill => skill.pay_rate && skill.pay_rate > 0)
    : currentStepIndex === 1
    ? selectedVenue !== null
    : currentStepIndex === 2
    ? selectedDate && startTime && endTime
    : currentStepIndex === 3
    ? true // Check-in details are optional
    : currentStepIndex === 4
    ? eventTitle.trim() !== '' && selectedSkillDetails.some(skill => skill.neededWorkers > 0) && selectedSkillDetails.every(skill => skill.pay_rate && skill.pay_rate > 0) && selectedVenue !== null && selectedDate && startTime && endTime
    : true;

  return (
    <>
      {/* Loading state for edit mode */}
      {isLoadingEvent && (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading event details...</p>
          </div>
        </div>
      )}
      
      {!isLoadingEvent && (
        <>
        {/* Breadcrumbs */}
        <div className="flex items-center px-8 py-5">
          <div className="flex items-center gap-4">
          <span className="text-sm font-normal font-manrope leading-[140%] text-font-primary">Events</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M6.21967 4.21967C6.51256 3.92678 6.98744 3.92678 7.28033 4.21967L10.5303 7.46967C10.8232 7.76256 10.8232 8.23744 10.5303 8.53033L7.28033 11.7803C6.98744 12.0732 6.51256 12.0732 6.21967 11.7803C5.92678 11.4874 5.92678 11.0126 6.21967 10.7197L8.93934 8L6.21967 5.28033C5.92678 4.98744 5.92678 4.51256 6.21967 4.21967Z" fill="#292826"/>
            </svg>
<span className="text-sm font-normal font-manrope leading-[140%] text-font-primary">
            {isEditing ? 'Edit Event' : 'Create New Event'}
            </span>
          </div>
        </div>

      {/* Body */}
        <div className="flex flex-1 justify-center gap-12 px-8 min-h-0" style={{ paddingTop: '80px', paddingBottom: '40px' }}>
        {/* Progress rail */}
          <div className="w-[280px] flex-shrink-0 self-start">
            {steps.map((step, index) => (
              <div key={step.id} className="flex gap-4" style={{ minHeight: index < steps.length - 1 ? '100px' : 'auto' }}>
                <div className="flex flex-col items-center">
                <div
                  className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: step.completed ? '#FFFFFF' : step.active ? '#3A869D' : 'transparent',
                    border: step.completed || step.active ? '2px solid #3A869D' : '0.8px solid #292826',
                    boxShadow: (step.active || step.completed) ? '0 2px 8px 0 rgba(0,0,0,0.04)' : 'none',
                  }}
                >
                    {step.completed ? (
                      <img src={checkIcon} width="18" height="18" alt="Completed" className="flex-shrink-0" />
                    ) : step.active ? (
                    <div className="rounded-full bg-white" style={{ width: '12px', height: '12px' }} />
                    ) : null}
                  </div>
                {index < steps.length - 1 && <div className="flex-1" style={{ width: '2px', backgroundColor: 'rgba(58,134,157,0.5)' }} />}
                </div>

                <div className="flex flex-col gap-1 pt-1">
                <span className="text-sm font-bold font-manrope leading-[140%] text-font-primary">{step.title}</span>
                <span className="text-sm font-normal font-manrope leading-[140%] text-font-secondary">{step.description}</span>
                </div>
              </div>
            ))}
          </div>

        {/* Card */}
        <div className="flex flex-col p-8 rounded-lg border border-primary-color/10 bg-white self-start overflow-visible"
             style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.04)', maxWidth: '850px', width: '100%', minHeight: '600px' }}>
            {/* Form Content */}
            <div className="flex flex-col gap-6 flex-1 overflow-visible pr-2"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#3A869D20 transparent'
              }}
            >
              {/* Step 0: Skills Selection */}
              {currentStepIndex === 0 && (
                <>
              {/* Event Title Field */}
              <div className="flex flex-col gap-3 self-stretch">
                <label className="text-sm font-semibold font-manrope leading-[140%] text-font-primary">
                  Event Title
                </label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="Enter event title (e.g., Corporate Holiday Party)"
                  className="w-full h-11 px-4 border border-primary-color/10 rounded-lg text-sm bg-white focus:outline-none focus:border-primary-color text-font-primary placeholder:text-font-secondary"
                />
              </div>

              {/* Skills Field */}
              <div className="flex flex-col gap-3 self-stretch relative">
                <label className="text-sm font-semibold font-manrope leading-[140%] text-font-primary">
                  Skills
                </label>
                <div 
                  className="flex items-center justify-between h-11 px-4 rounded-lg border border-primary-color/10 bg-white cursor-pointer hover:border-primary-color/30 transition-colors"
                  onClick={toggleSkillsDropdown}
                >
                  <span className="text-sm font-normal font-manrope leading-[140%] text-primary-color">
                    {selectedSkillDetails.length > 0 ? selectedSkillDetails.map(s => s.name).join(', ') : 'Pick the Skills Needed'}
                  </span>
                  <img 
                    src={isSkillsDropdownOpen ? crossIcon : plusIcon} 
                    width="20" 
                    height="20" 
                    alt={isSkillsDropdownOpen ? "Close" : "Open"}
                    className="flex-shrink-0"
                    style={{ imageRendering: 'crisp-edges' }}
                  />
                </div>

                {/* Skills Dropdown */}
                {isSkillsDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-primary-color/10 rounded-lg shadow-lg z-50 max-h-[200px] overflow-y-auto">
                    {availableSkills
                      .filter(skill => !selectedSkillDetails.some(s => s.name === skill.name))
                      .map((skill) => (
                        <div
                          key={skill.name}
                          className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50"
                          onClick={() => handleSkillClick(skill.name)}
                        >
                          <img 
                            src={skill.icon} 
                            width="20" 
                            height="20" 
                            alt={skill.name}
                            className="flex-shrink-0"
                            style={{ imageRendering: 'crisp-edges' }}
                          />
                          <span className="text-sm font-normal font-manrope leading-[140%] text-font-primary">
                            {skill.name}
                          </span>
                        </div>
                      ))}
                    {selectedSkillDetails.length === availableSkills.length && (
                      <div className="px-3 py-2.5 text-sm text-gray-500 text-center">
                        All skills selected
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Selected Skills Detail Cards */}
              <div className="flex flex-col gap-6">
              {selectedSkillDetails.map((skill) => (
                <div
                  key={skill.name}
                  className="flex flex-col gap-6 p-6 rounded-lg border-2 border-primary-color bg-white overflow-visible"
                  style={{ boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.04)' }}
                >
                  {/* Skill Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img 
                        src={skill.icon} 
                        width="24" 
                        height="24" 
                        alt={skill.name}
                        className="flex-shrink-0"
                      />
                      <span className="text-base font-bold font-manrope leading-[140%] text-font-primary">
                        {skill.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Needed Workers Counter */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-normal font-manrope leading-[140%] text-font-secondary">
                          Needed Workers
                        </span>
                        <button
                          onClick={() => handleUpdateNeededWorkers(skill.name, -1)}
                          className="flex items-center justify-center w-6 h-6 rounded border border-primary-color/20 hover:bg-gray-50"
                          disabled={skill.neededWorkers <= 1}
                        >
                          <span className="text-lg">−</span>
                        </button>
                        <span className="text-sm font-semibold font-manrope leading-[140%] text-font-primary w-8 text-center">
                          {skill.neededWorkers}
                        </span>
                        <button
                          onClick={() => handleUpdateNeededWorkers(skill.name, 1)}
                          className="flex items-center justify-center w-6 h-6 rounded border border-primary-color/20 hover:bg-gray-50"
                        >
                          <span className="text-lg">+</span>
                        </button>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => handleRemoveSkill(skill.name)}
                        className="flex items-center justify-center w-6 h-6 text-red-500 hover:bg-red-50 rounded"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>

                {/* Event Description */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold font-manrope leading-[140%] text-font-primary">
                      Event description
                      </span>
                      <button 
                        className="text-sm font-normal font-manrope leading-[140%] text-primary-color hover:underline"
                        onClick={() => setEditingDescription(editingDescription === skill.name ? null : skill.name)}
                      >
                        {editingDescription === skill.name ? 'Save' : 'Edit'}
                      </button>
                    </div>
                    {editingDescription === skill.name ? (
                      <textarea
                        value={skill.description}
                        onChange={(e) => handleUpdateDescription(skill.name, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm font-normal font-manrope leading-[140%] text-font-secondary resize-none"
                        rows={3}
                        placeholder="Enter event description..."
                        autoFocus
                      />
                    ) : (
                      <p className="text-sm font-normal font-manrope leading-[140%] text-font-secondary">
                        {skill.description}
                      </p>
                    )}
                  </div>

                  {/* Pay Rate Input */}
                  <div className="flex flex-col gap-3">
                    <label className="text-sm font-semibold font-manrope leading-[140%] text-font-primary">
                      Pay Rate ($/hour) *
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="e.g., 18.00"
                        value={skill.pay_rate || ''}
                        onChange={(e) => handleUpdatePayRate(skill.name, parseFloat(e.target.value) || null)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        required
                      />
                      <span className="text-sm text-gray-600">/hour</span>
                    </div>
                    {/* Show cached suggestion if available */}
                    {cachedPayRates[skill.name] && !skill.pay_rate && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>Last used: ${cachedPayRates[skill.name]}/hr</span>
                        <button 
                          onClick={() => handleUpdatePayRate(skill.name, cachedPayRates[skill.name])}
                          className="text-teal-600 hover:text-teal-700 underline"
                        >
                          Use this
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Uniform Selector */}
                  <div className="flex flex-col gap-3 relative">
                    <label className="text-sm font-semibold font-manrope leading-[140%] text-font-primary">
                      Uniform
                    </label>
                    <div
                      className="flex items-center justify-between h-11 px-4 rounded-lg border border-primary-color/10 bg-white cursor-pointer hover:border-primary-color/30 transition-colors"
                      onClick={() => setOpenUniformDropdown(openUniformDropdown === skill.name ? null : skill.name)}
                    >
                      <span className="text-sm font-normal font-manrope leading-[140%] text-primary-color">
                        {skill.uniform || 'Select Uniform'}
                      </span>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 6L8 10L12 6" stroke="#292826" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>

                    {/* Uniform Dropdown */}
                    {openUniformDropdown === skill.name && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-primary-color/10 rounded-lg shadow-lg z-[999] max-h-[260px] overflow-y-auto">
                        {uniformOptions.map((uniform) => (
                          <div
                            key={uniform.name}
                            className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50"
                            onClick={() => handleUpdateUniform(skill.name, uniform.name)}
                          >
                            <div className="w-11 h-11 rounded-md overflow-hidden flex-shrink-0" style={{boxShadow:'0 1px 2px rgba(0,0,0,0.06)'}}>
                              <img
                                src={uniform.icon}
                                alt={uniform.name}
                                className="w-full h-full object-cover"
                                style={{objectPosition: '50% 90%'}}
                              />
                            </div>
                            <span className="text-sm font-normal font-manrope leading-[140%] text-font-primary">
                              {uniform.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Selected Uniform Summary */}
                    {skill.uniform && (
                      <div className="flex items-start justify-between gap-4 pt-4">
                        <div className="flex items-start gap-3">
                          <div className="w-11 h-11 rounded-md overflow-hidden flex-shrink-0" style={{boxShadow:'0 1px 2px rgba(0,0,0,0.06)'}}>
                            <img
                              src={(uniformOptions.find(u => u.name === skill.uniform) || uniformOptions[0]).icon}
                              alt={skill.uniform}
                              className="w-full h-full object-cover"
                              style={{ objectPosition: '50% 90%' }}
                            />
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold font-manrope leading-[140%] text-font-primary">{skill.uniform}</span>
                            </div>
                            <p className="text-sm font-normal font-manrope leading-[160%] text-font-secondary mt-1">
                              {uniformDescriptions[skill.uniform]}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <button
                            className="text-sm font-normal font-manrope leading-[140%] text-primary-color hover:underline"
                            onClick={() => setOpenUniformDropdown(skill.name)}
                          >
                            Edit
                          </button>
                          <button
                            className="text-sm font-normal font-manrope leading-[140%] text-red-500 hover:underline"
                            onClick={() => handleClearUniform(skill.name)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Certification Selector (Optional) */}
                  <div className="flex flex-col gap-3 relative">
                    <label className="text-sm font-semibold font-manrope leading-[140%] text-font-primary">
                      Certification <span className="text-xs font-normal text-font-secondary">(Optional)</span>
                    </label>
                    <div
                      className="flex items-center justify-between h-11 px-4 rounded-lg border border-primary-color/10 bg-white cursor-pointer hover:border-primary-color/30 transition-colors"
                      onClick={() => setOpenCertificationDropdown(openCertificationDropdown === skill.name ? null : skill.name)}
                    >
                      <span className={`text-sm font-normal font-manrope leading-[140%] ${skill.certification ? 'text-primary-color' : 'text-font-secondary'}`}>
                        {skill.certification || 'No certification required'}
                      </span>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 6L8 10L12 6" stroke="#292826" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>

                    {/* Certification Dropdown */}
                    {openCertificationDropdown === skill.name && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-primary-color/10 rounded-lg shadow-lg z-[999] max-h-[200px] overflow-y-auto">
                        {certificationOptions.map((cert) => (
                          <div
                            key={cert}
                            className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 border-b border-primary-color/5 last:border-b-0"
                            onClick={() => handleUpdateCertification(skill.name, cert)}
                          >
                            <span className="text-sm font-normal font-manrope leading-[140%] text-font-primary">
                              {cert}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Selected Certification Display */}
                    {skill.certification && (
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-sm font-normal font-manrope leading-[140%] text-font-secondary">
                          Required: <span className="text-font-primary font-semibold">{skill.certification}</span>
                        </span>
                        <button
                          className="text-sm font-normal font-manrope leading-[140%] text-red-500 hover:underline"
                          onClick={() => handleClearCertification(skill.name)}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              </div>
                </>
              )}

              {/* Step 1: Location/Venue Selection */}
              {currentStepIndex === 1 && (
                <div className="flex flex-col gap-6">
                  <div>
                    <h2 className="text-xl font-bold font-manrope leading-[140%] text-font-primary mb-2">
                      Select Venue Location
                    </h2>
                    <p className="text-sm font-normal font-manrope leading-[140%] text-font-secondary">
                      Search for a venue or select from recently used locations. You can add arrival instructions and parking details.
                    </p>
                  </div>
                  
                  <VenueAutocomplete
                    selectedVenue={selectedVenue}
                    onVenueSelect={handleVenueSelect}
                    onInstructionsUpdate={handleVenueInstructionsUpdate}
                  />
                </div>
              )}

              {/* Step 2: Schedule */}
              {currentStepIndex === 2 && (
                <div className="flex flex-col gap-4">
                  <h2 className="text-xl font-bold font-manrope leading-[140%] text-font-primary">Schedule</h2>
                  
                  {/* Calendar and Time Selection */}
                  <div className="rounded-lg border border-primary-color/20 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06)] p-6">
                    {/* Calendar Header */}
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={() => {
                          const newDate = new Date(selectedDate);
                          newDate.setMonth(newDate.getMonth() - 1);
                          setSelectedDate(newDate);
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5 text-font-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      
                      <h3 className="text-lg font-semibold text-font-primary">
                        {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </h3>
                      
                      <button
                        onClick={() => {
                          const newDate = new Date(selectedDate);
                          newDate.setMonth(newDate.getMonth() + 1);
                          setSelectedDate(newDate);
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5 text-font-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>

                    {/* Calendar Grid */}
                    <div className="mb-6">
                      {/* Days of week */}
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                          <div key={index} className="text-center text-sm font-medium text-font-secondary py-2">
                            {day}
                          </div>
                        ))}
                      </div>
                      
                      {/* Calendar dates */}
                      <div className="grid grid-cols-7 gap-1">
                        {(() => {
                          const year = selectedDate.getFullYear();
                          const month = selectedDate.getMonth();
                          const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
                          const daysInMonth = new Date(year, month + 1, 0).getDate();
                          const today = new Date();
                          
                          const cells = [];
                          
                          // Add empty cells for days before the 1st
                          for (let i = 0; i < firstDay; i++) {
                            cells.push(<div key={`empty-${i}`} className="w-10 h-10" />);
                          }
                          
                          // Add all days of the month
                          for (let date = 1; date <= daysInMonth; date++) {
                            const isSelected = date === selectedDate.getDate() && 
                                             month === selectedDate.getMonth() &&
                                             year === selectedDate.getFullYear();
                            const currentDate = new Date(year, month, date);
                            const isToday = currentDate.toDateString() === today.toDateString();
                            
                            cells.push(
                              <button
                                key={date}
                                onClick={() => {
                                  const newDate = new Date(year, month, date);
                                  setSelectedDate(newDate);
                                }}
                                style={isSelected ? { backgroundColor: '#3A869D', color: 'white' } : {}}
                                className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${
                                  isSelected
                                    ? ''
                                    : isToday
                                    ? 'bg-gray-100 text-font-primary'
                                    : 'hover:bg-gray-50 text-font-primary'
                                }`}
                              >
                                {date}
                              </button>
                            );
                          }
                          
                          return cells;
                        })()}
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="w-full border-t border-dashed border-primary-color/20 mb-4" />

                    {/* Time Selection */}
                    <div className="space-y-4">
                      {/* Start Time */}
                      <div>
                        <label className="block text-sm font-medium text-font-primary mb-2">Start time</label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => { setIsStartTimeOpen(!isStartTimeOpen); setIsEndTimeOpen(false); setIsBreakOpen(false); }}
                            className="w-full flex items-center justify-between px-3 py-2 border border-primary-color/20 rounded-lg text-left font-manrope text-sm bg-white focus:outline-none focus:border-primary-color"
                          >
                            <span>{getTimeLabel(startTime)}</span>
                            <svg className="w-5 h-5 text-font-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                          {isStartTimeOpen && (
                            <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-primary-color/20 bg-white shadow-lg">
                              {timeOptions.map((t) => (
                                <button
                                  key={t.value}
                                  onClick={() => { setStartTime(t.value); setIsStartTimeOpen(false); }}
                                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${startTime === t.value ? 'bg-gray-100 text-font-primary' : 'text-font-primary'}`}
                                >
                                  {t.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="w-full border-t border-dashed border-primary-color/20" />

                      {/* End Time */}
                      <div>
                        <label className="block text-sm font-medium text-font-primary mb-2">End time</label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => { setIsEndTimeOpen(!isEndTimeOpen); setIsStartTimeOpen(false); setIsBreakOpen(false); }}
                            className="w-full flex items-center justify-between px-3 py-2 border border-primary-color/20 rounded-lg text-left font-manrope text-sm bg-white focus:outline-none focus:border-primary-color"
                          >
                            <span>{getTimeLabel(endTime)}</span>
                            <svg className="w-5 h-5 text-font-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                          {isEndTimeOpen && (
                            <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-primary-color/20 bg-white shadow-lg">
                              {timeOptions.map((t) => (
                                <button
                                  key={t.value}
                                  onClick={() => { setEndTime(t.value); setIsEndTimeOpen(false); }}
                                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${endTime === t.value ? 'bg-gray-100 text-font-primary' : 'text-font-primary'}`}
                                >
                                  {t.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="w-full border-t border-dashed border-primary-color/20" />

                      {/* Unpaid Breaktime */}
                      <div>
                        <label className="block text-sm font-medium text-font-primary mb-2">Unpaid breaktime</label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => { setIsBreakOpen(!isBreakOpen); setIsStartTimeOpen(false); setIsEndTimeOpen(false); }}
                            className="w-full flex items-center justify-between px-3 py-2 border border-primary-color/20 rounded-lg text-left font-manrope text-sm bg-white focus:outline-none focus:border-primary-color"
                          >
                            <span>
                              {breakMinutes === 0 ? 'No break' : breakMinutes === 60 ? '60 minutes' : `${breakMinutes} minutes`}
                            </span>
                            <svg className="w-5 h-5 text-font-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          {isBreakOpen && (
                            <div className="absolute z-50 mt-1 w-full rounded-lg border border-primary-color/20 bg-white shadow-lg">
                              {[0,15,30,45,60,90,120].map((m) => (
                                <button
                                  key={m}
                                  onClick={() => { setBreakMinutes(m); setIsBreakOpen(false); }}
                                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${breakMinutes === m ? 'bg-gray-100 text-font-primary' : 'text-font-primary'}`}
                                >
                                  {m === 0 ? 'No break' : m === 60 ? '60 minutes' : `${m} minutes`}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: How to Check-in */}
              {currentStepIndex === 3 && (
                <div className="flex flex-col gap-4">
                  <h2 className="text-xl font-bold font-manrope leading-[140%] text-font-primary">How to Check-in</h2>
                  <div className="rounded-lg p-5 border border-primary-color/30 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
                    {/* Instructions box */}
                    <textarea
                      value={checkInText}
                      onChange={(e) => { setCheckInText(e.target.value); setCheckInEdited(true); }}
                      className={`w-full px-3 py-2 border border-primary-color/20 rounded-lg font-manrope text-sm focus:outline-none focus:border-primary-color resize-none bg-white ${checkInEdited ? 'text-font-primary' : 'text-font-secondary'}`}
                      rows={3}
                    />

                    {/* Divider */}
                    <div className="w-full border-t border-dashed border-primary-color/20 my-4" />

                    {/* Shift Supervisor */}
                    <label className="block text-xs font-semibold text-font-secondary uppercase mb-2 tracking-wide">Shift Supervisor</label>
                    <div className="relative mb-4">
                      <button
                        type="button"
                        onClick={() => setIsSupervisorOpen(!isSupervisorOpen)}
                        className="w-full h-10 px-3 pr-9 border border-primary-color/20 rounded-lg text-left text-sm text-font-primary bg-white hover:border-primary-color/40 focus:outline-none focus:border-primary-color"
                      >
                        {selectedSupervisor || 'Select Shift Supervisor'}
                      </button>
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-font-secondary">▾</span>
                      {isSupervisorOpen && (
                        <div className="absolute z-[999] mt-1 w-full bg-white border border-primary-color/20 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                          {supervisorOptions.map((name) => (
                            <div
                              key={name}
                              className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-50"
                              onClick={() => { setSelectedSupervisor(name); setIsSupervisorOpen(false); }}
                            >
                              {name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Phone number */}
                    <label className="block text-xs font-semibold text-font-secondary uppercase mb-2 tracking-wide">Phone number</label>
                    <input
                      type="text"
                      value={phoneNumber}
                      onChange={(e) => { setPhoneNumber(e.target.value); validatePhone(e.target.value); }}
                      placeholder="123-456-7890"
                      className={`w-full h-10 px-3 border rounded-lg text-sm bg-white focus:outline-none ${phoneError ? 'border-red-400 focus:border-red-500' : 'border-primary-color/20 focus:border-primary-color'} text-font-primary placeholder:text-font-secondary`}
                    />
                    {phoneError && <p className="mt-1 text-xs text-red-500">{phoneError}</p>}
                  </div>
                </div>
              )}

            {/* Step 4: Event Summary */}
              {currentStepIndex === 4 && (
                <div className="flex flex-col gap-6">
                <h2 className="text-xl font-bold font-manrope leading-[140%] text-font-primary">Event Summary</h2>

                  {/* Event Title Summary */}
                  <div className="rounded-lg border border-primary-color/20 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-primary-color/10">
                      <span className="text-sm font-semibold text-font-primary">Event Title</span>
                      <button onClick={() => setCurrentStepIndex(0)} className="text-sm text-primary-color hover:underline">Edit</button>
                    </div>
                    <div className="px-5 py-4">
                      <p className="text-sm text-font-primary">{eventTitle || 'No title entered'}</p>
                    </div>
                  </div>

                  {/* Skill Summary */}
                  <div className="rounded-lg border border-primary-color/20 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-primary-color/10">
                      <span className="text-sm font-semibold text-font-primary">Skill</span>
                      <button onClick={() => setCurrentStepIndex(0)} className="text-sm text-primary-color hover:underline">Edit</button>
                    </div>
                    <div className="px-5 py-4">
                      {selectedSkillDetails.length === 0 ? (
                        <p className="text-sm text-font-secondary">No skills selected.</p>
                      ) : (
                        <div className="flex flex-col gap-6">
                          {selectedSkillDetails.map((s, index) => {
                            const skillIcon = availableSkills.find(skill => skill.name === s.name)?.icon;
                            return (
                              <div key={s.name}>
                                <div className="flex items-start gap-3">
                                  {skillIcon && (
                                    <img 
                                      src={skillIcon} 
                                      width="24" 
                                      height="24" 
                                      alt={s.name}
                                      className="flex-shrink-0 mt-0.5"
                                      style={{ imageRendering: 'crisp-edges' }}
                                    />
                                  )}
                                  <div className="flex-1 flex flex-col gap-3">
                                    <div>
                                      <div className="text-base font-semibold text-font-primary mb-1">
                                        {s.name}
                                      </div>
                                      <div className="text-sm text-font-secondary">
                                        {s.neededWorkers} Workers Needed
                                      </div>
                                      {s.pay_rate && (
                                        <div className="text-sm text-font-secondary">
                                          ${s.pay_rate}/hour
                                        </div>
                                      )}
                                    </div>
                                    
                                    <p className="text-sm leading-[160%] text-font-secondary">
                                      {s.description}
                                    </p>
                                    
                                    {s.uniform && (
                                      <p className="text-sm leading-[160%] text-font-secondary">
                                        {s.uniform}
                                      </p>
                                    )}
                                    
                                    {s.certification && (
                                      <p className="text-sm leading-[160%] text-font-secondary">
                                        Certification Required: <span className="text-font-primary font-semibold">{s.certification}</span>
                                      </p>
                                    )}
                                  </div>
                                </div>
                                
                                {index < selectedSkillDetails.length - 1 && (
                                  <div className="w-full border-t border-primary-color/10 mt-6" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Location Summary */}
                  <div className="rounded-lg border border-primary-color/20 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-primary-color/10">
                      <span className="text-sm font-semibold text-font-primary">Location</span>
                      <button onClick={() => setCurrentStepIndex(1)} className="text-sm text-primary-color hover:underline">Edit</button>
                    </div>
                    <div className="px-5 py-4">
                      {!selectedVenue ? (
                        <p className="text-sm text-font-secondary">No venue selected.</p>
                      ) : (
                        <div className="flex flex-col gap-3">
                          <div>
                            <div className="text-base font-semibold text-font-primary mb-1">
                              {selectedVenue.name}
                            </div>
                            <div className="text-sm text-font-secondary">
                              {selectedVenue.formatted_address}
                            </div>
                          </div>
                          
                          {selectedVenue.arrival_instructions && (
                            <p className="text-sm leading-[160%] text-font-secondary">
                              {selectedVenue.arrival_instructions}
                            </p>
                          )}
                          
                          {selectedVenue.parking_info && (
                            <p className="text-sm leading-[160%] text-font-secondary">
                              {selectedVenue.parking_info}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Schedule Summary */}
                  <div className="rounded-lg border border-primary-color/20 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-primary-color/10">
                      <span className="text-sm font-semibold text-font-primary">Schedule</span>
                      <button onClick={() => setCurrentStepIndex(2)} className="text-sm text-primary-color hover:underline">Edit</button>
                    </div>
                    <div className="px-5 py-4">
                      <div className="flex flex-col gap-2">
                        <p className="text-sm text-font-primary">
                          <span className="font-medium">Date:</span> {selectedDate.toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </p>
                        <p className="text-sm text-font-primary">
                          <span className="font-medium">Time:</span> {dayjs(`1970-01-01 ${startTime}`).format('h:mm a')} - {dayjs(`1970-01-01 ${endTime}`).format('h:mm a')}
                        </p>
                        {breakMinutes > 0 && (
                          <p className="text-sm text-font-primary">
                            <span className="font-medium">Break:</span> {breakMinutes} minutes
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Check-in Summary */}
                  <div className="rounded-lg border border-primary-color/20 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-primary-color/10">
                      <span className="text-sm font-semibold text-font-primary">How to Check-in</span>
                      <button onClick={() => setCurrentStepIndex(3)} className="text-sm text-primary-color hover:underline">Edit</button>
                    </div>
                    <div className="px-5 py-4">
                      <div className="flex flex-col gap-3">
                        <p className="text-sm leading-[160%] text-font-secondary">
                          {checkInText}
                        </p>
                        
                        {selectedSupervisor && phoneNumber && (
                          <p className="text-sm leading-[160%] text-font-secondary">
                            Shift Supervisor: <span className="text-font-primary">{selectedSupervisor}</span> ({phoneNumber})
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center gap-3 pt-6 mt-2 border-t border-primary-color/10">
              {/* Left side - Back button */}
              <div>
                {currentStepIndex > 0 && (
                  <button 
                    onClick={handleBack}
                    className="flex justify-center items-center gap-2.5 px-6 py-2.5 rounded-lg text-sm font-bold font-manrope leading-[140%] text-font-primary border border-gray-300 bg-white hover:bg-gray-50"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Back
                  </button>
                )}
              </div>

              {/* Right side - Cancel, Save as Draft, Continue/Publish */}
              <div className="flex items-center gap-3">
                <button onClick={handleCancel}
                        className="flex justify-center items-center gap-2.5 px-6 py-2.5 rounded-lg text-sm font-bold font-manrope leading-[140%] text-font-primary hover:bg-gray-50">
                    Cancel
                  </button>
                  
                  {/* Show Save as Draft for new events or draft events in edit mode */}
                  {(!isEditMode || (isEditMode && currentEvent?.status === 'draft')) && (
                    <button
                      onClick={handleSaveDraft}
                      disabled={!canContinue || isSavingDraft}
                      className={`flex justify-center items-center gap-2.5 px-6 py-2.5 min-w-[120px] rounded-lg text-sm font-bold font-manrope leading-[140%] text-font-primary border border-gray-300 bg-white ${
                        canContinue && !isSavingDraft ? 'hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'
                      }`}
                    >
                      {isSavingDraft ? 'Saving…' : 'Save as Draft'}
                    </button>
                  )}
                  
                  <button
                    onClick={handleContinue}
                    disabled={!canContinue || isCreating}
                    className={`flex justify-center items-center gap-2.5 px-6 py-2.5 min-w-[120px] rounded-lg text-sm font-bold font-manrope leading-[140%] text-white ${
                      canContinue && !isCreating ? 'bg-button-action hover:bg-button-action/90' : 'bg-gray-300 cursor-not-allowed'
                    }`}
                  >
                    {isCreating ? (isEditMode ? 'Updating...' : 'Creating & Publishing...') : (currentStepIndex === steps.length - 1 ? (isEditMode ? (currentEvent?.status === 'draft' ? 'Update Event' : 'Update Event') : 'Create & Publish Event') : 'Continue')}
                  </button>
                  
                  {/* Show Publish button for draft events on Event Summary step */}
                  {isEditMode && currentStepIndex === 4 && currentEvent?.status === 'draft' && (
                    <button
                      onClick={async () => {
                        if (isCreating) return;
                        try {
                          setIsCreating(true);
                          // Build event data same way as handleCreateEvent
                          const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                          const eventDateISO = selectedDate.toISOString().split('T')[0];
                          
                          const toUtcIso = (dateISO: string, timeHHmm: string): string => {
                            const dt = dayjs.tz(`${dateISO} ${timeHHmm}`, 'YYYY-MM-DD HH:mm', userTimezone);
                            const utc = dt.utc();
                            return utc.toISOString();
                          };
                          
                          const startUtcIso = toUtcIso(eventDateISO, startTime);
                          let endUtcIso = toUtcIso(eventDateISO, endTime);
                          
                          if (dayjs.utc(endUtcIso).valueOf() <= dayjs.utc(startUtcIso).valueOf()) {
                            endUtcIso = dayjs.utc(endUtcIso).add(1, 'day').toISOString();
                          }

                          const skillRequirements: EventSkillRequirement[] = selectedSkillDetails.map(skill => ({
                            skill_name: skill.name,
                            needed_workers: skill.neededWorkers,
                            description: skill.description,
                            uniform_name: skill.uniform,
                            certification_name: skill.certification || undefined,
                            pay_rate: skill.pay_rate || undefined
                          }));

                          const schedule: EventSchedule = {
                            start_time_utc: startUtcIso,
                            end_time_utc: endUtcIso,
                            break_minutes: breakMinutes
                          };

                          const eventData = {
                            title: eventTitle || 'New Event',
                            status: 'published',
                            venue_id: selectedVenue?.id,
                            check_in_instructions: checkInText,
                            supervisor_name: selectedSupervisor,
                            supervisor_phone: phoneNumber,
                            skill_requirements: skillRequirements,
                            schedule: schedule, // Schedule update will trigger shift sync via EventSchedule callback
                          };

                          // Update event and publish in one call
                          // The schedule update will automatically sync to all shifts via EventSchedule#sync_shift_times callback
                          await updateEvent(currentEvent.id!, eventData);
                          
                          showSuccess('Event updated and published successfully!');
                          navigate(`/events?tab=active`);
                        } catch (error) {
                          console.error('Failed to publish event:', error);
                          showError('Failed to publish event');
                        } finally {
                          setIsCreating(false);
                        }
                      }}
                      disabled={!canContinue || isCreating}
                      className={`flex justify-center items-center gap-2.5 px-6 py-2.5 min-w-[120px] rounded-lg text-sm font-bold font-manrope leading-[140%] text-teal-600 border-2 border-teal-600 bg-white ${
                        canContinue && !isCreating ? 'hover:bg-teal-50' : 'opacity-50 cursor-not-allowed'
                      }`}
                    >
                      {isCreating ? 'Publishing…' : 'Publish Event'}
                    </button>
                  )}
                </div>
            </div>
          </div>
        </div>
        </>
      )}
      {/* Toast */}
      {toast.isVisible && (
        <Toast
          isVisible={toast.isVisible}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, isVisible: false })}
        />
      )}
    </>
  );
}