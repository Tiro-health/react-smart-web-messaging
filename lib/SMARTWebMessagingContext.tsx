import { createContext, useContext } from "react";
import { SMARTWebMessagingConnector } from "./SMARTWebMessagingConnector";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const SMARTWebMessagingContext =
  createContext<SMARTWebMessagingConnector | null>(null);

type SMARTWebMessagingProviderProps = { connector: SMARTWebMessagingConnector };
const client = new QueryClient();
export const SMARTWebMessagingProvider = ({
  connector,
  children,
}: React.PropsWithChildren<SMARTWebMessagingProviderProps>) => (
  <SMARTWebMessagingContext.Provider value={connector}>
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  </SMARTWebMessagingContext.Provider>
);
/**
 * Hook to access the SMARTWebMessagingConnector
 * @returns The SMARTWebMessagingConnector
 * @throws Error if the hook is used outside of a SMARTWebMessagingProvider
 */

export const useSMARTWebMessagingContext = () => {
  const context = useContext(SMARTWebMessagingContext);
  if (context === null) {
    throw new Error(
      "useSMARTWebMessaging must be used within a SMARTWebMessagingProvider",
    );
  }
  return context;
};
