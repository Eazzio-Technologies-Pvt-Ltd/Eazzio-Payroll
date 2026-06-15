export default function Testimonials() {
  const testimonials = [
    {
      quote: "Eazzio Payroll completely transformed how we manage our sales representatives. The real-time tracking alone saved us countless hours of manual verification.",
      name: "Sarah Jenkins",
      role: "Operations Manager",
      initials: "SJ",
      color: "bg-blue-500",
    },
    {
      quote: "The automated timesheets and geo-fenced attendance have virtually eliminated buddy-punching. Our payroll processing time was cut in half.",
      name: "Marcus Cole",
      role: "HR Director",
      initials: "MC",
      color: "bg-emerald-500",
    },
    {
      quote: "We can now assign urgent service tickets to the nearest technician instantly. Our customer satisfaction scores have never been higher.",
      name: "Priya Sharma",
      role: "Field Service Head",
      initials: "PS",
      color: "bg-purple-500",
    },
  ];

  return (
    <section className="py-20 md:py-32 bg-white w-full border-t border-slate-100">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-20">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-6">
            Trusted by <span className="text-blue-600">Industry Leaders</span>
          </h2>
          <p className="text-lg text-slate-600">
            See how Eazzio is helping organizations across the globe streamline their field operations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {testimonials.map((test, idx) => (
            <div 
              key={idx} 
              className="bg-slate-50 rounded-2xl p-8 border border-slate-200 shadow-sm flex flex-col justify-between"
            >
              <div className="mb-8">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-slate-700 text-lg leading-relaxed italic">
                  "{test.quote}"
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full ${test.color} flex items-center justify-center text-white font-bold text-lg`}>
                  {test.initials}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{test.name}</h4>
                  <p className="text-sm text-slate-500">{test.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
