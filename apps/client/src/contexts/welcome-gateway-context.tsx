import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  FC,
} from "react";

import { useAuth } from "@/authentication";

interface WelcomeGatewayContextType {
  isOpen: boolean;
  isVisitor: boolean;
  blockingMessage: string | null;
  openGateway: (message?: string) => void;
  closeGateway: () => void;
  setVisitorMode: () => void;
  clearVisitorMode: () => void;
}

const WelcomeGatewayContext = createContext<
  WelcomeGatewayContextType | undefined
>(undefined);

const VISITOR_MODE_KEY = "kdufoot-visitor-mode";

export const WelcomeGatewayProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { isLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isVisitor, setIsVisitor] = useState(false);
  const [blockingMessage, setBlockingMessage] = useState<string | null>(null);

  // Initialize visitor state from storage (no auto-open)
  useEffect(() => {
    const savedVisitor = sessionStorage.getItem(VISITOR_MODE_KEY);

    if (savedVisitor === "true") {
      setIsVisitor(true);
    }
  }, [isLoading]);

  const openGateway = (message?: string) => {
    setBlockingMessage(message || null);
    setIsOpen(true);
  };

  const closeGateway = () => {
    setIsOpen(false);
    setBlockingMessage(null);
  };

  const setVisitorMode = () => {
    setIsVisitor(true);
    setIsOpen(false);
    setBlockingMessage(null);
    sessionStorage.setItem(VISITOR_MODE_KEY, "true");
  };

  const clearVisitorMode = () => {
    setIsVisitor(false);
    sessionStorage.removeItem(VISITOR_MODE_KEY);
  };

  return (
    <WelcomeGatewayContext.Provider
      value={{
        isOpen,
        isVisitor,
        blockingMessage,
        openGateway,
        closeGateway,
        setVisitorMode,
        clearVisitorMode,
      }}
    >
      {children}
    </WelcomeGatewayContext.Provider>
  );
};

export const useWelcomeGateway = () => {
  const context = useContext(WelcomeGatewayContext);

  if (context === undefined) {
    throw new Error(
      "useWelcomeGateway must be used within a WelcomeGatewayProvider",
    );
  }

  return context;
};
