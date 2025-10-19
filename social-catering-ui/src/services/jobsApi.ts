import apiClient from './api';

export interface JobSkillRequirement {
  id?: number;
  skill_name: string;
  needed_workers: number;
  description?: string;
  uniform_name?: string;
  certification_name?: string;
}

export interface JobSchedule {
  id?: number;
  start_time_utc: string;
  end_time_utc: string;
  break_minutes?: number;
}

export interface Job {
  id?: number;
  title: string;
  status: 'draft' | 'published' | 'assigned' | 'completed';
  venue_id?: number;
  check_in_instructions?: string;
  supervisor_name?: string;
  supervisor_phone?: string;
  skill_requirements?: JobSkillRequirement[];
  schedule?: JobSchedule;
  total_workers_needed?: number;
  duration_hours?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateJobRequest {
  job: {
    title: string;
    status?: 'draft' | 'published' | 'assigned' | 'completed';
    venue_id?: number;
    check_in_instructions?: string;
    supervisor_name?: string;
    supervisor_phone?: string;
    skill_requirements?: JobSkillRequirement[];
    schedule?: JobSchedule;
  };
}

export interface UpdateJobRequest {
  job: {
    title?: string;
    status?: 'draft' | 'published' | 'assigned' | 'completed';
    venue_id?: number;
    check_in_instructions?: string;
    supervisor_name?: string;
    supervisor_phone?: string;
    skill_requirements?: JobSkillRequirement[];
    schedule?: JobSchedule;
  };
}

export const jobsApi = {
  // Get all jobs
  async getJobs(params?: { status?: string; start_date?: string; end_date?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    
    const response = await apiClient.get(`/jobs?${queryParams.toString()}`);
    return response.data;
  },

  // Get job by ID
  async getJob(id: number) {
    const response = await apiClient.get(`/jobs/${id}`);
    return response.data;
  },

  // Create new job
  async createJob(jobData: CreateJobRequest) {
    const response = await apiClient.post('/jobs', jobData);
    return response.data;
  },

  // Update job
  async updateJob(id: number, jobData: UpdateJobRequest) {
    const response = await apiClient.patch(`/jobs/${id}`, jobData);
    return response.data;
  },

  // Delete job
  async deleteJob(id: number) {
    const response = await apiClient.delete(`/jobs/${id}`);
    return response.data;
  },

  // Update job status
  async updateJobStatus(id: number, status: string) {
    const response = await apiClient.patch(`/jobs/${id}/update_status`, { status });
    return response.data;
  },

  // Job Skill Requirements (nested routes)
  async createJobSkillRequirement(jobId: number, skillData: Omit<JobSkillRequirement, 'id'>) {
    const response = await apiClient.post(`/jobs/${jobId}/job_skill_requirements`, {
      job_skill_requirement: skillData
    });
    return response.data;
  },

  async updateJobSkillRequirement(jobId: number, skillId: number, skillData: Partial<JobSkillRequirement>) {
    const response = await apiClient.patch(`/jobs/${jobId}/job_skill_requirements/${skillId}`, {
      job_skill_requirement: skillData
    });
    return response.data;
  },

  async deleteJobSkillRequirement(jobId: number, skillId: number) {
    const response = await apiClient.delete(`/jobs/${jobId}/job_skill_requirements/${skillId}`);
    return response.data;
  }
};
