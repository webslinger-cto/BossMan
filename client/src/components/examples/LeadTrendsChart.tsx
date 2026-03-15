import LeadTrendsChart from "../LeadTrendsChart";

// todo: remove mock functionality
const mockData = [
  { date: "Oct", leads: 142, converted: 48 },
  { date: "Nov", leads: 189, converted: 62 },
  { date: "Dec", leads: 156, converted: 54 },
  { date: "Jan", leads: 201, converted: 71 },
  { date: "Feb", leads: 178, converted: 58 },
  { date: "Mar", leads: 234, converted: 89 },
];

export default function LeadTrendsChartExample() {
  return (
    <div className="p-4 max-w-2xl">
      <LeadTrendsChart data={mockData} />
    </div>
  );
}
