import LeadsTable, { type Lead } from "../LeadsTable";

// todo: remove mock functionality
const mockLeads: Lead[] = [
  {
    id: "1",
    name: "Leonard Willis",
    phone: "708-289-7471",
    email: "lwillis@email.com",
    city: "Chicago",
    state: "IL",
    zipCode: "60628",
    source: "Networx",
    service: "Sewer Main - Clear",
    status: "new",
    cost: 31,
    date: "2025-12-06",
  },
  {
    id: "2",
    name: "Miguel Garcia",
    phone: "708-704-8356",
    city: "Chicago Heights",
    state: "IL",
    zipCode: "60411",
    source: "eLocal",
    service: "Plumbing",
    status: "contacted",
    cost: 80,
    date: "2025-12-05",
  },
  {
    id: "3",
    name: "Chanie Evans",
    phone: "773-966-9820",
    email: "chanieevans@yahoo.com",
    city: "Chicago",
    state: "IL",
    zipCode: "60620",
    source: "Networx",
    service: "Flood Control",
    status: "converted",
    cost: 32,
    date: "2025-12-06",
  },
  {
    id: "4",
    name: "Anthony Cunningham",
    phone: "708-897-6156",
    email: "broantcun@gmail.com",
    city: "Harvey",
    state: "IL",
    zipCode: "60426",
    source: "Networx",
    service: "Drain Clog/Blockage",
    status: "new",
    cost: 25,
    date: "2025-12-05",
  },
  {
    id: "5",
    name: "Armando Robles",
    phone: "312-404-7812",
    city: "Chicago",
    state: "IL",
    zipCode: "60637",
    source: "eLocal",
    service: "Plumbing",
    status: "duplicate",
    cost: 0,
    date: "2025-12-05",
  },
  {
    id: "6",
    name: "Takala Kelley",
    phone: "708-872-0048",
    city: "Calumet City",
    state: "IL",
    zipCode: "60409",
    source: "eLocal",
    service: "Plumbing",
    status: "converted",
    cost: 80,
    date: "2025-12-05",
  },
];

export default function LeadsTableExample() {
  return (
    <div className="p-4">
      <LeadsTable
        leads={mockLeads}
        onLeadClick={(lead) => console.log("Clicked lead:", lead)}
      />
    </div>
  );
}
