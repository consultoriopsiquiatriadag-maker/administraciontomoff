import { useEffect, useState } from "react";
import { Landmark } from "lucide-react";
import { bankLogoOwner } from "./banks";
import type { Attachment } from "./storage";
export function BankLogo({
  bank,
  attachments,
}: {
  bank: string;
  attachments: Attachment[];
}) {
  const logo = attachments.find((a) => a.ownerId === bankLogoOwner(bank));
  const [source, setSource] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
    if (!logo) {
      setSource("");
      return;
    }
    const url = URL.createObjectURL(logo.blob);
    setSource(url);
    return () => URL.revokeObjectURL(url);
  }, [logo]);
  return (
    <span className="bank-logo">
      {source && !failed ? (
        <img
          src={source}
          alt={`Logo de ${bank}`}
          onError={() => setFailed(true)}
        />
      ) : (
        <Landmark size={23} role="img" aria-label={`Emisor: ${bank}`} />
      )}
    </span>
  );
}
