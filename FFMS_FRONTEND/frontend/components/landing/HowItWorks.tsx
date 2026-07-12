export default function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Create Account",
      description: "Sign up in seconds and set up your organization profile with customized roles and territories.",
    },
    {
      num: "02",
      title: "Add Your Team",
      description: "Invite your field agents via email or SMS. They download the app and log in instantly.",
    },
    {
      num: "03",
      title: "Assign Tasks",
      description: "Create and assign tasks, schedules, and optimized routes directly from the admin dashboard.",
    },
    {
      num: "04",
      title: "Track & Improve",
      description: "Monitor real-time progress, review completion reports, and optimize future deployments.",
    },
  ];

  return (
    <section className="py-20 md:py-32 bg-slate-50 w-full overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-20 mb-12">
        <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4">
          How it <span className="text-emerald-600">Works</span>
        </h2>
        <p className="text-lg text-slate-600 max-w-2xl">
          Get your entire field force up and running in four simple steps. No complex training required.
        </p>
      </div>

      <div className="max-w-[1400px] mx-auto pl-6 md:pl-12 lg:pl-20 pr-6">
        <div 
          className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory hide-scrollbar"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#3b82f6 transparent" }}
        >
          {steps.map((step, idx) => (
            <div 
              key={idx} 
              className="min-w-[280px] md:min-w-[320px] max-w-[350px] flex-shrink-0 bg-white rounded-2xl p-8 border border-slate-200 shadow-sm snap-start relative overflow-hidden"
            >
              <div className="absolute -right-4 -top-6 text-[80px] font-black text-slate-100 select-none pointer-events-none">
                {step.num}
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 font-bold text-xl mb-6">
                {step.num}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3 relative z-10">{step.title}</h3>
              <p className="text-slate-600 leading-relaxed relative z-10">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
      
      {/* Custom Scrollbar Styles for Webkit */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          height: 6px;
        }
        .hide-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 10px;
        }
        .hide-scrollbar::-webkit-scrollbar-thumb {
          background: #3b82f6;
          border-radius: 10px;
        }
        .hide-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #2563eb;
        }
      `}} />
    </section>
  );
}
