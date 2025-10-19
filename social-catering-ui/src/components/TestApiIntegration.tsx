import React from 'react';
import { useSkills } from '../hooks/useSkills';
import { useLocations } from '../hooks/useLocations';

export const TestApiIntegration: React.FC = () => {
  const { skills, loading: skillsLoading, error: skillsError } = useSkills();
  const { locations, loading: locationsLoading, error: locationsError } = useLocations();

  if (skillsLoading || locationsLoading) {
    return <div>Loading API data...</div>;
  }

  if (skillsError || locationsError) {
    return (
      <div>
        <p>Error loading data:</p>
        {skillsError && <p>Skills: {skillsError}</p>}
        {locationsError && <p>Locations: {locationsError}</p>}
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>API Integration Test</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Skills ({skills.length})</h3>
        <ul>
          {skills.map(skill => (
            <li key={skill.id}>{skill.name}</li>
          ))}
        </ul>
      </div>

      <div>
        <h3>Locations ({locations.length})</h3>
        <ul>
          {locations.map(location => (
            <li key={location.id}>
              {location.name} - {location.city}, {location.state}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
