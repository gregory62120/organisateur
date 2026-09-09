export interface LogSource {
  id: string;
  name: string;
  path: string;
}

export interface AppConfig {
  logSources: LogSource[];
  applications: string[];
}
