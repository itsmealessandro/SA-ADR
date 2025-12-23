import { create } from 'zustand';
import type { Notification } from '../types';

interface NotificationStore {
  // State
  notifications: Notification[];
  unreadCount: number;
  lastPollTimestamp: string | null;
  isLoading: boolean;
  error: Error | null;
  
  // Actions
  addNotifications: (notifications: Notification[]) => void;
  markAsRead: (notificationIds: string[]) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  setLastPollTimestamp: (timestamp: string) => void;
  setError: (error: Error | null) => void;
  setLoading: (isLoading: boolean) => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  // Initial state
  notifications: [
    // {
    //   _id: '1',
    //   message: "High pollution levels detected in District Roio.",
    //   timestamp: new Date().toISOString(),
    //   read: false,
    //   severity: "warning",
    //   source: "Risk Detector",
    //   title: "Pollution Alert",
    // },
    // {
    //   _id: '2',
    //   source: "Recommendation Manager",
    //   title: "Energy Saving Tip",
    //   message: "Consider reducing street lighting in low-traffic areas to save energy.",
    //   timestamp: new Date().toISOString(),
    //   read: true,
    //   severity: "info",
    // },
    // {
    //   _id: '3',
    //   source: "Risk Detector",
    //   severity: "critical",
    //   title: "Severe Weather Warning",
    //   message: "A severe thunderstorm is approaching District Centro. Take necessary precautions.",
    //   timestamp: new Date().toISOString(),
    //   read: false,
    // }
  ],
  unreadCount: 0,
  lastPollTimestamp: null,
  isLoading: false,
  error: null,

  // Add new notifications (prepend to avoid duplicates)
  addNotifications: (newNotifications: Notification[]) => {
    const { notifications } = get();
    const existingIds = new Set(notifications.map(n => n._id));
    
    // Filter out duplicates
    const uniqueNew = newNotifications.filter(n => !existingIds.has(n._id));
    
    if (uniqueNew.length === 0) {
      return;
    }

    // Prepend new notifications and sort by timestamp (newest first)
    const updated = [...uniqueNew, ...notifications].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Calculate unread count
    const unreadCount = updated.filter(n => !n.read).length;

    set({
      notifications: updated,
      unreadCount,
    });
  },

  // Mark specific notifications as read
  markAsRead: (notificationIds: string[]) => {
    const { notifications } = get();
    const idSet = new Set(notificationIds);
    
    const updated = notifications.map(n =>
      idSet.has(n._id) ? { ...n, read: true } : n
    );
    
    const unreadCount = updated.filter(n => !n.read).length;

    set({
      notifications: updated,
      unreadCount,
    });
  },

  // Mark all notifications as read
  markAllAsRead: () => {
    const { notifications } = get();
    const updated = notifications.map(n => ({ ...n, read: true }));
    
    set({
      notifications: updated,
      unreadCount: 0,
    });
  },

  // Clear all notifications
  clearNotifications: () => {
    set({
      notifications: [],
      unreadCount: 0,
    });
  },

  // Update the last poll timestamp
  setLastPollTimestamp: (timestamp: string) => {
    set({ lastPollTimestamp: timestamp });
  },

  // Set error state
  setError: (error: Error | null) => {
    set({ error });
  },

  // Set loading state
  setLoading: (isLoading: boolean) => {
    set({ isLoading });
  },
}));
