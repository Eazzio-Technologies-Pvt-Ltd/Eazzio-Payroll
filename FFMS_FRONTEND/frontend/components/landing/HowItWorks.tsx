"use client";

import HowItWorksUI, { Step } from "@/components/ui/how-it-works";

export default function HowItWorks() {
  const steps: Step[] = [
    {
      title: "Create Account",
      description: "Sign up in seconds and set up your organization profile with customized roles and territories.",
      colorTheme: "orange",
    },
    {
      title: "Add Your Team",
      description: "Invite your field agents via email or SMS. They download the app and log in instantly.",
      colorTheme: "blue",
    },
    {
      title: "Assign Tasks",
      description: "Create and assign tasks, schedules, and optimized routes directly from the admin dashboard.",
      colorTheme: "purple",
    },
    {
      title: "Track & Improve",
      description: "Monitor real-time progress, review completion reports, and optimize future deployments.",
      colorTheme: "orange",
    },
  ];

  return (
    <section className="py-20 md:py-32 bg-slate-50 dark:bg-neutral-900 w-full overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-20 mb-12">
        <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4">
          How it <span className="text-emerald-600">Works</span>
        </h2>
        <p className="text-lg text-slate-600 dark:text-neutral-400 max-w-2xl">
          Get your entire field force up and running in four simple steps. No complex training required.
        </p>
      </div>

      <div className="w-full">
        <HowItWorksUI features={steps} className="bg-transparent dark:bg-transparent" />
      </div>
    </section>
  );
}
