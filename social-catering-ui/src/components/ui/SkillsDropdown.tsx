import React, { useState, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { getSkills } from '../../services/skillsApi';
import type { Skill } from '../../types';

interface SkillsDropdownProps {
  selectedSkills: number[];
  onSkillsChange: (skillIds: number[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const SkillsDropdown: React.FC<SkillsDropdownProps> = ({
  selectedSkills,
  onSkillsChange,
  placeholder = "Select skills...",
  className = "",
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const response = await getSkills();
        setSkills(response.data);
      } catch (error) {
        console.error('Error fetching skills:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSkills();
  }, []);

  const handleToggleSkill = (skillId: number) => {
    if (selectedSkills.includes(skillId)) {
      onSkillsChange(selectedSkills.filter(id => id !== skillId));
    } else {
      onSkillsChange([...selectedSkills, skillId]);
    }
  };

  const selectedSkillNames = skills
    .filter(skill => selectedSkills.includes(skill.id))
    .map(skill => skill.name);

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-3 py-2 text-left border border-gray-300 rounded-md shadow-sm
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white cursor-pointer'}
          ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}
        `}
      >
        <div className="flex items-center justify-between">
          <span className={selectedSkillNames.length === 0 ? 'text-gray-500' : 'text-gray-900'}>
            {selectedSkillNames.length === 0 
              ? placeholder 
              : selectedSkillNames.length === 1
                ? selectedSkillNames[0]
                : `${selectedSkillNames.length} skills selected`
            }
          </span>
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {loading ? (
            <div className="px-3 py-2 text-gray-500">Loading skills...</div>
          ) : skills.length === 0 ? (
            <div className="px-3 py-2 text-gray-500">No skills available</div>
          ) : (
            skills.map((skill) => (
              <label
                key={skill.id}
                className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedSkills.includes(skill.id)}
                  onChange={() => handleToggleSkill(skill.id)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-900">{skill.name}</span>
                {selectedSkills.includes(skill.id) && (
                  <Check className="ml-auto h-4 w-4 text-blue-600" />
                )}
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
};
