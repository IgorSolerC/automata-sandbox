import React, { createContext, useContext, useState, ReactNode } from "react";
import { AutomataInputResultsEnum } from "../enums/AutomataInputEnum";
import { AutomataOutput } from "../models/AutomataOutput";

// Definição do tipo do conteudo do context
type AutomataInputContextType = {
  aumataInputResults: AutomataOutput[];
  setAumataInputResults: (tool: AutomataOutput[]) => void;
};

const AutomataInputContext = createContext<AutomataInputContextType | undefined>(undefined);
export const useAutomataInputContext = (): AutomataInputContextType => {
  const context = useContext(AutomataInputContext);
  if (!context) {
    throw new Error("useAutomataInputContext must be used within a AutomataInputProvider");
  } 
  return context;
};

type AutomataInputProviderProps = {children: ReactNode};
export const AutomataInputProvider: React.FC<AutomataInputProviderProps> = ({ children }) => {
  const qttInputs = 6
  const [aumataInputResults, setAumataInputResults] = useState(
    Array.from({ length: qttInputs }, () => {
      let inputResult: AutomataOutput = {
        input: '',
        result: AutomataInputResultsEnum.WARNING,
        message: 'Nenhum estado inicial foi definido!'
      }  
      return (inputResult)
    }
    )
  );

  return (
    <AutomataInputContext.Provider value={{ aumataInputResults, setAumataInputResults }}>
      {children}
    </AutomataInputContext.Provider>
  );
};
