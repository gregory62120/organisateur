export interface GanttTask {
  id: string;

  title: string;

  start: Date;

  end: Date;

  progress: number;

  dependencies: string[];
}
