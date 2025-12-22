import { Activity, Wifi, WifiOff } from 'lucide-react';
import { useState } from 'react';
import { useWebSocketStore } from '../../stores';
import { NotificationBell, NotificationPanel } from '../notifications';
import { SimulationDashboard } from '../features/SimulationDashboard';

export function Header() {
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [isSimulationOpen, setIsSimulationOpen] = useState(false);
  const connectionState = useWebSocketStore((state) => state.connectionState);

  const handleBellClick = () => {
    setIsNotificationPanelOpen(!isNotificationPanelOpen);
  };

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                L'Aquila Digital Twin
              </h1>
              <p className="text-xs text-gray-500">Real-time City Monitoring</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Simulation & Planning Button */}
            <button
              onClick={() => setIsSimulationOpen(true)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
            >
              <Activity className="w-4 h-4" />
              <span className="text-sm font-medium">Simulation & Planning</span>
            </button>

            <div className="h-6 w-px bg-gray-200 mx-1"></div>

            {/* WebSocket Connection Status */}
            <div className="flex items-center gap-2">
              {connectionState === 'connected' ? (
                <>
                  <Wifi className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-gray-600">Live</span>
                </>
              ) : connectionState === 'connecting' ? (
                <>
                  <Wifi className="w-5 h-5 text-yellow-600 animate-pulse" />
                  <span className="text-sm text-gray-600">Connecting...</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-5 h-5 text-red-600" />
                  <span className="text-sm text-gray-600">Disconnected</span>
                </>
              )}
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <NotificationBell onClick={handleBellClick} />
              <NotificationPanel
                isOpen={isNotificationPanelOpen}
                onClose={() => setIsNotificationPanelOpen(false)}
              />
            </div>
          </div>
        </div>
      </header>

      <SimulationDashboard
        isOpen={isSimulationOpen}
        onClose={() => setIsSimulationOpen(false)}
      />
    </>
  );
}
