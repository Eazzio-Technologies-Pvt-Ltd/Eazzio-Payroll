import { MapPin, CheckSquare, Clock, Route, BarChart, Shield } from "lucide-react";

export default function Features() {
  const features = [
    {
      icon: <MapPin className="w-6 h-6" />,
      title: "GPS Live Tracking",
      description: "Monitor your field team's exact location in real-time. Ensure accountability and optimize deployment.",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      icon: <CheckSquare className="w-6 h-6" />,
      title: "Task Assignment",
      description: "Assign, update, and track tasks instantly. Get notified upon completion with attached proofs or signatures.",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: "Attendance & Leaves",
      description: "Geo-fenced punch-in and punch-out. Streamline leave management and automated timesheets.",
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      icon: <Route className="w-6 h-6" />,
      title: "Route Optimization",
      description: "Plan the most efficient routes for field agents. Save fuel, reduce travel time, and increase daily visits.",
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
    {
      icon: <BarChart className="w-6 h-6" />,
      title: "Reports & Analytics",
      description: "Actionable insights at your fingertips. Generate daily, weekly, or monthly reports on team performance.",
      color: "text-rose-500",
      bg: "bg-rose-500/10",
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Secure Data",
      description: "Enterprise-grade security ensures that your company and client data remains completely private and encrypted.",
      color: "text-blue-400",
      bg: "bg-blue-400/10",
    },
  ];

  return (
    <section id="features" className="py-20 md:py-32 bg-white w-full">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-20">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-6 leading-snug">
            Everything you need to{" "}
            <span className="text-blue-600">manage field teams</span>
          </h2>
          <p className="text-lg text-slate-600">
            A comprehensive suite of tools designed specifically for organizations that rely on distributed workforces.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {features.map((feature, idx) => (
            <div 
              key={idx} 
              className="bg-slate-50 rounded-2xl p-8 border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-500/30 hover:-translate-y-2 transition-all duration-300 group"
            >
              <div className={`w-14 h-14 rounded-xl ${feature.bg} ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
              <p className="text-slate-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
