import React, { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import type { Worker } from '../../hooks/useWorkers'

interface Certification {
  id: number
  name: string
}

interface WorkerFormProps {
  worker?: Worker | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  title: string
}

interface FormData {
  first_name: string
  last_name: string
  email: string
  phone: string
  status: 'active' | 'inactive'
  skills_json: string[]
  certification_ids: number[]
}

export function WorkerForm({ worker, isOpen, onClose, onSuccess, title }: WorkerFormProps) {
  const [formData, setFormData] = useState<FormData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    status: 'active',
    skills_json: [],
    certification_ids: [],
  })
  const [availableCertifications, setAvailableCertifications] = useState<Certification[]>([])
  const [skillsInput, setSkillsInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load available certifications
  useEffect(() => {
    const loadCertifications = async () => {
      try {
        const response = await api.getCertifications()
        if (response.status === 'success') {
          setAvailableCertifications(response.data)
        }
      } catch (err) {
        console.error('Failed to load certifications:', err)
      }
    }
    
    if (isOpen) {
      loadCertifications()
    }
  }, [isOpen])

  // Initialize form data when worker changes
  useEffect(() => {
    if (worker) {
      setFormData({
        first_name: worker.first_name,
        last_name: worker.last_name,
        email: worker.email,
        phone: worker.phone,
        status: worker.status,
        skills_json: worker.skills_json || [],
        certification_ids: worker.certifications?.map(c => c.id) || [],
      })
      setSkillsInput((worker.skills_json || []).join(', '))
    } else {
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        status: 'active',
        skills_json: [],
        certification_ids: [],
      })
      setSkillsInput('')
    }
    setError(null)
  }, [worker, isOpen])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSkillsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSkillsInput(value)
    
    // Parse skills from comma-separated input
    const skills = value
      .split(',')
      .map(skill => skill.trim())
      .filter(skill => skill.length > 0)
    
    setFormData(prev => ({ ...prev, skills_json: skills }))
  }

  const handleCertificationChange = (certId: number, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      certification_ids: checked
        ? [...prev.certification_ids, certId]
        : prev.certification_ids.filter(id => id !== certId)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      if (worker) {
        await api.updateWorker(worker.id, formData)
      } else {
        await api.createWorker(formData)
      }
      
      onSuccess()
      onClose()
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to save worker'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
                  First Name *
                </label>
                <input
                  type="text"
                  id="first_name"
                  name="first_name"
                  required
                  value={formData.first_name}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
                  Last Name *
                </label>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  required
                  value={formData.last_name}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone *
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                Status *
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label htmlFor="skills" className="block text-sm font-medium text-gray-700">
                Skills
              </label>
              <input
                type="text"
                id="skills"
                value={skillsInput}
                onChange={handleSkillsChange}
                placeholder="Enter skills separated by commas (e.g., cooking, serving, cleaning)"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              <p className="mt-1 text-sm text-gray-500">
                Separate multiple skills with commas
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Certifications
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-md p-3">
                {availableCertifications.map((cert) => (
                  <label key={cert.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.certification_ids.includes(cert.id)}
                      onChange={(e) => handleCertificationChange(cert.id, e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">{cert.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : worker ? 'Update Worker' : 'Create Worker'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
