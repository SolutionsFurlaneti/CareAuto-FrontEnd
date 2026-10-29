import { registerPlugin } from '@capacitor/core';

export interface NativeAgentStatus {
  running: boolean;
  deviceId: string;
  supported: boolean;
  model: string;
}

export interface NativePrintAgentPlugin {
  getDeviceId(): Promise<{ deviceId: string }>;
  getStatus(): Promise<NativeAgentStatus>;
  start(options: { apiUrl: string; token: string }): Promise<NativeAgentStatus>;
  stop(): Promise<void>;
}

export const nativePrintAgent =
  registerPlugin<NativePrintAgentPlugin>('AndroidPrintAgent');