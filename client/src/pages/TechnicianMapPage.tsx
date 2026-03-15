import { TechnicianMap } from "@/components/TechnicianMap";

export default function TechnicianMapPage() {
  return (
    <div className="h-full p-4" data-testid="page-technician-map">
      <TechnicianMap refreshInterval={15000} />
    </div>
  );
}
