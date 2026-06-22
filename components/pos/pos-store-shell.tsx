"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PosOperatorBar } from "@/components/pos/pos-operator-bar";
import { PosOperatorGate } from "@/components/pos/pos-operator-gate";
import { signOutPosOperator } from "@/lib/pos/actions";

export function PosStoreShell({
  hasOperator,
  operatorName,
  authMethod,
  storeName,
  terminalEmail,
  children,
}: {
  hasOperator: boolean;
  operatorName: string;
  authMethod?: "password" | "nfc";
  storeName?: string;
  terminalEmail?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [gateOpen, setGateOpen] = useState(!hasOperator);
  const [gateMode, setGateMode] = useState<"initial" | "switch">("initial");
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!switching) {
      setGateOpen(!hasOperator);
    }
  }, [hasOperator, switching]);

  function handleSwitchOperator() {
    setError("");
    setGateMode("switch");
    setSwitching(true);
    setGateOpen(true);

    startTransition(async () => {
      const result = await signOutPosOperator();
      if (result?.error) {
        setError(result.error);
        setSwitching(false);
        setGateOpen(false);
        return;
      }

      setSwitching(false);
      router.replace("/cashier/pos?switch=1");
      router.refresh();
    });
  }

  if (gateOpen) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <PosOperatorGate
          storeName={storeName}
          terminalEmail={terminalEmail}
          gateMode={gateMode}
        />
        {error && (
          <p className="mx-auto mb-6 max-w-lg rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PosOperatorBar
        operatorName={operatorName}
        authMethod={authMethod}
        onSwitch={handleSwitchOperator}
        switching={pending}
      />
      {children}
    </div>
  );
}
