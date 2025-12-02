import { Check, AlertCircle, X } from 'lucide-react';

type StaffingStatus = 'ready' | 'partial' | 'needs_workers';

interface StaffingStatusBadgeProps {
  status: StaffingStatus;
  showLabel?: boolean;
  showIcon?: boolean;
  size?: 'xs' | 'sm' | 'md';
  variant?: 'default' | 'solid';
}

export function StaffingStatusBadge({
  status,
  showLabel = true,
  showIcon = true,
  size = 'md',
  variant = 'default',
}: StaffingStatusBadgeProps) {
  const configs = {
    ready: {
      icon: Check,
      label: 'Ready',
      bgColor: variant === 'solid' ? 'bg-green-600' : 'bg-green-100',
      textColor: variant === 'solid' ? 'text-white' : 'text-green-700',
      borderColor: 'border-green-300',
      iconColor: variant === 'solid' ? 'text-white' : 'text-green-600',
    },
    partial: {
      icon: AlertCircle,
      label: 'Partial',
      bgColor: variant === 'solid' ? 'bg-yellow-600' : 'bg-yellow-100',
      textColor: variant === 'solid' ? 'text-white' : 'text-yellow-700',
      borderColor: 'border-yellow-300',
      iconColor: variant === 'solid' ? 'text-white' : 'text-yellow-600',
    },
    needs_workers: {
      icon: X,
      label: 'Needs Workers',
      bgColor: variant === 'solid' ? 'bg-red-600' : 'bg-red-50',
      textColor: variant === 'solid' ? 'text-white' : 'text-red-700',
      borderColor: 'border-red-200',
      iconColor: variant === 'solid' ? 'text-white' : 'text-red-600',
    },
  } as const;

  const sizeConfig = {
    xs: { icon: 'h-3 w-3', text: 'text-xs', padding: 'px-1.5 py-0.5', gap: 'gap-1' },
    sm: { icon: 'h-3.5 w-3.5', text: 'text-xs', padding: 'px-2 py-1', gap: 'gap-1.5' },
    md: { icon: 'h-4 w-4', text: 'text-sm', padding: 'px-2.5 py-1.5', gap: 'gap-2' },
  } as const;

  const config = configs[status];
  const Icon = config.icon;
  const s = sizeConfig[size];
  const showBorder = variant !== 'solid';

  return (
    <div
      className={[
        'inline-flex items-center rounded-md',
        config.bgColor,
        config.textColor,
        s.padding,
        s.gap,
        showBorder ? `border ${config.borderColor}` : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {showIcon && <Icon className={`${s.icon} ${config.iconColor} stroke-[2.5]`} />}
      {showLabel && (
        <span className={`font-medium ${s.text} whitespace-nowrap`}>
          {config.label}
        </span>
      )}
    </div>
  );
}


