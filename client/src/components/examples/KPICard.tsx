import KPICard from "../KPICard";
import { Users, DollarSign, Phone, CheckCircle } from "lucide-react";

export default function KPICardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
      <KPICard
        title="Total Leads"
        value="1,247"
        change={12.5}
        icon={<Users className="w-5 h-5 text-muted-foreground" />}
        variant="default"
      />
      <KPICard
        title="Revenue"
        value="$84,320"
        change={8.2}
        icon={<DollarSign className="w-5 h-5 text-muted-foreground" />}
        variant="success"
      />
      <KPICard
        title="Conversion Rate"
        value="34.2%"
        change={-2.1}
        icon={<CheckCircle className="w-5 h-5 text-muted-foreground" />}
        variant="warning"
      />
      <KPICard
        title="Missed Calls"
        value="23"
        change={-15}
        changeLabel="vs last week"
        icon={<Phone className="w-5 h-5 text-muted-foreground" />}
        variant="danger"
      />
    </div>
  );
}
