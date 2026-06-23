"use client";

import { useEffect, useState } from "react";
import { PosOperatorGate } from "@/components/pos/pos-operator-gate";

export function PosStoreShell({
  hasOperator,
  storeName,
  terminalEmail,
  children,
}: {
  hasOperator: boolean;
  storeName?: string;
  terminalEmail?: string;
  children: React.ReactNode;
}) {
  const [gateOpen, setGateOpen] = useState(!hasOperator);

  useEffect(() => {
    setGateOpen(!hasOperator);
  }, [hasOperator]);

  if (gateOpen) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <PosOperatorGate storeName={storeName} terminalEmail={terminalEmail} />
      </div>
    );
  }

  return <div className="flex h-full min-h-0 flex-col">{children}</div>;
}
