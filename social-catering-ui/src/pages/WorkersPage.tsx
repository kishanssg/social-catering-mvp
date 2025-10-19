import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Plus, 
  Filter,
  Mail,
  Phone,
  User,
  CheckCircle,
  XCircle,
  MoreVertical,
  Edit,
  Trash2
} from 'lucide-react';
import { apiClient } from '../lib/api';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { useAuth } from '../contexts/AuthContext';

interface Worker {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  active: boolean;
  skills_json: string[];
  certifications?: Array<{
    id: number;
    name: string;
    expires_at_utc?: string;
  }>;
}

export function WorkersPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'status'>('name');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      loadWorkers();
    }
  }, [isAuthenticated, authLoading]);
  
  async function loadWorkers() {
    setLoading(true);
    try {
      console.log('Loading workers...');
      const response = await apiClient.get('/workers');
      console.log('Workers API response:', response);
      
      if (response.data.status === 'success') {
        // The API returns { data: { workers: [...] } }
        console.log('Workers data:', response.data.data.workers);
        const workersData = response.data.data.workers || [];
        console.log('Setting workers:', workersData.length, 'workers');
        setWorkers(workersData);
      } else {
        console.error('API returned error status:', response.data);
        setWorkers([]);
      }
    } catch (error) {
      console.error('Failed to load workers:', error);
      setWorkers([]); // Ensure workers is always an array
    } finally {
      setLoading(false);
    }
  }
  
  async function handleDeleteWorker(workerId: number) {
    if (!confirm('Are you sure you want to delete this worker?')) return;
    
    try {
      const response = await apiClient.delete(`/workers/${workerId}`);
      
      if (response.data.status === 'success') {
        loadWorkers();
      }
    } catch (error) {
      console.error('Failed to delete worker:', error);
      alert('Failed to delete worker');
    }
  }
  
  // Filter and sort workers
  const filteredWorkers = workers
    .filter(worker => {
      // Status filter
      if (filterStatus === 'active' && !worker.active) return false;
      if (filterStatus === 'inactive' && worker.active) return false;
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
    return (
          worker.first_name.toLowerCase().includes(query) ||
          worker.last_name.toLowerCase().includes(query) ||
          worker.email.toLowerCase().includes(query) ||
          worker.phone?.includes(query)
        );
      }
      
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
        case 'email':
          return a.email.localeCompare(b.email);
        case 'status':
          return (b.active ? 1 : 0) - (a.active ? 1 : 0);
        default:
          return 0;
      }
    });

  // Debug logging
  console.log('WorkersPage render:', {
    workers: workers.length,
    filteredWorkers: filteredWorkers.length,
    loading,
    authLoading,
    isAuthenticated,
    filterStatus,
    searchQuery
  });

  // Show loading while authentication is in progress
  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  // Show message if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">Authentication Required</h1>
          <p className="text-gray-600">Please log in to view workers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
        <div>
            <h1 className="text-2xl font-semibold text-gray-900">Workers</h1>
            <p className="text-gray-600 mt-1">Manage your workforce</p>
        </div>
        
        <button
            onClick={() => navigate('/workers/create')}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
        >
            <Plus size={20} />
            Add New Worker
        </button>
      </div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-6">
          {/* Search */}
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
          
          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
          >
            <option value="name">Sort by Name</option>
            <option value="email">Sort by Email</option>
            <option value="status">Sort by Status</option>
          </select>
          
          {/* Status Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                filterStatus === 'all'
                  ? 'bg-teal-100 text-teal-700'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                filterStatus === 'active'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilterStatus('inactive')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                filterStatus === 'inactive'
                  ? 'bg-gray-200 text-gray-700'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              Inactive
            </button>
          </div>
        </div>

        {/* Workers Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : filteredWorkers.length === 0 ? (
        <EmptyState
            icon={<User size={48} />}
            title={searchQuery ? 'No workers found' : 'No workers yet'}
          description={
              searchQuery 
              ? 'Try adjusting your search or filters'
                : 'Add your first worker to get started'
            }
            callToAction={
              !searchQuery && (
                <button
                  onClick={() => navigate('/workers/create')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
                >
                  <Plus size={20} />
                  Add Worker
                </button>
              )
            }
          />
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-700">
                    Worker Name
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-700">
                    Phone Number
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-700">
                    Email Address
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-700">
                    Status
                  </th>
                  <th className="text-right py-3 px-6 text-sm font-medium text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredWorkers.map((worker) => (
                  <tr 
                    key={worker.id} 
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/workers/${worker.id}`)}
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                          {worker.first_name[0]}{worker.last_name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {worker.first_name} {worker.last_name}
                          </p>
                          {worker.skills_json && worker.skills_json.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {worker.skills_json.slice(0, 3).map((skill, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                                >
                                  {skill}
                                </span>
                              ))}
                              {worker.skills_json.length > 3 && (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                  +{worker.skills_json.length - 3}
                                </span>
                              )}
          </div>
        )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-600">
                      {worker.phone || '—'}
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-600">
                      {worker.email}
                    </td>
                    <td className="py-4 px-6">
                      {worker.active ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          <CheckCircle size={14} />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                          <XCircle size={14} />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/workers/${worker.id}/edit`);
                          }}
                          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteWorker(worker.id);
                          }}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}