import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Worker } from '../../hooks/useWorkers'

const workerSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone must be at least 10 digits'),
  status: z.enum(['active', 'inactive']),
  skills: z.string().min(1, 'At least one skill required'),
})

type WorkerFormData = z.infer<typeof workerSchema>

interface WorkerFormProps {
  worker?: Worker | null
  onSubmit: (data: any) => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
}

export function WorkerForm({ worker, onSubmit, onCancel, isSubmitting }: WorkerFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WorkerFormData>({
    resolver: zodResolver(workerSchema),
    defaultValues: worker
      ? {
          first_name: worker.first_name,
          last_name: worker.last_name,
          email: worker.email,
          phone: worker.phone,
          status: worker.status,
          skills: worker.skills_json.join(', '),
        }
      : {
          status: 'active',
        },
  })

  const onSubmitForm = async (data: WorkerFormData) => {
    // Convert skills string to array
    const skills_json = data.skills
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

    await onSubmit({
      ...data,
      skills_json,
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
      {/* Name Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
            First Name *
          </label>
          <input
            id="first_name"
            type="text"
            className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${errors.first_name ? 'border-red-500' : ''}`}
            {...register('first_name')}
          />
          {errors.first_name && (
            <p className="mt-1 text-sm text-red-600">{errors.first_name.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
            Last Name *
          </label>
          <input
            id="last_name"
            type="text"
            className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${errors.last_name ? 'border-red-500' : ''}`}
            {...register('last_name')}
          />
          {errors.last_name && (
            <p className="mt-1 text-sm text-red-600">{errors.last_name.message}</p>
          )}
        </div>
      </div>

      {/* Contact Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email *
          </label>
          <input
            id="email"
            type="email"
            className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${errors.email ? 'border-red-500' : ''}`}
            {...register('email')}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Phone *
          </label>
          <input
            id="phone"
            type="tel"
            placeholder="(555) 123-4567"
            className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${errors.phone ? 'border-red-500' : ''}`}
            {...register('phone')}
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
          )}
        </div>
      </div>

      {/* Skills */}
      <div>
        <label htmlFor="skills" className="block text-sm font-medium text-gray-700">
          Skills * (comma-separated)
        </label>
        <input
          id="skills"
          type="text"
          placeholder="Server, Bartender, Host"
          className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${errors.skills ? 'border-red-500' : ''}`}
          {...register('skills')}
        />
        <p className="mt-1 text-sm text-gray-500">
          Enter skills separated by commas (e.g., Server, Bartender, Host)
        </p>
        {errors.skills && (
          <p className="mt-1 text-sm text-red-600">{errors.skills.message}</p>
        )}
      </div>

      {/* Status */}
      <div>
        <label htmlFor="status" className="block text-sm font-medium text-gray-700">
          Status
        </label>
        <select 
          id="status" 
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" 
          {...register('status')}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          Cancel
        </button>
        <button 
          type="submit" 
          disabled={isSubmitting} 
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isSubmitting ? (
            <span className="flex items-center">
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Saving...
            </span>
          ) : worker ? (
            'Update Worker'
          ) : (
            'Add Worker'
          )}
        </button>
      </div>
    </form>
  )
}
