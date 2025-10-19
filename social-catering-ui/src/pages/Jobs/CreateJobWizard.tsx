import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import type { Venue } from '../../services/venuesApi';
import { jobsApi, type Job, type JobSkillRequirement, type JobSchedule } from '../../services/jobsApi';

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
}

interface CreateJobWizardProps {
  editJob?: Job;
  isEditing?: boolean;
}

export default function CreateJobWizard({ editJob, isEditing = false }: CreateJobWizardProps) {
  const navigate = useNavigate();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isSkillsDropdownOpen, setIsSkillsDropdownOpen] = useState(false);
  const [selectedSkillDetails, setSelectedSkillDetails] = useState<SkillDetail[]>([]);
  const [openUniformDropdown, setOpenUniformDropdown] = useState<string | null>(null);
  const [openCertificationDropdown, setOpenCertificationDropdown] = useState<string | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  
  // Schedule step state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState<string>('08:00');
  const [endTime, setEndTime] = useState<string>('17:00');
  const [breakMinutes, setBreakMinutes] = useState<number>(15);
  const [isStartTimeOpen, setIsStartTimeOpen] = useState(false);
  const [isEndTimeOpen, setIsEndTimeOpen] = useState(false);
  const [isBreakOpen, setIsBreakOpen] = useState(false);

  // Build 15-min increment time options with 12-hour labels
  const timeOptions = React.useMemo(() => {
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
  
  // Job creation state
  const [isCreating, setIsCreating] = useState(false);
  const [jobTitle, setJobTitle] = useState<string>('');

  // Initialize form with existing job data if editing
  React.useEffect(() => {
    if (editJob && isEditing) {
      setJobTitle(editJob.title);
      
      // Set venue if exists
      if (editJob.venue_id) {
        // You would need to fetch the venue details here
        // For now, we'll set a placeholder
        setSelectedVenue({
          id: editJob.venue_id,
          name: 'Loading...',
          formatted_address: 'Loading...'
        } as Venue);
      }
      
      // Set check-in details
      if (editJob.check_in_instructions) {
        setCheckInText(editJob.check_in_instructions);
        setCheckInEdited(true);
      }
      if (editJob.supervisor_name) {
        setSelectedSupervisor(editJob.supervisor_name);
      }
      if (editJob.supervisor_phone) {
        setPhoneNumber(editJob.supervisor_phone);
      }
      
      // Set schedule if exists
      if (editJob.schedule) {
        const startDate = new Date(editJob.schedule.start_time_utc);
        setSelectedDate(startDate);
        setStartTime(startDate.toTimeString().slice(0, 5));
        
        const endDate = new Date(editJob.schedule.end_time_utc);
        setEndTime(endDate.toTimeString().slice(0, 5));
        
        if (editJob.schedule.break_minutes) {
          setBreakMinutes(editJob.schedule.break_minutes);
        }
      }
      
      // Set skill requirements if exist
      if (editJob.skill_requirements && editJob.skill_requirements.length > 0) {
        const skills: SkillDetail[] = editJob.skill_requirements.map(req => ({
          name: req.skill_name,
          icon: getSkillIcon(req.skill_name),
          neededWorkers: req.needed_workers,
          uniform: req.uniform_name || '',
          description: req.description || '',
          certification: req.certification_name || ''
        }));
        setSelectedSkillDetails(skills);
      }
      
      // Mark all steps as completed for editing
      setCompletedSteps([0, 1, 2, 3]);
    }
  }, [editJob, isEditing]);

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
      title: 'Create New Job',
      description: 'Pick the skills needed and assign your team.',
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
      title: 'Job Summary',
      description: 'Take a moment to review all job details before posting.',
      completed: completedSteps.includes(4) || currentStepIndex > 4,
      active: currentStepIndex === 4,
    },
  ];

  const handleCancel = () => {
    navigate('/jobs');
  };

  const handleContinue = async () => {
    // Check if at least one skill is selected with needed workers > 0
    const hasValidSkills = selectedSkillDetails.some(skill => skill.neededWorkers > 0);
    if (!hasValidSkills) return;

    // Mark current step as completed
    if (!completedSteps.includes(currentStepIndex)) {
      setCompletedSteps([...completedSteps, currentStepIndex]);
    }

    // If this is the last step (Job Summary), create the job
    if (currentStepIndex === steps.length - 1) {
      await createJob();
      return;
    }

    // Move to next step
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const createJob = async () => {
    if (isCreating) return;
    
    setIsCreating(true);
    try {
      // Convert selected skills to API format
      const skillRequirements: JobSkillRequirement[] = selectedSkillDetails.map(skill => ({
        skill_name: skill.name,
        needed_workers: skill.neededWorkers,
        description: skill.description,
        uniform_name: skill.uniform,
        certification_name: skill.certification || undefined
      }));

      // Create schedule data
      const schedule: JobSchedule = {
        start_time_utc: new Date(`${selectedDate.toISOString().split('T')[0]}T${startTime}:00.000Z`).toISOString(),
        end_time_utc: new Date(`${selectedDate.toISOString().split('T')[0]}T${endTime}:00.000Z`).toISOString(),
        break_minutes: breakMinutes
      };

      // Create job data
      const jobData = {
        job: {
          title: jobTitle || 'New Job',
          status: editJob?.status || 'draft' as const,
          venue_id: selectedVenue?.id,
          check_in_instructions: checkInText,
          supervisor_name: selectedSupervisor,
          supervisor_phone: phoneNumber,
          skill_requirements: skillRequirements,
          schedule: schedule
        }
      };

      let response;
      if (isEditing && editJob) {
        // Update existing job
        response = await jobsApi.updateJob(editJob.id!, jobData);
        console.log('Job updated successfully:', response);
      } else {
        // Create new job
        response = await jobsApi.createJob(jobData);
        console.log('Job created successfully:', response);
      }
      
      // Navigate back to jobs list
      navigate('/jobs');
    } catch (error) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} job:`, error);
      // You might want to show an error message to the user here
    } finally {
      setIsCreating(false);
    }
  };

  // Individual skill management functions
  const addSkillToJob = async (jobId: number, skill: SkillDetail) => {
    try {
      const skillData = {
        skill_name: skill.name,
        needed_workers: skill.neededWorkers,
        description: skill.description,
        uniform_name: skill.uniform,
        certification_name: skill.certification || undefined
      };

      const response = await jobsApi.createJobSkillRequirement(jobId, skillData);
      console.log('Skill added to job:', response);
      return response.data;
    } catch (error) {
      console.error('Error adding skill to job:', error);
      throw error;
    }
  };

  const updateSkillInJob = async (jobId: number, skillId: number, skill: Partial<SkillDetail>) => {
    try {
      const skillData = {
        skill_name: skill.name,
        needed_workers: skill.neededWorkers,
        description: skill.description,
        uniform_name: skill.uniform,
        certification_name: skill.certification
      };

      const response = await jobsApi.updateJobSkillRequirement(jobId, skillId, skillData);
      console.log('Skill updated in job:', response);
      return response.data;
    } catch (error) {
      console.error('Error updating skill in job:', error);
      throw error;
    }
  };

  const removeSkillFromJob = async (jobId: number, skillId: number) => {
    try {
      await jobsApi.deleteJobSkillRequirement(jobId, skillId);
      console.log('Skill removed from job');
    } catch (error) {
      console.error('Error removing skill from job:', error);
      throw error;
    }
  };

  const toggleSkillsDropdown = () => {
    setIsSkillsDropdownOpen(!isSkillsDropdownOpen);
  };

  const handleSkillClick = (skillName: string) => {
    const skillIcon = availableSkills.find(s => s.name === skillName)?.icon || '';
    const isAlreadySelected = selectedSkillDetails.some(s => s.name === skillName);
    
    if (!isAlreadySelected) {
      const newSkill: SkillDetail = {
        name: skillName,
        icon: skillIcon,
        neededWorkers: 1,
        uniform: '',
        description: skillDescriptions[skillName] || '',
        certification: '',
      };
      setSelectedSkillDetails([...selectedSkillDetails, newSkill]);
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
    ? selectedSkillDetails.some(skill => skill.neededWorkers > 0)
    : currentStepIndex === 1
    ? selectedVenue !== null
    : true;

  return (
    <div className="flex min-h-screen bg-neutral-white">
      {/* Sidebar Navigation */}
      <div className="flex flex-col w-[261px] border-r border-primary-color/10 bg-secondary-color sticky top-0 h-screen overflow-y-auto" style={{ padding: '32px 24px', gap: '70px' }}>
        {/* Logo */}
        <div className="flex flex-col items-center gap-2.5 self-stretch">
          <img 
            src="https://api.builder.io/api/v1/image/assets/TEMP/d8ae28adfafcd027c6a2af6793beae5a60e94de9?width=297" 
            alt="Social Catering Logo" 
            className="w-[148.515px] h-10"
          />
        </div>

        {/* Active State Indicator */}
        <div className="w-1 h-7 bg-primary-color rounded-sm absolute left-0" style={{ top: '196px' }} />

        {/* Navigation Pages */}
        <div className="flex flex-col items-start gap-2 flex-1 self-stretch">
          {/* Dashboard */}
          <div className="flex items-center gap-3 px-0 py-2 self-stretch rounded-xl">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                d="M3.75 6C3.75 4.75736 4.75736 3.75 6 3.75H8.25C9.49264 3.75 10.5 4.75736 10.5 6V8.25C10.5 9.49264 9.49264 10.5 8.25 10.5H6C4.75736 10.5 3.75 9.49264 3.75 8.25V6Z" 
                stroke="#292826" 
                strokeOpacity="0.5" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
              <path 
                d="M3.75 15.75C3.75 14.5074 4.75736 13.5 6 13.5H8.25C9.49264 13.5 10.5 14.5074 10.5 15.75V18C10.5 19.2426 9.49264 20.25 8.25 20.25H6C4.75736 20.25 3.75 19.2426 3.75 18V15.75Z" 
                stroke="#292826" 
                strokeOpacity="0.5" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
              <path 
                d="M13.5 6C13.5 4.75736 14.5074 3.75 15.75 3.75H18C19.2426 3.75 20.25 4.75736 20.25 6V8.25C20.25 9.49264 19.2426 10.5 18 10.5H15.75C14.5074 10.5 13.5 9.49264 13.5 8.25V6Z" 
                stroke="#292826" 
                strokeOpacity="0.5" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
              <path 
                d="M13.5 15.75C13.5 14.5074 14.5074 13.5 15.75 13.5H18C19.2426 13.5 20.25 14.5074 20.25 15.75V18C20.25 19.2426 19.2426 20.25 18 20.25H15.75C14.5074 20.25 13.5 19.2426 13.5 18V15.75Z" 
                stroke="#292826" 
                strokeOpacity="0.5" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-sm font-normal font-manrope leading-[140%] text-font-primary">Dashboard</span>
          </div>

          {/* Jobs - Active */}
          <div className="flex items-center gap-3 px-0 py-2 self-stretch">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                fillRule="evenodd" 
                clipRule="evenodd" 
                d="M7.5 5.25C7.5 3.59315 8.84315 2.25 10.5 2.25H13.5C15.1569 2.25 16.5 3.59315 16.5 5.25V5.45498C17.4325 5.54034 18.3574 5.65196 19.274 5.78912C20.7281 6.00668 21.75 7.27163 21.75 8.70569V11.7389C21.75 12.95 21.0164 14.0913 19.8137 14.4911C17.3566 15.308 14.7292 15.75 12 15.75C9.27087 15.75 6.64342 15.308 4.18627 14.4911C2.98364 14.0912 2.25 12.95 2.25 11.7389V8.70569C2.25 7.27163 3.27191 6.00668 4.72596 5.78912C5.6426 5.65196 6.56753 5.54034 7.5 5.45498V5.25ZM15 5.25V5.34082C14.0077 5.28056 13.0074 5.25 12 5.25C10.9927 5.25 9.99235 5.28056 9 5.34082V5.25C9 4.42157 9.67157 3.75 10.5 3.75H13.5C14.3284 3.75 15 4.42157 15 5.25ZM12 13.5C12.4142 13.5 12.75 13.1642 12.75 12.75C12.75 12.3358 12.4142 12 12 12C11.5858 12 11.25 12.3358 11.25 12.75C11.25 13.1642 11.5858 13.5 12 13.5Z" 
                fill="#292826"
              />
              <path 
                d="M3 18.4V15.6039C3.22304 15.7263 3.46097 15.8307 3.71303 15.9145C6.32087 16.7815 9.10801 17.25 12 17.25C14.892 17.25 17.6791 16.7815 20.287 15.9145C20.539 15.8307 20.777 15.7263 21 15.604V18.4C21 19.8519 19.9528 21.1275 18.4769 21.3234C16.3575 21.6048 14.1955 21.75 12 21.75C9.80447 21.75 7.64246 21.6048 5.52314 21.3234C4.04724 21.1275 3 19.8519 3 18.4Z" 
                fill="#292826"
              />
            </svg>
            <span className="text-sm font-bold font-manrope leading-[140%] text-font-primary">Jobs</span>
          </div>

          {/* Clients */}
          <div className="flex items-center gap-3 px-0 py-2 self-stretch">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                d="M15.7508 6C15.7508 8.07107 14.0719 9.75 12.0008 9.75C9.92975 9.75 8.25082 8.07107 8.25082 6C8.25082 3.92893 9.92975 2.25 12.0008 2.25C14.0719 2.25 15.7508 3.92893 15.7508 6Z" 
                stroke="#292826" 
                strokeOpacity="0.5" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
              <path 
                d="M4.50195 20.1182C4.57226 16.0369 7.90269 12.75 12.0008 12.75C16.099 12.75 19.4295 16.0371 19.4997 20.1185C17.2169 21.166 14.6772 21.75 12.0011 21.75C9.32481 21.75 6.78491 21.1659 4.50195 20.1182Z" 
                stroke="#292826" 
                strokeOpacity="0.5" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-sm font-normal font-manrope leading-[140%] text-font-primary">Administrators & Roles</span>
          </div>

          {/* Workers */}
          <div className="flex items-center gap-3 px-0 py-2 self-stretch">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                d="M17.9992 18.7191C18.2467 18.7396 18.4971 18.75 18.7498 18.75C19.7982 18.75 20.8046 18.5708 21.7403 18.2413C21.7466 18.1617 21.7498 18.0812 21.7498 18C21.7498 16.3431 20.4067 15 18.7498 15C18.1222 15 17.5396 15.1927 17.058 15.5222M17.9992 18.7191C17.9993 18.7294 17.9993 18.7397 17.9993 18.75C17.9993 18.975 17.9869 19.1971 17.9628 19.4156C16.206 20.4237 14.1699 21 11.9993 21C9.8286 21 7.79254 20.4237 6.03577 19.4156C6.01165 19.1971 5.99927 18.975 5.99927 18.75C5.99927 18.7397 5.99929 18.7295 5.99934 18.7192M17.9992 18.7191C17.9933 17.5426 17.6487 16.4461 17.058 15.5222M17.058 15.5222C15.9921 13.8552 14.1247 12.75 11.9993 12.75C9.87406 12.75 8.00692 13.8549 6.94096 15.5216M6.94096 15.5216C6.4595 15.1925 5.87723 15 5.25 15C3.59315 15 2.25 16.3431 2.25 18C2.25 18.0812 2.25323 18.1617 2.25956 18.2413C3.19519 18.5708 4.20167 18.75 5.25 18.75C5.50234 18.75 5.75226 18.7396 5.99934 18.7192M6.94096 15.5216C6.34997 16.4457 6.00525 17.5424 5.99934 18.7192M14.9993 6.75C14.9993 8.40685 13.6561 9.75 11.9993 9.75C10.3424 9.75 8.99927 8.40685 8.99927 6.75C8.99927 5.09315 10.3424 3.75 11.9993 3.75C13.6561 3.75 14.9993 5.09315 14.9993 6.75ZM20.9993 9.75C20.9993 10.9926 19.9919 12 18.7493 12C17.5066 12 16.4993 10.9926 16.4993 9.75C16.4993 8.50736 17.5066 7.5 18.7493 7.5C19.9919 7.5 20.9993 8.50736 20.9993 9.75ZM7.49927 9.75C7.49927 10.9926 6.49191 12 5.24927 12C4.00663 12 2.99927 10.9926 2.99927 9.75C2.99927 8.50736 4.00663 7.5 5.24927 7.5C6.49191 7.5 7.49927 8.50736 7.49927 9.75Z" 
                stroke="#292826" 
                strokeOpacity="0.5" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-sm font-normal font-manrope leading-[140%] text-font-primary">Workers</span>
          </div>

          {/* Reports */}
          <div className="flex items-center gap-3 px-0 py-2 self-stretch">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                d="M3 13.125C3 12.5037 3.50368 12 4.125 12H6.375C6.99632 12 7.5 12.5037 7.5 13.125V19.875C7.5 20.4963 6.99632 21 6.375 21H4.125C3.50368 21 3 20.4963 3 19.875V13.125Z" 
                stroke="#292826" 
                strokeOpacity="0.5" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
              <path 
                d="M9.75 8.625C9.75 8.00368 10.2537 7.5 10.875 7.5H13.125C13.7463 7.5 14.25 8.00368 14.25 8.625V19.875C14.25 20.4963 13.7463 21 13.125 21H10.875C10.2537 21 9.75 20.4963 9.75 19.875V8.625Z" 
                stroke="#292826" 
                strokeOpacity="0.5" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
              <path 
                d="M16.5 4.125C16.5 3.50368 17.0037 3 17.625 3H19.875C20.4963 3 21 3.50368 21 4.125V19.875C21 20.4963 20.4963 21 19.875 21H17.625C17.0037 21 16.5 20.4963 16.5 19.875V4.125Z" 
                stroke="#292826" 
                strokeOpacity="0.5" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-sm font-normal font-manrope leading-[140%] text-font-primary">Reports</span>
          </div>

          {/* Venue */}
          <div className="flex items-center gap-3 px-0 py-2 self-stretch">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                d="M9 6.75002V15M15 9.00002V17.25M15.5031 20.7485L20.3781 18.311C20.7592 18.1204 21 17.7309 21 17.3047V4.82031C21 3.98401 20.1199 3.44007 19.3719 3.81408L15.5031 5.74847C15.1864 5.90683 14.8136 5.90683 14.4969 5.74847L9.50312 3.25158C9.1864 3.09322 8.8136 3.09322 8.49688 3.25158L3.62188 5.68908C3.24075 5.87965 3 6.26919 3 6.69531V19.1797C3 20.016 3.8801 20.56 4.62811 20.186L8.49688 18.2516C8.8136 18.0932 9.1864 18.0932 9.50312 18.2516L14.4969 20.7485C8.8136 20.9068 15.1864 20.9068 15.5031 20.7485Z" 
                stroke="#292826" 
                strokeOpacity="0.5" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-sm font-normal font-manrope leading-[140%] text-font-primary">Venue</span>
          </div>
        </div>

        {/* Others section */}
        <div className="flex flex-col justify-center items-center gap-4 self-stretch">
          {/* Support */}
          <div className="flex items-center gap-3 px-0 py-4 pr-4 self-stretch">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                d="M9.87891 7.51884C11.0505 6.49372 12.95 6.49372 14.1215 7.51884C15.2931 8.54397 15.2931 10.206 14.1215 11.2312C13.9176 11.4096 13.6917 11.5569 13.4513 11.6733C12.7056 12.0341 12.0002 12.6716 12.0002 13.5V14.25M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12ZM12 17.25H12.0075V17.2575H12V17.25Z" 
                stroke="#292826" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-sm font-normal font-manrope leading-[140%] text-font-primary">Support</span>
          </div>

          {/* Divider */}
          <svg width="260" height="2" viewBox="0 0 261 2" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0.5 1H260.5" stroke="#DADADA"/>
          </svg>

          {/* User */}
          <div className="flex items-center gap-3 px-0 py-4 self-stretch">
            <div className="w-10 h-10 relative">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="20" cy="20" r="20" fill="#292826"/>
              </svg>
              <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute top-1.5 left-1.5">
                <path 
                  fillRule="evenodd" 
                  clipRule="evenodd" 
                  d="M9.37554 7.5C9.37554 4.3934 11.8939 1.875 15.0005 1.875C18.1071 1.875 20.6255 4.3934 20.6255 7.5C20.6255 10.6066 18.1071 13.125 15.0005 13.125C11.8939 13.125 9.37554 10.6066 9.37554 7.5Z" 
                  fill="white"
                />
                <path 
                  fillRule="evenodd" 
                  clipRule="evenodd" 
                  d="M4.68959 25.1317C4.78627 19.5195 9.36552 15 15.0005 15C20.6357 15 25.215 19.5197 25.3115 25.1321C25.3179 25.5043 25.1035 25.845 24.7651 26.0002C21.7914 27.3647 18.4837 28.125 15.0009 28.125C11.5179 28.125 8.20983 27.3646 5.23594 25.9999C4.8976 25.8446 4.68318 25.5039 4.68959 25.1317Z" 
                  fill="white"
                />
              </svg>
            </div>
            <div className="flex flex-col justify-center items-start flex-1">
              <span className="text-sm font-semibold font-manrope leading-[140%] text-font-primary">Marcus Langley</span>
              <span className="text-sm font-normal font-manrope leading-[140%] text-font-primary">Administrator</span>
            </div>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                fillRule="evenodd" 
                clipRule="evenodd" 
                d="M5.21967 11.7803C5.51256 12.0732 5.98744 12.0732 6.28033 11.7803L10 8.06066L13.7197 11.7803C14.0126 12.0732 14.4874 12.0732 14.7803 11.7803C15.0732 11.4874 15.0732 11.0126 14.7803 10.7197L10.5303 6.46967C10.3897 6.32902 10.1989 6.25 10 6.25C9.80109 6.25 9.61032 6.32902 9.46967 6.46967L5.21967 10.7197C4.92678 11.0126 4.92678 11.4874 5.21967 11.7803Z" 
                fill="#292826"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Breadcrumbs */}
        <div className="flex items-center px-8 py-5">
          <div className="flex items-center gap-4">
            <span className="text-sm font-normal font-manrope leading-[140%] text-font-primary">Jobs</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M6.21967 4.21967C6.51256 3.92678 6.98744 3.92678 7.28033 4.21967L10.5303 7.46967C10.8232 7.76256 10.8232 8.23744 10.5303 8.53033L7.28033 11.7803C6.98744 12.0732 6.51256 12.0732 6.21967 11.7803C5.92678 11.4874 5.92678 11.0126 6.21967 10.7197L8.93934 8L6.21967 5.28033C5.92678 4.98744 5.92678 4.51256 6.21967 4.21967Z" fill="#292826"/>
            </svg>
<span className="text-sm font-normal font-manrope leading-[140%] text-font-primary">
              {isEditing ? 'Edit Job' : 'Create New Job'}
            </span>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex flex-1 justify-center gap-12 px-8 min-h-0" style={{ paddingTop: '80px', paddingBottom: '40px' }}>
          {/* Progress indicator */}
          <div className="w-[280px] flex-shrink-0 self-start">
            {steps.map((step, index) => (
              <div key={step.id} className="flex gap-4" style={{ minHeight: index < steps.length - 1 ? '100px' : 'auto' }}>
                {/* Circle and Line Container */}
                <div className="flex flex-col items-center">
                  {/* Circle Indicator */}
                  <div className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0" style={{
                    backgroundColor: step.completed ? '#FFFFFF' : (step.active ? '#3A869D' : 'transparent'),
                    border: step.completed || step.active ? '2px solid #3A869D' : '0.8px solid #292826',
                    boxShadow: (step.active || step.completed) ? '0 2px 8px 0 rgba(0, 0, 0, 0.04)' : 'none'
                  }}>
                    {step.completed ? (
                      <img src={checkIcon} width="18" height="18" alt="Completed" className="flex-shrink-0" />
                    ) : step.active ? (
                      <div className="rounded-full bg-white" style={{ width: '12px', height: '12px' }}></div>
                    ) : null}
                  </div>

                  {/* Connector Line - uses flex-1 to fill space between circles */}
                  {index < steps.length - 1 && (
                    <div className="flex-1" style={{ width: '2px', backgroundColor: 'rgba(58, 134, 157, 0.5)' }}></div>
                  )}
                </div>

                {/* Step Content */}
                <div className="flex flex-col gap-1 pt-1">
                  <span className="text-sm font-bold font-manrope leading-[140%] text-font-primary">
                    {step.title}
                  </span>
                  <span className="text-sm font-normal font-manrope leading-[140%] text-font-secondary">
                    {step.description}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Content Card */}
          <div
            className="flex flex-col p-8 rounded-lg border border-primary-color/10 bg-white self-start overflow-visible"
            style={{ 
              boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.04)', 
              maxWidth: '850px', 
              width: '100%',
              minHeight: '600px'
            }}
          >
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

                  {/* Job Description */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold font-manrope leading-[140%] text-font-primary">
                        Job description
                      </span>
                      <button className="text-sm font-normal font-manrope leading-[140%] text-primary-color hover:underline">
                        Edit
                      </button>
                    </div>
                    <p className="text-sm font-normal font-manrope leading-[140%] text-font-secondary">
                      {skill.description}
                    </p>
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

              {/* Step 4: Job Summary */}
              {currentStepIndex === 4 && (
                <div className="flex flex-col gap-6">
                  <h2 className="text-xl font-bold font-manrope leading-[140%] text-font-primary">Job Summary</h2>

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
                          <span className="font-medium">Time:</span> {startTime} - {endTime}
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
            <div className="flex justify-end items-center gap-3 pt-6 mt-2 border-t border-primary-color/10">
              <button
                onClick={handleCancel}
                className="flex justify-center items-center gap-2.5 px-6 py-2.5 rounded-lg text-sm font-bold font-manrope leading-[140%] text-font-primary hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleContinue}
                disabled={!canContinue || isCreating}
                className={`flex justify-center items-center gap-2.5 px-6 py-2.5 min-w-[120px] rounded-lg text-sm font-bold font-manrope leading-[140%] text-white transition-colors ${
                  canContinue && !isCreating
                    ? 'bg-button-action hover:bg-button-action/90 cursor-pointer' 
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
{isCreating ? (isEditing ? 'Updating...' : 'Creating...') : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}