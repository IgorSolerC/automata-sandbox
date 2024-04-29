// Google Material Icons
import ErrorIcon from "../../symbols/error_icon";

// Libaries
import React, { useRef, useEffect, useState } from "react";

// Components
import GenericPopup from "../GenericPopup"; 
import "./CreateTransitionPopup.css"; 


interface CreateTransitionPopupProps {
    popupInput: {
        onSubmit: (labels: string[]) => void
        previousLabels: string[] 
    }
    onClose: () => void
}

const CreateTransitionPopup: React.FC<CreateTransitionPopupProps> = ({
    popupInput,
    onClose,
}) => { 
    // const [inputValue, setInputValue] = useState([''])
    const [inputValue, setInputValue] = useState(!popupInput.previousLabels.includes('') ? popupInput.previousLabels.concat(['']) : popupInput.previousLabels)
    const inputRefs = useRef([React.createRef()] as React.RefObject<HTMLInputElement>[]); // Array of refs

    const [triggerRerender, setTriggerRerender] = useState(['do not touch'])

    useEffect(() => {
        // Initialize an empty ref for each input
        inputRefs.current = inputValue.map((_, i) => inputRefs.current[i] ?? React.createRef());
        setTriggerRerender([...triggerRerender])
    }, [inputValue])

    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.keyCode === 13) { // Enter key
                const createButton = document.querySelector('.generic-popup-button') as HTMLElement;
                if (createButton) {
                    createButton.click();
                }
            }
        };
        document.addEventListener('keydown', handleKeyPress);

        // Initialize an empty ref for each input
        // Auto-focus logic from previous solutions:
        const lastInputIndex = inputValue.length - 1;
        if (inputRefs.current[lastInputIndex]) {
            inputRefs.current[lastInputIndex].current?.focus();                
        }
        return () => { 
            document.removeEventListener('keydown', handleKeyPress);
        };
    }, [triggerRerender])

    function handleInputChange(
        e: React.ChangeEvent<HTMLInputElement>,
        i: number,
    ){
        const getLastChar = (e: React.ChangeEvent<HTMLInputElement>) => {
            let value = e.target.value
            if (!value.length) return ''

            return value[value.length-1]
        }
        
        let value = getLastChar(e)
        let inputValueAux = [...inputValue]

        if (!inputValueAux.includes(value) || value === ''){
            inputValueAux[i] = value

            inputValueAux = inputValueAux.filter((x) => x !== '')
            inputValueAux.push('')
            setInputValue([...inputValueAux])
        }

        inputRefs.current = inputValue.map((_, i) => inputRefs.current[i] ?? React.createRef());
    }

    return (
        <GenericPopup onClose={onClose} title='Criar transição'>
            <div id="popup-transicao-input-list">
                {inputValue.map((_, i) => (
                <input
                    key={i} // Important for React lists
                    className="generic-popup-input"
                    value={inputValue[i]}
                    onChange={(e) => handleInputChange(e, i)}
                    ref={inputRefs.current[i]}
                />
                ))}
            </div>
            <button
                className="canvas-button generic-popup-button"
                onClick={() => {
                    popupInput.onSubmit(inputValue.filter(x => x !== ''))
                    onClose()
                }}
            >
                Criar
            </button>
        </GenericPopup>
    );
  };
  
  export default CreateTransitionPopup;