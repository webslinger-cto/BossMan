import LeadQualityChart from "../LeadQualityChart";

// todo: remove mock functionality
const mockData = [
  { category: "Valid Leads", count: 847, color: "#22c55e" },
  { category: "Duplicates", count: 156, color: "#a855f7" },
  { category: "Spam", count: 89, color: "#ef4444" },
  { category: "Missed Calls", count: 67, color: "#f59e0b" },
];

export default function LeadQualityChartExample() {
  return (
    <div className="p-4 max-w-2xl">
      <LeadQualityChart data={mockData} />
    </div>
  );
}
