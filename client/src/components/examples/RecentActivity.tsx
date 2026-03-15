import RecentActivity, { type ActivityItem } from "../RecentActivity";

// todo: remove mock functionality
const mockActivities: ActivityItem[] = [
  {
    id: "1",
    type: "lead",
    title: "New Lead: Leonard Willis",
    description: "Sewer Main - Clear in Chicago",
    timestamp: "2m ago",
    status: "success",
  },
  {
    id: "2",
    type: "call",
    title: "Call from (708) 979-6298",
    description: "Direct call - Plumbing inquiry",
    timestamp: "15m ago",
  },
  {
    id: "3",
    type: "quote",
    title: "Quote sent to M. Garcia",
    description: "$850 - Sewer line repair",
    timestamp: "1h ago",
    status: "success",
  },
  {
    id: "4",
    type: "payment",
    title: "Payment received",
    description: "$450 from T. Kelley",
    timestamp: "2h ago",
    status: "success",
  },
  {
    id: "5",
    type: "alert",
    title: "Duplicate lead detected",
    description: "Armando Robles - eLocal",
    timestamp: "3h ago",
    status: "warning",
  },
  {
    id: "6",
    type: "call",
    title: "Missed call",
    description: "(312) 404-7812",
    timestamp: "4h ago",
    status: "danger",
  },
];

export default function RecentActivityExample() {
  return (
    <div className="p-4 max-w-md">
      <RecentActivity activities={mockActivities} />
    </div>
  );
}
