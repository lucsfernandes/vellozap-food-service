/** Domain model mirroring `employee_work_records`. `workDate` is an ISO date (YYYY-MM-DD). */
export interface WorkRecord {
  id: string;
  employeeId: string;
  workDate: string;
  hoursWorked: number | null;
  daysWorked: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewWorkRecord {
  employeeId: string;
  workDate: string;
  hoursWorked?: number | null;
  daysWorked?: number | null;
}
