import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Waves, ClipboardList, Users, BarChart3 } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 md:py-16">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12 md:mb-16">
            <div className="flex items-center justify-center gap-3 mb-6">
              <Waves className="w-10 h-10 md:w-12 md:h-12 text-primary" />
              <h1 className="text-3xl md:text-5xl font-bold text-foreground">
                Hart SC Coaches Platform
              </h1>
            </div>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Professional session logging platform for swimming coaches. Track training data, monitor attendance, and power your performance analytics.
            </p>
            <Button 
              size="lg" 
              onClick={handleLogin}
              className="h-12 px-8 text-base font-medium"
              data-testid="button-login"
            >
              Log In to Continue
            </Button>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card>
              <CardHeader className="pb-4">
                <ClipboardList className="w-8 h-8 text-primary mb-3" />
                <CardTitle className="text-lg">Session Logging</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  Record detailed training sessions with stroke-by-stroke distance tracking and session metadata.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <Users className="w-8 h-8 text-primary mb-3" />
                <CardTitle className="text-lg">Attendance Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  Monitor swimmer attendance with granular status options and session-by-session records.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <BarChart3 className="w-8 h-8 text-primary mb-3" />
                <CardTitle className="text-lg">Power BI Integration</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  Built on PostgreSQL for seamless integration with your existing Power BI dashboards.
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          {/* Info Section */}
          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="text-xl">Built for Coaches</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-muted-foreground text-sm md:text-base">
                Hart SC Coaches Platform replaces basic logging tools with a comprehensive relational database platform. Track every detail of your training sessions from poolside, on any device.
              </p>
              <ul className="text-sm md:text-base text-muted-foreground space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Individual coach accounts with personalized views</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Mobile-friendly interface for poolside use</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Comprehensive stroke and distance tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Direct PostgreSQL access for Power BI analytics</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
