import React, { useState } from 'react';
import { SortableTable } from './ui/SortableTable';
import type { Column } from './ui/SortableTable';
import { FilterBar } from './ui/FilterBar';

interface TestData {
  id: number;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  role: string;
  score: number;
}

const mockData: TestData[] = [
  { id: 1, name: 'John Doe', email: 'john@example.com', status: 'active', role: 'Developer', score: 95 },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'inactive', role: 'Designer', score: 87 },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', status: 'active', role: 'Manager', score: 92 },
  { id: 4, name: 'Alice Brown', email: 'alice@example.com', status: 'active', role: 'Developer', score: 78 },
  { id: 5, name: 'Charlie Wilson', email: 'charlie@example.com', status: 'inactive', role: 'Designer', score: 89 },
];

export const TestEnhancedTable: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  // Filter data
  const filteredData = mockData.filter(item => {
    if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !item.email.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (statusFilter !== 'all' && item.status !== statusFilter) {
      return false;
    }
    if (roleFilter !== 'all' && item.role !== roleFilter) {
      return false;
    }
    return true;
  });

  const columns: Column<TestData>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (item) => (
        <div>
          <div className="font-medium text-gray-900">{item.name}</div>
          <div className="text-sm text-gray-500">{item.email}</div>
        </div>
      )
    },
    {
      key: 'role',
      label: 'Role',
      sortable: true
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (item) => (
        <span
          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            item.status === 'active'
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {item.status}
        </span>
      )
    },
    {
      key: 'score',
      label: 'Score',
      sortable: true,
      render: (item) => (
        <span className="font-medium">{item.score}</span>
      )
    }
  ];

  const handleReset = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setRoleFilter('all');
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Enhanced Table Components Test</h1>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">FilterBar Component</h2>
        <FilterBar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          filters={[
            {
              key: 'status',
              label: 'Status',
              value: statusFilter,
              options: [
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' }
              ],
              onChange: setStatusFilter
            },
            {
              key: 'role',
              label: 'Role',
              value: roleFilter,
              options: [
                { value: 'all', label: 'All Roles' },
                { value: 'Developer', label: 'Developer' },
                { value: 'Designer', label: 'Designer' },
                { value: 'Manager', label: 'Manager' }
              ],
              onChange: setRoleFilter
            }
          ]}
          onReset={handleReset}
          actions={
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Test Action
            </button>
          }
        />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">SortableTable Component</h2>
        <p className="text-gray-600 mb-4">
          Showing {filteredData.length} of {mockData.length} items
        </p>
        <SortableTable
          data={filteredData}
          columns={columns}
          keyExtractor={(item) => item.id}
          emptyMessage="No data found matching your filters"
          onRowClick={(item) => alert(`Clicked on ${item.name}`)}
        />
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">Test Instructions:</h3>
        <ul className="text-blue-700 space-y-1">
          <li>• Try searching by name or email</li>
          <li>• Use the status and role filters</li>
          <li>• Click column headers to sort (asc/desc/none)</li>
          <li>• Click on rows to see click handler</li>
          <li>• Use the "Clear" button to reset filters</li>
        </ul>
      </div>
    </div>
  );
};
