import TechnicianCard, { type Technician } from "../TechnicianCard";

// todo: remove mock functionality
const mockTechnicians: Technician[] = [
  {
    id: "1",
    name: "Mike Johnson",
    initials: "MJ",
    phone: "(312) 555-0123",
    totalJobs: 156,
    completedJobs: 142,
    canceledJobs: 14,
    revenue: 28450,
    conversionRate: 78,
    status: "online",
  },
  {
    id: "2",
    name: "Carlos Rodriguez",
    initials: "CR",
    phone: "(773) 555-0456",
    totalJobs: 98,
    completedJobs: 85,
    canceledJobs: 13,
    revenue: 19200,
    conversionRate: 72,
    status: "busy",
  },
  {
    id: "3",
    name: "David Smith",
    initials: "DS",
    phone: "(708) 555-0789",
    totalJobs: 67,
    completedJobs: 58,
    canceledJobs: 9,
    revenue: 12800,
    conversionRate: 65,
    status: "offline",
  },
];

export default function TechnicianCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
      {mockTechnicians.map((tech) => (
        <TechnicianCard
          key={tech.id}
          technician={tech}
          onClick={(t) => console.log("Clicked technician:", t)}
        />
      ))}
    </div>
  );
}
