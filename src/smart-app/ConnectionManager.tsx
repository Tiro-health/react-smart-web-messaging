import { SMARTWebMessagingConnector } from "#lib/SMARTWebMessagingConnector.ts";
import { SMARTWebMessagingProvider } from "#lib/SMARTWebMessagingContext.tsx";
import { useState } from "react";

export default function ConnectionManager({
  children,
}: {
  children: React.ReactNode | undefined;
}) {
  const [connector] = useState(() => {
    const urlparams = new URLSearchParams(window.location.search);
    const ehrWindow =
      window.parent !== window.self
        ? window.parent
        : (window.opener ?? window.chrome.webview);

    console.log(window.location.search, ehrWindow);
    return new SMARTWebMessagingConnector(
      ehrWindow,
      {
        handle: urlparams.get("messagingHandle") ?? "test",
        origin: urlparams.get("targetOrigin") ?? ehrWindow?.location?.window,
      },
      {
        timeoutMs: 1000,
      },
    );
  });
  return (
    <SMARTWebMessagingProvider connector={connector}>
      {children}
    </SMARTWebMessagingProvider>
  );
}
