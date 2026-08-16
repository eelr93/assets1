"use client";

import { useState } from "react";
import { Library } from "@/components/Library";
import { Reader } from "@/components/Reader";

export function AppShell() {
  const [openBookId, setOpenBookId] = useState<string | null>(null);

  if (openBookId) {
    return <Reader bookId={openBookId} onBack={() => setOpenBookId(null)} />;
  }

  return <Library onOpenBook={setOpenBookId} />;
}
