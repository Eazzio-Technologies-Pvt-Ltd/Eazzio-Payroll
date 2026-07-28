"use client";
import React from "react";
import Image from "next/image";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";

export function PayrollHero() {
  return (
    <div className="flex flex-col overflow-hidden ">      <ContainerScroll
        titleComponent={
          <>
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium px-4 py-1.5 rounded-full mb-4">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              Smart • Simple • Connected
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-[#0F172A] leading-tight">
              Smart Field Management for{" "}
              <span className="text-blue-600">Stronger Teams</span>
            </h1>
            <p className="text-slate-600 text-base max-w-xl mx-auto mt-3 leading-relaxed">
              Automate salary calculations, attendance sync, and payslip generation — for every employee, every month, without errors.
            </p>
            <div className="flex items-center justify-center gap-3 mt-4">
              <button className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-7 py-3 rounded-lg text-sm">
                REGISTER NOW
              </button>
              <button className="bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold px-7 py-3 rounded-lg text-sm">
                Start free trial
              </button>
            </div>
            <p className="text-xs text-blue-600 bg-blue-100 border border-blue-200 inline-block px-4 py-1.5 rounded-full mt-3">
              FREE FOR UP TO 10 USERS — No credit card required
            </p>
          </>
        }
      >
        <Image
          src="/dashboard-preview.png"
          alt="Eazzio Admin Dashboard"
          height={720}
          width={1400}
          className="mx-auto rounded-2xl object-cover h-full object-left-top"
          draggable={false}
          priority
        />
      </ContainerScroll>
    </div>
  );
}