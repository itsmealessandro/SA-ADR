import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useNotificationStore } from '../../stores';
import { NotificationItem } from './NotificationItem';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { notifications, markAsRead, markAllAsRead } = useNotificationStore();

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-96 max-h-[600px] bg-white rounded-lg shadow-xl border border-gray-200 z-[1000] flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
        <div className="flex items-center gap-2">
          {notifications.length > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
            >
              Mark all as read
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            aria-label="Close notifications"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Notification List */}
      <div className="flex-1 overflow-y-auto p-4">
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No notifications</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification._id}
                notification={notification}
                onMarkAsRead={(id) => markAsRead([id])}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
