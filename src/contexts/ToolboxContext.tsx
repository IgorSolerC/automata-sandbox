import React, { createContext, useContext, useState, ReactNode } from "react";
import { CanvasTools } from "../enums/CanvasToolsEnum";

// Definição do tipo do conteudo do context
type ToolboxContextType = {
  selectedToolState: CanvasTools;
  setSelectedToolState: (tool: CanvasTools) => void;
};

const ToolboxContext = createContext<ToolboxContextType | undefined>(undefined);
export const useToolboxContext = (): ToolboxContextType => {
  const context = useContext(ToolboxContext);
  if (!context) {
    throw new Error("useToolboxContext must be used within a ToolboxProvider");
  } 
  return context;
};

type ToolboxProviderProps = {children: ReactNode};
export const ToolboxProvider: React.FC<ToolboxProviderProps> = ({ children }) => {
  const [selectedToolState, setSelectedToolState] = useState(CanvasTools.POINTER);

  return (
    <ToolboxContext.Provider value={{ selectedToolState, setSelectedToolState }}>
      {children}
    </ToolboxContext.Provider>
  );
};
