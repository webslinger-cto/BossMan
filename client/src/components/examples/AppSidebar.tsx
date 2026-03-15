import { SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from "../AppSidebar";

export default function AppSidebarExample() {
  return (
    <SidebarProvider>
      <div className="flex h-[600px] w-full">
        <AppSidebar
          role="admin"
          username="John Admin"
          onLogout={() => console.log("Logout clicked")}
        />
        <div className="flex-1 p-6 bg-background">
          <p className="text-muted-foreground">Main content area</p>
        </div>
      </div>
    </SidebarProvider>
  );
}
