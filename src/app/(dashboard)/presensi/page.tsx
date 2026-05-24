import { AttendanceClient } from "./attendance-client";
import { MonthlyAttendanceRecap } from "./monthly-recap";

export default function PresensiPage() {
  return (
    <div className="space-y-6">
      <AttendanceClient />
      <MonthlyAttendanceRecap />
    </div>
  );
}
