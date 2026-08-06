"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

export function ProgressRefresh() {
  const router = useRouter();

  React.useEffect(() => {
    router.refresh();
  }, [router]);

  return null;
}
