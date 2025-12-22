import { Activity, AlertTriangle, Ambulance, BarChart2, Building2, CheckCircle, Info, Lock, Map, MapPin, Play, Power, Shield, Siren, TrendingUp, User, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SimulationDashboardProps {
    isOpen: boolean;
    onClose: () => void;
}

type Tab = 'simulation' | 'emergency' | 'buildings';
type UserRole = 'operator' | 'manager';
type EventType = 'closure' | 'transport' | 'weather' | 'seismic';
type RoadStatus = 'critical' | 'improving' | 'stable';
type FloorStatus = 'normal' | 'evacuating' | 'power-save' | 'lockdown';

// --- L'AQUILA DATA ---
const AQUILA_LOCATIONS = [
    "Piazza Duomo (Centro Storico)",
    "Corso Vittorio Emanuele",
    "Fontana Luminosa",
    "Viale della Croce Rossa",
    "Via Strinella",
    "SS17 (Ingresso Ovest)",
    "Terminal Bus Collemaggio",
    "Stazione Ferroviaria",
    "Viale Gran Sasso"
];

const AQUILA_BUILDINGS = [
    { name: "Ospedale San Salvatore", type: "Healthcare", district: "Coppito", occupancy: 85, status: "Operational", floors: 6 },
    { name: "Palazzo dell'Emiciclo", type: "Government", district: "Centro", occupancy: 60, status: "Operational", floors: 3 },
    { name: "Università (Polo Coppito)", type: "Education", district: "Coppito", occupancy: 92, status: "Operational", floors: 4 },
    { name: "Università (Polo Roio)", type: "Education", district: "Roio", occupancy: 45, status: "Maintenance", floors: 3 },
    { name: "Forte Spagnolo", type: "Culture", district: "Centro", occupancy: 20, status: "Operational", floors: 2 },
    { name: "Basilica di Collemaggio", type: "Culture", district: "Collemaggio", occupancy: 15, status: "Operational", floors: 1 },
    { name: "Prefettura (Sede Provvisoria)", type: "Government", district: "Centro", occupancy: 70, status: "Operational", floors: 4 },
    { name: "Casa dello Studente (Nuova)", type: "Residential", district: "Pettino", occupancy: 95, status: "Operational", floors: 5 }
];

const AQUILA_DISTRICTS = [
    { name: "Centro Storico", status: "Moderate", score: 78, trend: "stable" },
    { name: "Coppito", status: "Good", score: 92, trend: "up" },
    { name: "Pettino", status: "Good", score: 88, trend: "up" },
    { name: "Paganica", status: "Warning", score: 65, trend: "down" },
    { name: "Roio", status: "Good", score: 90, trend: "stable" }
];

const EMERGENCY_ASSETS = [
    { name: "Ospedale San Salvatore", type: "Hospital", capacity: 400, occupied: 340, status: "Accessible", eta: "8 min" },
    { name: "Clinica Villa Letizia", type: "Clinic", capacity: 120, occupied: 45, status: "Accessible", eta: "12 min" },
    { name: "Caserma Alpini 'Pasquali'", type: "Military", capacity: "N/A", occupied: "Active", status: "Standby", eta: "15 min" },
    { name: "Eliporto San Salvatore", type: "Heliport", capacity: 2, occupied: 0, status: "Operational", eta: "N/A" },
    { name: "Vigili del Fuoco (Sede Centrale)", type: "Fire Station", capacity: "12 Units", occupied: "4 Active", status: "Operational", eta: "6 min" }
];

// Simple Toast Component
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'info', onClose: () => void }) => (
    <div className={`fixed bottom-6 right-6 p-4 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-right duration-300 z-[70] ${type === 'success' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'
        }`}>
        {type === 'success' ? <CheckCircle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
        <p className="font-medium">{message}</p>
        <button onClick={onClose} className="ml-2 hover:bg-white/20 rounded p-1">
            <X className="w-4 h-4" />
        </button>
    </div>
);

// Confirmation Modal
const ConfirmationModal = ({ action, details, onConfirm, onCancel }: { action: string, details?: string, onConfirm: () => void, onCancel: () => void }) => (
    <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border-t-4 border-red-600">
            <div className="flex items-center gap-3 mb-4 text-red-600">
                <AlertTriangle className="w-8 h-8" />
                <h3 className="text-xl font-bold">Confirm Action</h3>
            </div>
            <p className="text-slate-600 mb-2">
                Are you sure you want to execute <strong>{action}</strong>?
            </p>
            {details && <p className="text-slate-500 text-sm mb-6">{details}</p>}
            {!details && <p className="text-slate-500 text-sm mb-6">This action will be logged and may mobilize emergency resources.</p>}

            <div className="flex justify-end gap-3">
                <button onClick={onCancel} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">
                    Cancel
                </button>
                <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-200">
                    Confirm Execution
                </button>
            </div>
        </div>
    </div>
);

export function SimulationDashboard({ isOpen, onClose }: SimulationDashboardProps) {
    const [activeTab, setActiveTab] = useState<Tab>('simulation');
    const [userRole, setUserRole] = useState<UserRole>('operator');

    // Simulation State
    const [eventType, setEventType] = useState<EventType>('closure');
    const [selectedLocation, setSelectedLocation] = useState(AQUILA_LOCATIONS[0]);
    const [isSimulating, setIsSimulating] = useState(false);
    const [simulationResult, setSimulationResult] = useState<null | {
        delay: number;
        impact: string;
        routes: number;
    }>(null);
    const [roadStatus, setRoadStatus] = useState<RoadStatus>('critical');
    const [deployedUnits, setDeployedUnits] = useState(false);

    // Building State
    const [selectedBuilding, setSelectedBuilding] = useState(AQUILA_BUILDINGS[0]);
    const [floors, setFloors] = useState<FloorStatus[]>(Array(AQUILA_BUILDINGS[0].floors).fill('normal'));

    // Notification & Modal State
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'info' } | null>(null);
    const [pendingAction, setPendingAction] = useState<{ name: string, details?: string, type: 'strategic' | 'building' } | null>(null);

    // Update floors when building changes
    useEffect(() => {
        setFloors(Array(selectedBuilding.floors).fill('normal'));
    }, [selectedBuilding]);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    if (!isOpen) return null;

    const handleRunSimulation = () => {
        setIsSimulating(true);
        setSimulationResult(null);
        setRoadStatus('critical');
        setDeployedUnits(false);

        setTimeout(() => {
            setIsSimulating(false);
            if (eventType === 'closure') {
                setSimulationResult({ delay: 18, impact: 'High', routes: 3 });
            } else if (eventType === 'weather') {
                setSimulationResult({ delay: 45, impact: 'Severe', routes: 0 });
            } else if (eventType === 'seismic') {
                setSimulationResult({ delay: 120, impact: 'Critical', routes: 1 });
            } else {
                setSimulationResult({ delay: 12, impact: 'Moderate', routes: 2 });
            }
        }, 1500);
    };

    const initiateStrategicAction = (actionName: string) => {
        setPendingAction({
            name: actionName,
            details: "This will mobilize significant city resources and alert national authorities.",
            type: 'strategic'
        });
    };

    const initiateBuildingAction = (action: 'Evacuate' | 'Power' | 'Lockdown') => {
        setPendingAction({
            name: `${action} ${selectedBuilding.name}`,
            details: `This will trigger ${action.toLowerCase()} protocols for all ${selectedBuilding.floors} floors of ${selectedBuilding.name}.`,
            type: 'building'
        });
    };

    const confirmAction = () => {
        if (pendingAction) {
            setToast({ message: `${pendingAction.name} Initiated Successfully`, type: 'success' });

            if (pendingAction.type === 'strategic' && pendingAction.name.includes("Deploy")) {
                setDeployedUnits(true);
                setRoadStatus('improving');
            }

            if (pendingAction.type === 'building') {
                if (pendingAction.name.includes("Evacuate")) {
                    setFloors(prev => prev.map(() => 'evacuating'));
                } else if (pendingAction.name.includes("Power")) {
                    setFloors(prev => prev.map(s => s === 'evacuating' ? s : 'power-save'));
                } else if (pendingAction.name.includes("Lockdown")) {
                    setFloors(prev => prev.map(() => 'lockdown'));
                }
            }

            setPendingAction(null);
        }
    };

    // --- CITY MANAGER VIEW ---
    const CityManagerView = () => (
        <div className="space-y-6">
            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-sm text-slate-500 font-medium">City Health Score</p>
                    <div className="flex items-end gap-2 mt-1">
                        <span className="text-3xl font-bold text-slate-800">84</span>
                        <span className="text-sm text-green-600 font-bold mb-1">/ 100</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                        <div className="bg-green-500 h-full rounded-full" style={{ width: '84%' }}></div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-sm text-slate-500 font-medium">Active Incidents</p>
                    <div className="flex items-end gap-2 mt-1">
                        <span className="text-3xl font-bold text-orange-600">3</span>
                        <span className="text-sm text-slate-400 mb-1">Low Priority</span>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-sm text-slate-500 font-medium">Available Units</p>
                    <div className="flex items-end gap-2 mt-1">
                        <span className="text-3xl font-bold text-blue-600">12</span>
                        <span className="text-sm text-slate-400 mb-1">/ 15 Total</span>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-sm text-slate-500 font-medium">Avg Response Time</p>
                    <div className="flex items-end gap-2 mt-1">
                        <span className="text-3xl font-bold text-slate-800">6.5</span>
                        <span className="text-sm text-slate-400 mb-1">min</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* District Status */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Map className="w-5 h-5 text-indigo-600" />
                        District Status Overview
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {AQUILA_DISTRICTS.map((d) => (
                            <div key={d.name} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                                <div>
                                    <p className="font-bold text-slate-800">{d.name}</p>
                                    <p className={`text-xs font-medium ${d.status === 'Good' ? 'text-green-600' :
                                            d.status === 'Warning' ? 'text-orange-600' : 'text-yellow-600'
                                        }`}>{d.status} Condition</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-bold text-slate-700">{d.score}</p>
                                    <p className="text-xs text-slate-400 flex items-center justify-end gap-1">
                                        {d.trend === 'up' ? <TrendingUp className="w-3 h-3 text-green-500" /> :
                                            d.trend === 'down' ? <TrendingUp className="w-3 h-3 text-red-500 rotate-180" /> :
                                                <Activity className="w-3 h-3 text-slate-400" />}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Strategic Actions */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-red-600" />
                        Strategic Command
                    </h3>
                    <div className="space-y-3">
                        <button onClick={() => initiateStrategicAction("City State of Emergency")} className="w-full p-3 bg-red-50 border border-red-200 rounded-lg text-left hover:bg-red-100 transition-colors group">
                            <p className="font-bold text-red-800 text-sm group-hover:text-red-900">Declare State of Emergency</p>
                            <p className="text-xs text-red-600 mt-1">Mobilize all city resources</p>
                        </button>
                        <button onClick={() => initiateStrategicAction("Regional Support Request")} className="w-full p-3 bg-blue-50 border border-blue-200 rounded-lg text-left hover:bg-blue-100 transition-colors group">
                            <p className="font-bold text-blue-800 text-sm group-hover:text-blue-900">Request Regional Support</p>
                            <p className="text-xs text-blue-600 mt-1">Contact Abruzzo Civil Protection</p>
                        </button>
                        <button onClick={() => initiateStrategicAction("ZTL Emergency Protocol")} className="w-full p-3 bg-orange-50 border border-orange-200 rounded-lg text-left hover:bg-orange-100 transition-colors group">
                            <p className="font-bold text-orange-800 text-sm group-hover:text-orange-900">Activate ZTL Emergency Protocol</p>
                            <p className="text-xs text-orange-600 mt-1">Open all restricted zones</p>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-lg">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Emergency Decision Support System</h2>
                            <p className="text-slate-400 text-sm">UDT-EM Advanced Module • L'Aquila Pilot</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">✕</button>
                </div>

                {/* Controls */}
                <div className="bg-slate-100 px-6 py-3 border-b border-slate-200 flex justify-between items-center flex-wrap gap-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <User className="w-4 h-4" />
                        <span>Viewing as:</span>
                        <select
                            value={userRole}
                            onChange={(e) => setUserRole(e.target.value as UserRole)}
                            className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="operator">District Operator</option>
                            <option value="manager">City Manager</option>
                        </select>
                    </div>

                    {userRole === 'operator' && (
                        <div className="flex gap-2">
                            {(['simulation', 'emergency', 'buildings'] as Tab[]).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${activeTab === tab ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    {tab === 'simulation' ? 'Simulation Engine' : tab === 'emergency' ? 'Emergency Response' : 'Critical Buildings'}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 bg-slate-50">

                    {userRole === 'manager' ? (
                        <CityManagerView />
                    ) : (
                        <>
                            {/* OPERATOR: SIMULATION TAB */}
                            {activeTab === 'simulation' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Config */}
                                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                                <Play className="w-5 h-5 text-blue-600" />
                                                Scenario Configuration
                                            </h3>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Event Type</label>
                                                    <select
                                                        value={eventType}
                                                        onChange={(e) => setEventType(e.target.value as EventType)}
                                                        className="w-full border border-slate-300 rounded-lg px-3 py-2"
                                                    >
                                                        <option value="closure">Road Closure / Blockage</option>
                                                        <option value="transport">Public Transport Failure</option>
                                                        <option value="weather">Severe Weather / Flooding</option>
                                                        <option value="seismic">Seismic Event (Simulation)</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                                                    <select
                                                        value={selectedLocation}
                                                        onChange={(e) => setSelectedLocation(e.target.value)}
                                                        className="w-full border border-slate-300 rounded-lg px-3 py-2"
                                                    >
                                                        {AQUILA_LOCATIONS.map(loc => (
                                                            <option key={loc} value={loc}>{loc}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <button
                                                    onClick={handleRunSimulation}
                                                    disabled={isSimulating}
                                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 mt-4"
                                                >
                                                    {isSimulating ? 'Running Simulation...' : 'Run Impact Analysis'}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Results */}
                                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                                <BarChart2 className="w-5 h-5 text-purple-600" />
                                                Predicted Impact
                                            </h3>

                                            {!simulationResult ? (
                                                <div className="h-full flex flex-col items-center justify-center text-slate-400 min-h-[200px]">
                                                    <MapPin className="w-12 h-12 mb-2 opacity-20" />
                                                    <p>Run a simulation to see impact analysis</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-6 animate-in fade-in duration-500">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                                                            <p className="text-sm text-red-600 font-medium">Hospital Access Delay</p>
                                                            <p className="text-2xl font-bold text-red-700">+{simulationResult.delay} min</p>
                                                        </div>
                                                        <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                                                            <p className="text-sm text-orange-600 font-medium">Congestion Impact</p>
                                                            <p className="text-2xl font-bold text-orange-700">{simulationResult.impact}</p>
                                                        </div>
                                                    </div>

                                                    {/* Road Status Infographic */}
                                                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                                        <p className="text-sm font-medium text-slate-700 mb-2">Real-time Road Status: {selectedLocation}</p>
                                                        <div className="flex gap-1 h-4 mb-2">
                                                            {[...Array(10)].map((_, i) => (
                                                                <div key={i} className={`flex-1 rounded-sm transition-colors duration-500 ${roadStatus === 'critical' ? (i < 8 ? 'bg-red-500' : 'bg-red-300') :
                                                                        roadStatus === 'improving' ? (i < 5 ? 'bg-yellow-500' : 'bg-green-500') :
                                                                            'bg-green-500'
                                                                    }`}></div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <h4 className="font-medium text-slate-700 mb-2">Recommended Actions</h4>
                                                        <ul className="space-y-3">
                                                            <li className="flex items-center justify-between gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded">
                                                                <div className="flex items-start gap-2">
                                                                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold mt-0.5">ACTION</span>
                                                                    <span>Deploy Traffic Unit to {selectedLocation}</span>
                                                                </div>
                                                                <button
                                                                    onClick={() => initiateStrategicAction("Traffic Unit Deployment")}
                                                                    disabled={deployedUnits}
                                                                    className={`text-xs px-2 py-1 rounded transition-colors ${deployedUnits ? 'bg-green-100 text-green-700 cursor-default' : 'bg-blue-600 text-white hover:bg-blue-700'
                                                                        }`}
                                                                >
                                                                    {deployedUnits ? 'Deployed' : 'Deploy'}
                                                                </button>
                                                            </li>
                                                            <li className="flex items-center justify-between gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded">
                                                                <div className="flex items-start gap-2">
                                                                    <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-bold mt-0.5">ACTION</span>
                                                                    <span>Reroute Public Transport (AMA Line 1)</span>
                                                                </div>
                                                                <button onClick={() => initiateStrategicAction("AMA Rerouting")} className="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700">Execute</button>
                                                            </li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* OPERATOR: EMERGENCY TAB */}
                            {activeTab === 'emergency' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 col-span-2">
                                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                                <Ambulance className="w-5 h-5 text-red-600" />
                                                Critical Infrastructure Accessibility
                                            </h3>

                                            <div className="space-y-4">
                                                {EMERGENCY_ASSETS.map((asset) => (
                                                    <div key={asset.name} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-2 h-2 rounded-full ${asset.status === 'Accessible' || asset.status === 'Operational' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                                                            <div>
                                                                <p className="font-bold text-slate-800">{asset.name}</p>
                                                                <p className="text-xs text-slate-500">{asset.type} • {typeof asset.occupied === 'number' ? `${asset.occupied}/${asset.capacity} Occupied` : asset.occupied}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className={`text-sm font-bold ${asset.status === 'Accessible' || asset.status === 'Operational' ? 'text-green-700' : 'text-yellow-700'}`}>{asset.status}</p>
                                                            <p className="text-xs text-slate-500">ETA: {asset.eta}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                                <AlertTriangle className="w-5 h-5 text-orange-600" />
                                                Active Alerts
                                            </h3>
                                            <div className="space-y-3">
                                                <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
                                                    <p className="text-xs font-bold text-red-800 mb-1">HIGH PRIORITY</p>
                                                    <p className="text-sm text-red-700">Congestion detected on SS17.</p>
                                                    <p className="text-xs text-red-500 mt-2">2 mins ago</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* OPERATOR: BUILDINGS TAB */}
                            {activeTab === 'buildings' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                                <Building2 className="w-5 h-5 text-indigo-600" />
                                                Critical Buildings Management
                                            </h3>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="border-b border-slate-200">
                                                            <th className="p-3 text-sm font-bold text-slate-600">Building Name</th>
                                                            <th className="p-3 text-sm font-bold text-slate-600">District</th>
                                                            <th className="p-3 text-sm font-bold text-slate-600">Status</th>
                                                            <th className="p-3 text-sm font-bold text-slate-600 text-right">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {AQUILA_BUILDINGS.map((b) => (
                                                            <tr
                                                                key={b.name}
                                                                className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${selectedBuilding.name === b.name ? 'bg-blue-50/50' : ''}`}
                                                                onClick={() => setSelectedBuilding(b)}
                                                            >
                                                                <td className="p-3">
                                                                    <div className="font-medium text-slate-800">{b.name}</div>
                                                                    <div className="text-xs text-slate-500">{b.type}</div>
                                                                </td>
                                                                <td className="p-3 text-sm text-slate-600">{b.district}</td>
                                                                <td className="p-3">
                                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${b.status === 'Operational' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                                                        }`}>
                                                                        {b.status}
                                                                    </span>
                                                                </td>
                                                                <td className="p-3 text-right space-x-2">
                                                                    <button onClick={(e) => { e.stopPropagation(); initiateBuildingAction('Evacuate'); }} className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200">Evacuate</button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                                <Users className="w-5 h-5 text-slate-600" />
                                                Live Status: {selectedBuilding.name}
                                            </h3>
                                            <div className="flex flex-col-reverse gap-2 p-4 bg-slate-50 rounded-lg border border-slate-200 h-[300px] justify-end overflow-y-auto">
                                                {floors.map((status, i) => (
                                                    <div key={i} className={`w-full p-3 rounded border flex items-center justify-between transition-all duration-500 ${status === 'evacuating' ? 'bg-red-100 border-red-300 animate-pulse' :
                                                            status === 'power-save' ? 'bg-yellow-100 border-yellow-300' :
                                                                status === 'lockdown' ? 'bg-slate-800 border-slate-900 text-white' :
                                                                    'bg-white border-slate-300'
                                                        }`}>
                                                        <span className={`text-sm font-bold ${status === 'lockdown' ? 'text-slate-200' : 'text-slate-600'}`}>Floor {i + 1}</span>
                                                        <span className="text-xs font-medium uppercase">{status}</span>
                                                    </div>
                                                ))}
                                                <div className="text-center text-xs text-slate-400 mt-2">Ground Floor</div>
                                            </div>
                                            <div className="mt-4 grid grid-cols-2 gap-2">
                                                <button onClick={() => initiateBuildingAction('Lockdown')} className="col-span-2 w-full py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-900 flex items-center justify-center gap-2">
                                                    <Lock className="w-4 h-4" /> Lockdown Building
                                                </button>
                                                <button onClick={() => initiateBuildingAction('Power')} className="col-span-2 w-full py-2 bg-orange-600 text-white rounded-lg text-sm font-bold hover:bg-orange-700 flex items-center justify-center gap-2">
                                                    <Power className="w-4 h-4" /> Emergency Power
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-slate-50 p-4 border-t border-slate-200 text-center text-xs text-slate-400">
                    SA-ADR Prototype • Emergency Decision Support Module • v0.6.0-mockup
                </div>

                {/* Toast Notification */}
                {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

                {/* Confirmation Modal */}
                {pendingAction && (
                    <ConfirmationModal
                        action={pendingAction.name}
                        details={pendingAction.details}
                        onConfirm={confirmAction}
                        onCancel={() => setPendingAction(null)}
                    />
                )}
            </div>
        </div>
    );
}
