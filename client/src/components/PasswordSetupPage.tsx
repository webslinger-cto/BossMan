import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Eye, EyeOff, Lock, CheckCircle2 } from "lucide-react";
const cseLogo = "/cse-logo.png";

interface PasswordSetupPageProps {
  userId: string;
  username: string;
  onComplete: () => void;
}

export default function PasswordSetupPage({ userId, username, onComplete }: PasswordSetupPageProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const passwordRequirements = [
    { met: newPassword.length >= 6, text: "At least 6 characters" },
    { met: newPassword === confirmPassword && confirmPassword.length > 0, text: "Passwords match" },
  ];

  const allRequirementsMet = passwordRequirements.every(req => req.met);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!allRequirementsMet) {
      setError("Please meet all password requirements");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/setup-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, password: newPassword }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to set password");
        setIsLoading(false);
        return;
      }

      onComplete();
    } catch (err) {
      setError("Failed to set password. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${cseLogo})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          filter: 'blur(2px)',
          transform: 'scale(1.1)',
        }}
      />
      <div 
        className="absolute inset-0 z-[1]"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.7) 70%, rgba(0,0,0,0.9) 100%)',
        }}
      />
      
      <Card 
        className="w-full max-w-md z-10 backdrop-blur-sm bg-card/90 border-primary/20"
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(59, 130, 246, 0.1), 0 0 40px rgba(59, 130, 246, 0.15)',
        }}
      >
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto">
            <img 
              src={cseLogo} 
              alt="Emergency Chicago Sewer Experts" 
              className="h-20 w-auto mx-auto"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold">Set Your Password</h1>
            <CardDescription className="mt-1">
              Welcome, <span className="font-semibold text-foreground">{username}</span>! 
              Please create your secure password.
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-10 pr-10"
                  data-testid="input-new-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  data-testid="input-confirm-password"
                />
              </div>
            </div>

            <div className="space-y-2 p-3 rounded-md bg-muted/50">
              {passwordRequirements.map((req, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className={`w-4 h-4 ${req.met ? "text-green-500" : "text-muted-foreground"}`} />
                  <span className={req.met ? "text-foreground" : "text-muted-foreground"}>
                    {req.text}
                  </span>
                </div>
              ))}
            </div>

            {error && (
              <p className="text-sm text-destructive" data-testid="text-error">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !allRequirementsMet}
              data-testid="button-set-password"
            >
              {isLoading ? "Setting Password..." : "Set Password & Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
