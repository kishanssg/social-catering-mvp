import { apiClient } from '../lib/api';

export interface Skill {
  id: number;
  name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SkillsResponse {
  status: 'success';
  data: Skill[];
}

// Get all active skills
export const getSkills = async (): Promise<SkillsResponse> => {
  const response = await apiClient.get('/skills');
  return response.data;
};
