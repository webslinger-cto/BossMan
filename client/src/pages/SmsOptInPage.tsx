import { useState } from "react";

export default function SmsOptInPage() {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return;
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0a1628 0%, #0f1d32 50%, #0a1628 100%)", padding: "20px" }}>
        <div style={{ maxWidth: 480, width: "100%", background: "#111827", borderRadius: 12, padding: 40, textAlign: "center", color: "#e5e7eb" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12, color: "#fff" }}>You're All Set!</h2>
          <p style={{ color: "#9ca3af", lineHeight: 1.6 }}>
            You've been opted in to receive SMS notifications from BossMan. 
            You can opt out at any time by replying <strong style={{ color: "#fff" }}>STOP</strong> to any message.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0a1628 0%, #0f1d32 50%, #0a1628 100%)", padding: "20px" }}>
      <div style={{ maxWidth: 480, width: "100%", background: "#111827", borderRadius: 12, padding: 40, color: "#e5e7eb" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", marginBottom: 8 }}>
            🔨 BossMan
          </h1>
          <p style={{ color: "#9ca3af", fontSize: 14 }}>
            Contractor Management Platform
          </p>
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: "#fff" }}>
          SMS Notifications Opt-In
        </h2>
        <p style={{ color: "#9ca3af", fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          Stay connected with your crew and customers. Receive job assignments, 
          appointment reminders, schedule updates, quote notifications, and important 
          business communications via text message.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 6, color: "#d1d5db" }}>
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="John Smith"
              style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #374151", background: "#1f2937", color: "#fff", fontSize: 14, boxSizing: "border-box" }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 6, color: "#d1d5db" }}>
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder="(555) 123-4567"
              style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #374151", background: "#1f2937", color: "#fff", fontSize: 14, boxSizing: "border-box" }}
            />
          </div>

          <div style={{ marginBottom: 24, display: "flex", gap: 10, alignItems: "flex-start" }}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              required
              style={{ marginTop: 3, width: 18, height: 18, accentColor: "#3b82f6", flexShrink: 0 }}
            />
            <label style={{ fontSize: 13, color: "#9ca3af", lineHeight: 1.5 }}>
              I agree to receive automated SMS messages from BossMan, including job 
              notifications, appointment reminders, schedule updates, and business 
              communications. Message frequency varies. Message and data rates may apply. 
              Reply <strong style={{ color: "#fff" }}>STOP</strong> to unsubscribe at any time or{" "}
              <strong style={{ color: "#fff" }}>HELP</strong> for assistance. 
              Consent is not required for purchase.
            </label>
          </div>

          <button
            type="submit"
            disabled={!agreed}
            style={{
              width: "100%",
              padding: "12px 24px",
              borderRadius: 8,
              border: "none",
              background: agreed ? "#2563eb" : "#374151",
              color: agreed ? "#fff" : "#6b7280",
              fontSize: 16,
              fontWeight: 700,
              cursor: agreed ? "pointer" : "not-allowed",
              transition: "background 0.2s",
            }}
          >
            Subscribe to SMS Notifications
          </button>
        </form>

        <div style={{ marginTop: 32, paddingTop: 20, borderTop: "1px solid #1f2937", fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>
          <p style={{ marginBottom: 8 }}>
            <strong style={{ color: "#9ca3af" }}>About BossMan:</strong> A contractor management 
            platform by WebSlingerAI that helps home service businesses manage jobs, crews, 
            and customer communications.
          </p>
          <p style={{ marginBottom: 8 }}>
            <strong style={{ color: "#9ca3af" }}>Message Types:</strong> Job assignments, appointment 
            reminders, schedule updates, quote/invoice notifications, crew coordination, 
            and customer service replies.
          </p>
          <p>
            <strong style={{ color: "#9ca3af" }}>Support:</strong>{" "}
            <a href="https://webslingerai.com" style={{ color: "#3b82f6" }}>webslingerai.com</a>{" "}
            | Reply STOP to opt out | Reply HELP for assistance
          </p>
        </div>
      </div>
    </div>
  );
}
