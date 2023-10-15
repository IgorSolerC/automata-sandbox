import React, { createContext, useContext, useState, ReactNode, useRef} from "react";
import { AutomataInputResultsEnum } from "../enums/AutomataInputEnum";
import { AutomataOutput } from "../models/AutomataOutput";
import { Automata } from "../models/Automata";

// Definição do tipo do conteudo do context
type AutomataInputContextType = {
  aumataInputResults: AutomataOutput[];
  aumataInputResultsRef: React.MutableRefObject<AutomataOutput[]>;
  setAumataInputResults: (inputResults: AutomataOutput[]) => void;
  addInput: (automata: React.MutableRefObject<Automata>) => void;
  removeInput: () => void;
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
  const qttInputs = 1

  let initialValue = Array.from({ length: qttInputs }, () => {
    let newInput: AutomataOutput = {
      input: '',
      result: AutomataInputResultsEnum.WARNING,
      message: 'Nenhum estado inicial foi definido!'
    }  
    return (newInput)
  });
  const [aumataInputResults, setAumataInputResultsAux] = useState(initialValue)
  const aumataInputResultsRef = useRef(initialValue);


const setAumataInputResults = (inputResults: AutomataOutput[]) => {
  let newValue = [...inputResults]
  setAumataInputResultsAux(newValue)
  console.log('teste')
  console.log(aumataInputResultsRef.current)
  aumataInputResultsRef.current = newValue
}

  const addInput = (automata: React.MutableRefObject<Automata>) => {
    let aumataInputResultsCopy = [...aumataInputResults]

    const { result, message } = automata.current.validate('');

    let newInput: AutomataOutput = {
      input: '',
      result: result,
      message: message,
    } 
    aumataInputResultsCopy.push(newInput)

    setAumataInputResults(aumataInputResultsCopy)
  }

  const removeInput = () => {
    let aumataInputResultsCopy = [...aumataInputResults]
    aumataInputResultsCopy.pop()

    setAumataInputResults(aumataInputResultsCopy)
  }

  return (
    <AutomataInputContext.Provider value={{ aumataInputResults, aumataInputResultsRef, setAumataInputResults, addInput, removeInput }}>
      {children}
    </AutomataInputContext.Provider>
  );
};
