export interface Thermostat {
  currentTemp: number;
  maxTemp: number;
  message?: string;
  fanOn?: boolean;
}
