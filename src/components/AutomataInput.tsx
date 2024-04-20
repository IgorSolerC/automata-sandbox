// Css
import "./Canvas.css";

// Google Material Icons
import CheckIcon from "../symbols/check_icon";
import WarningIcon from "../symbols/warning_icon";
import ErrorIcon from "../symbols/error_icon";

// Libaries
import React, { useRef, useEffect, useState } from "react";

// Objects
import { Automata } from "../models/Automata";

// Enums
import { AutomataInputResultsEnum } from "../enums/AutomataInputEnum";

// Contexts
import { AutomataInputProvider, useAutomataInputContext } from "../contexts/AutamataInputContext";

/*

          AUTOMATA INPUT

*/ 
interface AutomataInputProps {
    index: number;
    automataRef: React.MutableRefObject<Automata>;
    calculateSteps: any;
    isSimulating: boolean;
    simulationIndex: number;
    stopSimulation: () => void;
  }
  const AutomataInput: React.FC<AutomataInputProps> = (
    {
      index,
      automataRef,
      calculateSteps,
      isSimulating,
      simulationIndex,
      stopSimulation,
    }
  ) => {
    const { aumataInputResults, setAumataInputResults } = useAutomataInputContext();
  
    let qtdInput = aumataInputResults.length
    let simulationResult = aumataInputResults[index].result
    let errorMessage = aumataInputResults[index].message
  
    // Function to prevent CTRL+Z
    const preventUndo = (event: React.KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'z') {
        event.preventDefault();
      }
    };

    return (
      <div id="automata-input-div">
        <input
          placeholder="Input automato" 
          className={"automata-input " + (isSimulating && 'is-simulating')}
          id={"automata-input-id-"+index}
          autoComplete="off"
          // onFocus={() => {setInputFocused(true);}}
          // onBlur={() => {
          //   setInputFocused(false);
          // }} 
          onChange={(event) => {
            if (isSimulating){
              stopSimulation()
            }

            let aumataInputResultsAux = [...aumataInputResults]
            let newInput = event.target.value
            
            /*
            // Um pouco gambiarrado, mas foi o jeito que encontrei de "resetar" os valores de simulação
            // calculateSteps()
            */
  
            // Simulate automata again
            const { result, message } = automataRef.current.validate(newInput);
  
            // Update automata results
            aumataInputResultsAux[index].input = newInput
            aumataInputResultsAux[index].result = result
            aumataInputResultsAux[index].message = message
            setAumataInputResults(aumataInputResultsAux)
          }}
          onKeyDown={preventUndo}
        ></input>
        <button
          id={"automata-button-id-"+index}
          className={
            "canvas-button input-button " + (
              (simulationResult === AutomataInputResultsEnum.ACCEPTED) ? 
                'accepted ' : 
              (simulationResult === AutomataInputResultsEnum.WARNING) ? 
                'warning ' :
                'rejected '
            ) + (index === 0 ? '' : 'small')
          }
          onClick={(e) => {
            if (simulationResult !== AutomataInputResultsEnum.WARNING){
              calculateSteps(index);
            }
          }}
          title="Simular passo-a-passo"
        >
          {(
            (simulationResult === AutomataInputResultsEnum.ACCEPTED) ? 
              <CheckIcon/> : 
            (simulationResult === AutomataInputResultsEnum.WARNING) ? 
              <WarningIcon/> :
              <ErrorIcon/>
          )}
        </button>
        {(errorMessage && index === qtdInput-1) && (
          <div placeholder="Input automato" className="automata-input-error">
            <span>{errorMessage}</span>
          </div>
        )}
      </div>  
    )
  }

  export default AutomataInput