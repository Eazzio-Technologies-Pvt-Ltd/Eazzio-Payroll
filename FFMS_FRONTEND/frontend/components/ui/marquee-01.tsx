import { Marquee } from "@/components/ui/marquee-01-utils/marquee";

const testimonials = [
  {
    name: "Sarah Jenkins",
    username: "@sarah_apex",
    role: "Operations Head at Apex Logistics",
    body: "Payroll used to take our HR team 3 days every month. With Eazzio it's done in under 2 hours. The salary calculation logic handles everything automatically.",
    initials: "SJ",
    gradient: "from-blue-600 to-indigo-600",
  },
  {
    name: "Marcus Cole",
    username: "@marcus_veloce",
    role: "HR Director at Veloce Field Ops",
    body: "The automated timesheets and geofenced attendance have virtually eliminated buddy-punching. Our field compliance hit 99% in month one.",
    initials: "MC",
    gradient: "from-emerald-600 to-teal-600",
  },
  {
    name: "Priya Sharma",
    username: "@priya_zenith",
    role: "VP of Field Services at Zenith Healthcare",
    body: "We can now assign urgent client visits to the nearest technician in real-time. Customer response time dropped by 45%.",
    initials: "PS",
    gradient: "from-purple-600 to-indigo-600",
  },
  {
    name: "Devang Patel",
    username: "@devang_transglobe",
    role: "Payroll Admin at TransGlobe Retail",
    body: "Expense approvals and travel allowances calculate automatically from live GPS logs. Zero manual audit overhead for finance.",
    initials: "DP",
    gradient: "from-amber-600 to-orange-600",
  },
  {
    name: "Anita Roy",
    username: "@anita_urban",
    role: "People Lead at Urban Distribution",
    body: "Managing 200+ field reps across 12 territories used to be total chaos. Eazzio gave us crystal-clear visibility from day one.",
    initials: "AR",
    gradient: "from-rose-600 to-pink-600",
  },
  {
    name: "Vikram Reddy",
    username: "@vikram_nova",
    role: "Territory Manager at Nova Pharma",
    body: "Live GPS tracking and offline location buffering mean we never lose field data even in remote areas with low connectivity.",
    initials: "VR",
    gradient: "from-cyan-600 to-blue-600",
  },
  {
    name: "Rajesh Kumar",
    username: "@rajesh_bluesky",
    role: "Regional Director at BlueSky FMCG",
    body: "Real-time check-ins and territory geofencing gave our management team complete transparency without micromanaging field agents.",
    initials: "RK",
    gradient: "from-violet-600 to-purple-600",
  },
];

const firstRow = testimonials.slice(0, 4);
const secondRow = testimonials.slice(4);

function TestimonialCard({
  name,
  role,
  body,
  initials,
  gradient,
}: {
  name: string;
  role: string;
  body: string;
  initials: string;
  gradient: string;
}) {
  return (
    <figure className="relative w-72 min-h-[150px] cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:border-indigo-500/40 hover:shadow-md flex flex-col justify-between">
      <blockquote className="text-sm text-slate-700 leading-relaxed italic mb-4">
        "{body}"
      </blockquote>
      <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
        <div
          className={`w-9 h-9 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center font-bold text-xs text-white ring-2 ring-indigo-500/30 shrink-0 shadow-xs`}
        >
          {initials}
        </div>
        <div className="flex flex-col min-w-0">
          <figcaption className="text-sm font-semibold text-slate-900 truncate">
            {name}
          </figcaption>
          <p className="text-xs text-slate-500 truncate">
            {role}
          </p>
        </div>
      </div>
    </figure>
  );
}

export default function TestimonialMarquee() {
  return (
    <div className="relative flex w-full flex-col items-center justify-center overflow-hidden py-4">
      <Marquee pauseOnHover className="[--duration:35s]">
        {firstRow.map((review) => (
          <TestimonialCard key={review.username} {...review} />
        ))}
      </Marquee>
      <Marquee reverse pauseOnHover className="[--duration:35s] mt-3">
        {secondRow.map((review) => (
          <TestimonialCard key={review.username} {...review} />
        ))}
      </Marquee>
      {/* Fade gradients on left/right edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-[#faf8ff] via-[#faf8ff]/70 to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-[#faf8ff] via-[#faf8ff]/70 to-transparent z-10" />
    </div>
  );
}
