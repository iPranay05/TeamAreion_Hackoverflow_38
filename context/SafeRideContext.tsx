import React, { createContext, useContext, useState } from 'react';

export interface CabInfo {
  plateNumber: string;
  driverName: string;
}

export type EmergencyPhase = 'NONE' | 'CHECKING_IN' | 'ESCALATING_FAMILY' | 'ESCALATING_POLICE';

export type TripType = 'walking' | 'driving';

interface SafeRideState {
  isTripActive: boolean;
  tripType: TripType;
  cabInfo: CabInfo | null;
  expectedRoute: { latitude: number; longitude: number }[];
  destination: { latitude: number; longitude: number; name?: string } | null;
  emergencyPhase: EmergencyPhase;
  escalationTimer: number | null;
}

const SafeRideContext = createContext<{
  rideState: SafeRideState;
  startRide: (
    type: TripType, 
    route: { latitude: number; longitude: number }[], 
    dest: { latitude: number; longitude: number; name?: string } | null,
    info?: CabInfo | null
  ) => void;
  stopRide: () => void;
  setEmergencyPhase: (phase: EmergencyPhase) => void;
  setEscalationTimer: (timer: number | null) => void;
}>({
  rideState: { 
    isTripActive: false, 
    tripType: 'walking', 
    cabInfo: null, 
    expectedRoute: [], 
    destination: null,
    emergencyPhase: 'NONE',
    escalationTimer: null
  },
  startRide: () => {},
  stopRide: () => {},
  setEmergencyPhase: () => {},
  setEscalationTimer: () => {},
});

export function SafeRideProvider({ children }: { children: React.ReactNode }) {
  const [rideState, setRideState] = useState<SafeRideState>({
    isTripActive: false,
    tripType: 'walking',
    cabInfo: null,
    expectedRoute: [],
    destination: null,
    emergencyPhase: 'NONE',
    escalationTimer: null,
  });

  const startRide = (
    type: TripType, 
    route: { latitude: number; longitude: number }[], 
    dest: { latitude: number; longitude: number; name?: string } | null,
    info: CabInfo | null = null
  ) => {
    setRideState({
      isTripActive: true,
      tripType: type,
      cabInfo: info,
      expectedRoute: route,
      destination: dest,
      emergencyPhase: 'NONE',
      escalationTimer: null,
    });
  };

  const stopRide = () => {
    setRideState({
      isTripActive: false,
      tripType: 'walking',
      cabInfo: null,
      expectedRoute: [],
      destination: null,
      emergencyPhase: 'NONE',
      escalationTimer: null,
    });
  };

  const setEmergencyPhase = (phase: EmergencyPhase) => {
    setRideState(prev => ({ ...prev, emergencyPhase: phase }));
  };

  const setEscalationTimer = (timer: number | null) => {
    setRideState(prev => ({ ...prev, escalationTimer: timer }));
  };

  return (
    <SafeRideContext.Provider value={{ rideState, startRide, stopRide, setEmergencyPhase, setEscalationTimer }}>
      {children}
    </SafeRideContext.Provider>
  );
}

export const useSafeRide = () => useContext(SafeRideContext);
