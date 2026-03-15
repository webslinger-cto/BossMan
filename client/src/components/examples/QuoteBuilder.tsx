import QuoteBuilder from "../QuoteBuilder";

export default function QuoteBuilderExample() {
  return (
    <div className="p-4 max-w-3xl mx-auto">
      <QuoteBuilder
        customerName="John Smith"
        customerPhone="(312) 555-0123"
        customerAddress="1234 Main St, Chicago, IL 60601"
        onSave={(quote) => console.log("Quote saved:", quote)}
        onSend={(quote) => console.log("Quote sent:", quote)}
      />
    </div>
  );
}
