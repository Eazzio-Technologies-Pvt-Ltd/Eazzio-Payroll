import TestimonialMarquee from "@/components/ui/marquee-01";

export default function TestimonialsSection() {
  return (
    <section className="w-full py-20 overflow-hidden relative">
      <div className="max-w-6xl mx-auto px-4 mb-12 text-center">
        <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4">
          Trusted by <span className="text-indigo-600">Industry Leaders</span>
        </h2>
        <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto">
          See how Eazzio is helping organizations across the globe streamline their field operations.
        </p>
      </div>
      <TestimonialMarquee />
    </section>
  );
}
