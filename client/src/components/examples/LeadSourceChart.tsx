import LeadSourceChart from "../LeadSourceChart";

// todo: remove mock functionality
const mockData = [
  { name: "eLocal", value: 847, cost: 67760 },
  { name: "Networx", value: 312, cost: 12480 },
  { name: "Direct", value: 88, cost: 0 },
];

export default function LeadSourceChartExample() {
  return (
    <div className="p-4 max-w-md">
      <LeadSourceChart data={mockData} />
    </div>
  );
}
