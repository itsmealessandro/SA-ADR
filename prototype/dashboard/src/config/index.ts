export const config = {
  // State Manager API
  stateManagerUrl: import.meta.env.VITE_STATE_MANAGER_API_URL || 'http://localhost:3000',
  stateManagerWsUrl: import.meta.env.VITE_STATE_MANAGER_WS_URL || 'ws://localhost:3001',
  
  // Notification Manager API
  notificationManagerUrl: import.meta.env.VITE_NOTIFICATION_MANAGER_API_URL || 'http://localhost:3002/api',
  
  // Polling intervals (milliseconds)
  notificationPollInterval: 5000, // 5 seconds
  
  // Map configuration
  map: {
    center: {
      lat: 42.3498, // L'Aquila center
      lng: 13.3995,
    },
    zoom: 13,
    minZoom: 4,
    maxZoom: 24,
  },
  
  // Feature flags
  features: {
    enableWebSocket: true,
    enableNotifications: true,
    enableRouting: true,
  },
} as const;

export type Config = typeof config;
