export type ReportPeriodMode = "monthly" | "three-months" | "six-months" | "yearly";
export type ReportPeriodSelection = { mode: ReportPeriodMode; month: number; year: number };
export type ReportPeriodRange = {
  start: string;
  end: string;
  startMonth: string;
  endMonth: string;
  months: string[];
  label: string;
};
export function getReportPeriodRange(selection: ReportPeriodSelection): ReportPeriodRange;
export function getDefaultReportPeriod(now?: Date): ReportPeriodSelection;
