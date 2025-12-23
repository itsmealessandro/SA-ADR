import { AlertCircle, AlertTriangle, ChevronDown, ChevronUp, Info, XCircle } from 'lucide-react';
import { useState } from 'react';
import type { Notification, NotificationSeverity as NotificationSeverityType } from '../../types';
import { NotificationSeverity } from '../../types';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead?: (id: string) => void;
}

const severityConfig: Record<NotificationSeverityType, { 
  icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
  iconColor: string;
  borderColor: string;
}> = {
  [NotificationSeverity.INFO]: {
    icon: Info,
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-600',
    borderColor: 'border-blue-200',
  },
  [NotificationSeverity.WARNING]: {
    icon: AlertTriangle,
    bgColor: 'bg-yellow-50',
    iconColor: 'text-yellow-600',
    borderColor: 'border-yellow-200',
  },
  [NotificationSeverity.ERROR]: {
    icon: XCircle,
    bgColor: 'bg-red-50',
    iconColor: 'text-red-600',
    borderColor: 'border-red-200',
  },
  [NotificationSeverity.CRITICAL]: {
    icon: AlertCircle,
    bgColor: 'bg-purple-50',
    iconColor: 'text-purple-600',
    borderColor: 'border-purple-200',
  },
};

export function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = severityConfig[notification.severity];
  const Icon = config.icon;

  const handleClick = () => {
    setIsExpanded(!isExpanded);
    if (!notification.read && onMarkAsRead) {
      onMarkAsRead(notification._id);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div
      className={`
        border-l-4 ${config.borderColor} ${config.bgColor}
        p-4 mb-2 rounded-r-lg cursor-pointer
        transition-all hover:shadow-md
        ${!notification.read ? 'font-semibold' : ''}
      `}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm text-gray-900 truncate">{notification.title}</h4>
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {formatTimestamp(notification.timestamp)}
            </span>
          </div>
          
          <p className="text-sm text-gray-700 mt-1 line-clamp-2">
            {notification.message}
          </p>
          
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
            {/* <span className="px-2 py-0.5 bg-white rounded-full border border-gray-200">
              {notification.type}
            </span> */}
            {notification.source && (
              <span className="px-2 py-0.5 bg-white rounded-full border border-gray-200">
                {notification.source}
              </span>
            )}
          </div>

          {isExpanded && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {notification.message}
              </p>
              
              {/* {notification.districtId && (
                <p className="text-xs text-gray-500 mt-2">
                  <strong>District:</strong> {notification.districtId}
                </p>
              )}
              
              {notification.entityId && (
                <p className="text-xs text-gray-500">
                  <strong>Entity:</strong> {notification.entityType} - {notification.entityId}
                </p>
              )}
              
              {notification.data && Object.keys(notification.data).length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                    Additional Data
                  </summary>
                  <pre className="text-xs bg-white p-2 rounded mt-1 overflow-x-auto">
                    {JSON.stringify(notification.data, null, 2)}
                  </pre>
                </details>
              )} */}
            </div>
          )}
        </div>
        
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
      </div>
    </div>
  );
}
