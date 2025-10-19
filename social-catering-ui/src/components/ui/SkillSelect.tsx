import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { getSkills } from '../../services/skillsApi';
import type { Skill } from '../../types';

interface SkillSelectProps {
  selectedSkillId?: number;
  onSkillChange: (skillId: number | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

export const SkillSelect: React.FC<SkillSelectProps> = ({
  selectedSkillId,
  onSkillChange,
  placeholder = "Select skill...",
  className = "",
  disabled = false,
  required = false
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

  const selectedSkill = skills.find(skill => skill.id === selectedSkillId);

  const handleSelectSkill = (skillId: number) => {
    onSkillChange(skillId);
    setIsOpen(false);
  };

  const handleClearSelection = () => {
    onSkillChange(undefined);
    setIsOpen(false);
  };

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
          ${required && !selectedSkill ? 'border-red-300' : ''}
        `}
      >
        <div className="flex items-center justify-between">
          <span className={selectedSkill ? 'text-gray-900' : 'text-gray-500'}>
            {selectedSkill ? selectedSkill.name : placeholder}
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
            <>
              {!required && (
                <button
                  onClick={handleClearSelection}
                  className="w-full px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-100"
                >
                  Clear selection
                </button>
              )}
              {skills.map((skill) => (
                <button
                  key={skill.id}
                  onClick={() => handleSelectSkill(skill.id)}
                  className={`
                    w-full px-3 py-2 text-left text-sm hover:bg-gray-100
                    ${selectedSkillId === skill.id ? 'bg-blue-50 text-blue-900' : 'text-gray-900'}
                  `}
                >
                  {skill.name}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};
