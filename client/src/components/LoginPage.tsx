import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Eye, EyeOff, Phone } from "lucide-react";
const cseLogo = "/cse-logo.png";

interface LoginResponse {
  id: string;
  username: string;
  role: "admin" | "dispatcher" | "technician" | "salesperson";
  fullName: string | null;
  technicianId: string | null;
  salespersonId: string | null;
}

interface LoginPageProps {
  onLogin: (loginData: LoginResponse) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!username || !password) {
      setError("Please enter both username and password");
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Invalid credentials");
        setIsLoading(false);
        return;
      }

      const loginData: LoginResponse = await response.json();
      onLogin(loginData);
    } catch (err) {
      setError("Login failed. Please try again.");
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
      <div 
        className="absolute inset-0 z-[2]"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.5) 100%)',
        }}
      />
      <Card 
        className="w-full max-w-md z-10 backdrop-blur-sm bg-card/90 border-primary/20"
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(59, 130, 246, 0.1), 0 0 40px rgba(59, 130, 246, 0.15)',
          transform: 'perspective(1000px) rotateX(2deg)',
        }}
      >
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto relative">
            <div 
              className="absolute inset-0 blur-xl opacity-50 bg-primary rounded-full"
              style={{ transform: 'scale(0.8)' }}
            />
            <img 
              src={cseLogo} 
              alt="Emergency Chicago Sewer Experts" 
              className="h-28 w-auto mx-auto relative z-10 drop-shadow-2xl"
              style={{
                filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.4))',
              }}
              data-testid="img-cse-logo"
            />
          </div>
          <div>
            <h1 className="text-base sm:text-lg md:text-xl font-bold tracking-wide bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent" data-testid="text-brand-title">
              Powered by WebSlingerAI
            </h1>
            <p className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1">
              <Phone className="w-3 h-3" />
              <span>(708) 398-7600</span>
            </p>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                data-testid="input-username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  data-testid="input-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive" data-testid="text-error">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              data-testid="button-signin"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

        </CardContent>
      </Card>
    </div>
  );
}
