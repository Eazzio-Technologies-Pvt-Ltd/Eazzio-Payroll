"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { fetchClient } from "@/lib/fetch-client";

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

const BASE_URL =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1"
    : "http://localhost:5000/api/v1";

export default function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (pathname === "/admin/billing") {
      setChecked(true);
      return;
    }

    async function checkSubscription() {
      try {
        const res = await fetchClient(`${BASE_URL}/payment/subscription`, {
          method: "GET",
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          if (data.active === false) {
            router.replace("/admin/billing");
          } else {
            setChecked(true);
          }
        } else {
          // If response is not ok (non-2xx status), don't block access on network/server errors
          setChecked(true);
        }
      } catch (err) {
        console.error("Subscription validation error:", err);
        // Do not block user on network/server failures
        setChecked(true);
      }
    }

    checkSubscription();
  }, [pathname, router]);

  if (!checked && pathname !== "/admin/billing") {
    return null;
  }

  return <>{children}</>;
}
