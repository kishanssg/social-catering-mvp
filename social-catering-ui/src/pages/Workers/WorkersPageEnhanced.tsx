import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import { useWorkers } from '../../hooks/useWorkers';
import { SortableTable } from '../../components/ui/SortableTable';
import type { Column } from '../../components/ui/SortableTable';
import { FilterBar } from '../../components/ui/FilterBar';
import { Modal } from '../../components/ui/Modal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { apiService } from '../../services/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { WorkerForm } from '../../components/Workers/WorkerFormNew';
import { WorkerDetail } from '../../components/Workers/WorkerDetailNew';
import type { Worker } from '../../types';

export default function WorkersPageEnhanced() {
  const navigate = useNavigate();
  const { workers, isLoading, error, refetch } = useWorkers();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [skillFilter, setSkillFilter] = useState('all');
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create' | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [workerToDelete, setWorkerToDelete] = useState<Worker | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Get unique skills for filter
  const uniqueSkills = useMemo(() => {
    const skills = new Set<string>();
    workers.forEach(worker => {
      worker.skills_json?.forEach(skill => skills.add(skill));
    });
    return Array.from(skills).sort();
  }, [workers]);

  // Filter workers
  const filteredWorkers = useMemo(() => {
    return workers.filter(worker => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const fullName = `${worker.first_name} ${worker.last_name}`.toLowerCase();
        const matchesName = fullName.includes(search);
        const matchesEmail = worker.email.toLowerCase().includes(search);
        const matchesSkills = worker.skills_json?.some(skill => 
          skill.toLowerCase().includes(search)
        );
        
        if (!matchesName && !matchesEmail && !matchesSkills) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'active' && !worker.active) return false;
        if (statusFilter === 'inactive' && worker.active) return false;
      }

      // Skill filter
      if (skillFilter !== 'all') {
        if (!worker.skills_json?.includes(skillFilter)) return false;
      }

      return true;
    });
  }, [workers, searchTerm, statusFilter, skillFilter]);

  // Table columns
  const columns: Column<Worker>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (worker) => (
        <div>
          <div className="font-medium text-gray-900">
            {worker.first_name} {worker.last_name}
          </div>
          <div className="text-sm text-gray-500">{worker.email}</div>
        </div>
      )
    },
    {
      key: 'phone',
      label: 'Phone',
      sortable: true,
      render: (worker) => worker.phone || '-'
    },
    {
      key: 'skills',
      label: 'Skills',
      render: (worker) => (
        <div className="flex flex-wrap gap-1">
          {worker.skills_json?.slice(0, 3).map((skill: string, index: number) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
            >
              {skill}
            </span>
          ))}
          {worker.skills_json && worker.skills_json.length > 3 && (
            <span className="text-xs text-gray-500">
              +{worker.skills_json.length - 3} more
            </span>
          )}
        </div>
      )
    },
    {
      key: 'certifications',
      label: 'Certifications',
      render: (worker) => {
        const validCerts = worker.certifications?.filter((cert: any) => 
          !cert.expires_at || new Date(cert.expires_at) > new Date()
        );
        return (
          <div className="text-sm">
            {validCerts && validCerts.length > 0 ? (
              <span className="text-green-600">{validCerts.length} active</span>
            ) : (
              <span className="text-gray-400">None</span>
            )}
          </div>
        );
      }
    },
    {
      key: 'active',
      label: 'Status',
      sortable: true,
      render: (worker) => (
        <span
          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            worker.active
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {worker.active ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'text-right',
      render: (worker) => (
        <div className="flex justify-end gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedWorker(worker);
              setModalMode('view');
            }}
            className="text-gray-600 hover:text-gray-900"
            title="View"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedWorker(worker);
              setModalMode('edit');
            }}
            className="text-blue-600 hover:text-blue-900"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setWorkerToDelete(worker);
              setDeleteModalOpen(true);
            }}
            className="text-red-600 hover:text-red-900"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  const handleDelete = async () => {
    if (!workerToDelete) return;
    
    try {
      setIsDeleting(true);
      await apiService.updateWorker(workerToDelete.id, { active: false });
      setDeleteModalOpen(false);
      setWorkerToDelete(null);
      refetch();
    } catch (error) {
      console.error('Failed to delete worker:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      setFormError(null);
      
      // Extract certifications from data
      const { certifications, ...workerData } = data;
      
      // Create worker first
      const response = await apiService.createWorker(workerData);
      const workerId = response.data.worker.id;
      
      // Add certifications if any
      if (certifications && certifications.length > 0) {
        for (const cert of certifications) {
          try {
            await apiService.addCertificationToWorker(workerId, {
              certification_id: cert.certification_id,
              expires_at_utc: cert.expires_at_utc
            });
          } catch (certErr) {
            console.error('Error adding certification:', certErr);
          }
        }
      }
      
      setModalMode(null);
      setSelectedWorker(null);
      refetch();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to create worker';
      setFormError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (data: any) => {
    if (!selectedWorker) return;

    try {
      setIsSubmitting(true);
      setFormError(null);
      
      await apiService.updateWorker(selectedWorker.id, data);
      
      setModalMode(null);
      setSelectedWorker(null);
      refetch();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to update worker';
      setFormError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setSkillFilter('all');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={refetch} />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Workers</h1>
        <p className="text-gray-600 mt-2">Manage your workforce and their information</p>
      </div>

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
            key: 'skill',
            label: 'Skill',
            value: skillFilter,
            options: [
              { value: 'all', label: 'All Skills' },
              ...uniqueSkills.map(skill => ({ value: skill, label: skill }))
            ],
            onChange: setSkillFilter
          }
        ]}
        onReset={handleReset}
        actions={
          <button
            onClick={() => {
              setSelectedWorker(null);
              setModalMode('create');
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Worker
          </button>
        }
      />

      <div className="mt-6">
        <SortableTable
          data={filteredWorkers}
          columns={columns}
          keyExtractor={(worker) => worker.id}
          emptyMessage="No workers found"
        />
      </div>

      {/* Worker Modal */}
      {modalMode && (
        <Modal
          isOpen={!!modalMode}
          onClose={() => {
            setModalMode(null);
            setSelectedWorker(null);
            setFormError(null);
          }}
          title={
            modalMode === 'create' 
              ? 'Add New Worker' 
              : modalMode === 'edit' 
                ? 'Edit Worker' 
                : `${selectedWorker?.first_name} ${selectedWorker?.last_name}`
          }
          size="lg"
        >
          {formError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{formError}</p>
            </div>
          )}
          
          {modalMode === 'view' ? (
            selectedWorker && <WorkerDetail worker={selectedWorker} />
          ) : (
            <WorkerForm
              worker={modalMode === 'create' ? null : selectedWorker}
              onSubmit={modalMode === 'create' ? handleAddSubmit : handleEditSubmit}
              onCancel={() => {
                setModalMode(null);
                setSelectedWorker(null);
                setFormError(null);
              }}
              isSubmitting={isSubmitting}
            />
          )}
        </Modal>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setWorkerToDelete(null);
        }}
        onConfirm={handleDelete}
        title="Delete Worker"
        message={`Are you sure you want to delete ${workerToDelete?.first_name} ${workerToDelete?.last_name}? This action cannot be undone.`}
        confirmText="Delete"
        isLoading={isDeleting}
      />
    </div>
  );
}
