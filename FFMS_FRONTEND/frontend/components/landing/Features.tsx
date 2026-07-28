import { FeatureCarousel } from "@/components/ui/feature-carousel";

export default function Features() {
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

        <FeatureCarousel />
      </div>
    </section>
  );
}

