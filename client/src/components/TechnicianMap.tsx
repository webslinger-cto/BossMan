import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Icon, LatLngBounds } from "leaflet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, MapPin, Clock, User, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";

interface TechnicianLocation {
  id: string;
  technicianId: string;
  latitude: string;
  longitude: string;
  accuracy: string | null;
  createdAt: string;
  technicianName: string;
  technicianStatus: string;
  jobId: string | null;
}

const technicianIcon = new Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const busyTechnicianIcon = new Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const availableTechnicianIcon = new Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function getStatusColor(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "available":
      return "default";
    case "on_job":
      return "destructive";
    case "en_route":
      return "secondary";
    default:
      return "outline";
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "available":
      return "Available";
    case "on_job":
      return "On Job";
    case "en_route":
      return "En Route";
    case "off_duty":
      return "Off Duty";
    default:
      return status;
  }
}

function getTechnicianIcon(status: string): Icon {
  switch (status) {
    case "available":
      return availableTechnicianIcon;
    case "on_job":
    case "en_route":
      return busyTechnicianIcon;
    default:
      return technicianIcon;
  }
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  return date.toLocaleDateString();
}

function MapBoundsHandler({ locations }: { locations: TechnicianLocation[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (locations.length > 0) {
      const bounds = new LatLngBounds(
        locations.map(loc => [parseFloat(loc.latitude), parseFloat(loc.longitude)] as [number, number])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }
  }, [locations, map]);
  
  return null;
}

interface TechnicianMapProps {
  refreshInterval?: number;
}

export function TechnicianMap({ refreshInterval = 30000 }: TechnicianMapProps) {
  const [lastRefresh, setLastRefresh] = useState(new Date());
  
  const { data: locations = [], isLoading, refetch, isFetching } = useQuery<TechnicianLocation[]>({
    queryKey: ["/api/technicians/locations/all"],
    refetchInterval: refreshInterval,
  });

  useEffect(() => {
    if (!isFetching) {
      setLastRefresh(new Date());
    }
  }, [isFetching]);

  const handleRefresh = () => {
    refetch();
  };

  const chicagoCenter: [number, number] = [41.8781, -87.6298];
  
  const availableCount = locations.filter(l => l.technicianStatus === "available").length;
  const busyCount = locations.filter(l => ["on_job", "en_route"].includes(l.technicianStatus)).length;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-muted-foreground" />
          <CardTitle data-testid="text-map-title">Technician Locations</CardTitle>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="default" className="gap-1">
            <User className="h-3 w-3" />
            {availableCount} Available
          </Badge>
          <Badge variant="destructive" className="gap-1">
            <Wrench className="h-3 w-3" />
            {busyCount} On Job
          </Badge>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleRefresh}
            disabled={isFetching}
            data-testid="button-refresh-map"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
            <div className="flex items-center gap-2 text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Loading map...</span>
            </div>
          </div>
        ) : locations.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/50 gap-2">
            <MapPin className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">No technician locations available</p>
            <p className="text-sm text-muted-foreground">Technicians will appear here when they share their location</p>
          </div>
        ) : (
          <MapContainer
            center={chicagoCenter}
            zoom={10}
            className="h-full w-full min-h-[400px]"
            style={{ zIndex: 0 }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapBoundsHandler locations={locations} />
            {locations.map((location) => (
              <Marker
                key={location.id}
                position={[parseFloat(location.latitude), parseFloat(location.longitude)]}
                icon={getTechnicianIcon(location.technicianStatus)}
              >
                <Popup>
                  <div className="min-w-[200px] p-1">
                    <div className="font-semibold text-base mb-2" data-testid={`text-tech-name-${location.technicianId}`}>
                      {location.technicianName}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={getStatusColor(location.technicianStatus)}>
                        {getStatusLabel(location.technicianStatus)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Updated {formatTimestamp(location.createdAt)}</span>
                    </div>
                    {location.accuracy && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Accuracy: {Math.round(parseFloat(location.accuracy))}m
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
        <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm px-2 py-1 rounded text-xs text-muted-foreground z-[1000]">
          <Clock className="h-3 w-3 inline mr-1" />
          Last updated: {lastRefresh.toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );
}
