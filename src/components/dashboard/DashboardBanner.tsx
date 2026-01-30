import dashboardBanner from "@/assets/dashboard-banner.jpg";

export function DashboardBanner() {
  return (
    <div className="relative rounded-xl overflow-hidden">
      <img 
        src={dashboardBanner} 
        alt="Dashboard Banner" 
        className="w-full h-32 object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/60 to-transparent flex items-center">
        <div className="p-4">
          <h2 className="font-display text-xl font-bold text-primary text-glow mb-1">
            Pulse Drink Flow
          </h2>
          <p className="text-sm text-muted-foreground">
            Controle total do seu negócio
          </p>
        </div>
      </div>
    </div>
  );
}
