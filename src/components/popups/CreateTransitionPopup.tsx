// Libaries
import React, { useRef, useEffect, useState } from "react";

// Components
import GenericPopup from "../GenericPopup"; 

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
    const getInitialInputValue = () =>{
        let labelsList = popupInput.previousLabels.filter(x => x !== 'λ' && x.length === 1)
        return !labelsList.includes('') ? labelsList.concat(['']) : labelsList
    }
    
    const [inputValue, setInputValue] = useState(getInitialInputValue)
    const inputRefs = useRef([React.createRef()] as React.RefObject<HTMLInputElement>[]); // Array of refs

    const [triggerRerender, setTriggerRerender] = useState(['do not touch >:('])
    const [addEmptyTransition, setAddEmptyTransition] = useState(popupInput.previousLabels.includes('λ'))

    const [blinkingInputs, setBlinkingInputs] = useState<number[]>([]); 

    const [regexValue, setRegexValue] = useState(popupInput.previousLabels.find(label => label.length > 1) || '') ;
    const [isRegexValid, setIsRegexValid] = useState(true);

    const handleRegexChange = (e: any) => {
        const value = e.target.value;
        setRegexValue(value);
        setIsRegexValid(validateRegex(value));
    };


    const validateRegex = (value: string) => {
        //Só podemos aceitar Regex que dão match em um único símbolo por vez, como "[a-z]"
        //Não podemos aceitar coisas como "teste", já que teria q dar match em mais de um símbolo
        // 🕯️🕯️🕯️ sagrado, não encoste 🕯️🕯️🕯️
        const parts = value.split('|');
        const validRegex = /^(?:\[\^?(?:\\.|[^\\\-\]]|-\]|-\[|(?<=\[)-?(?:[^\]-][^-]?)*-?(?=\]))\]$|\\[wdsWDS]$|^.$|^[^\\[])$/;

        return parts.every(part => validRegex.test(part));
        // 🕯️🕯️🕯️ sagrado, não encoste🕯️🕯️🕯️
    };

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

        return () => { 
            document.removeEventListener('keydown', handleKeyPress);
        };
    }, [])

    useEffect(() => {
        // Initialize an empty ref for each input
        inputRefs.current = inputValue.map((_, i) => inputRefs.current[i] ?? React.createRef());
        setTriggerRerender([...triggerRerender])
    }, [inputValue])

    useEffect(() => {
        // Initialize an empty ref for each input
        // Auto-focus logic from previous solutions:
        const lastInputIndex = inputValue.length - 1;
        if (inputRefs.current[lastInputIndex]) {
            inputRefs.current[lastInputIndex].current?.focus();                
        }
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
        } else if (inputValueAux.includes(value)){
            // Signal that this input needs the blinking effect
            setBlinkingInputs([...blinkingInputs, i]); 

            // Optionally, remove the blink effect after a short duration:
            let ANIMATION_LENGTH = 0.4
            let LOOP_COUNT = 2
            setTimeout(() => {
                setBlinkingInputs(blinkingInputs.filter(index => index !== i));
            }, (1000*ANIMATION_LENGTH)*LOOP_COUNT); // Remove the effect after 500ms
        }

        inputRefs.current = inputValue.map((_, i) => inputRefs.current[i] ?? React.createRef());
    }

    return (
        <GenericPopup onClose={onClose} title='Criar Transição'>
            <div id="popup-transicao-input-list">
                {inputValue.map((_, i) => (
                <input
                    key={i} // Important for React lists
                    className={`transition-input generic-popup-input ${blinkingInputs.includes(i) ? 'blink' : ''}`} // Add blink conditionally
                    value={inputValue[i]}
                    onChange={(e) => {
                        handleInputChange(e, i)
                    }}
                    ref={inputRefs.current[i]}
                    placeholder='λ'
                />
                ))}
            </div>
            <input  
                className='generic-popup-input' 
                placeholder="RegEx (Opcional)"
                value={regexValue}
                onChange={handleRegexChange}
                onKeyUp={(e) => {
                    if (e.keyCode === 27) {
                        onClose()
                    }
                }}
            />
            {!isRegexValid && <div className="error-message">RegEx inválido</div>}

            <div>
                <label>
                    <input type='checkbox'
                        checked={addEmptyTransition}
                        onClick={() => setAddEmptyTransition(!addEmptyTransition)}
                        onKeyUp={(e) => {
                            if (e.keyCode === 27) {
                                onClose()
                            }
                        }}
                    />
                    Inclui transição vazia
                </label>
            </div>
            <button
                className="canvas-button generic-popup-button"
                disabled={!((inputValue.filter(x => x !== '').length > 0) || addEmptyTransition || (isRegexValid && regexValue.length > 1))}
                onClick={() => {
                    let finalLabels = inputValue.filter(x => x !== '' && x !== 'λ')

                    if (addEmptyTransition)
                        finalLabels.push('λ')

                    if(regexValue && isRegexValid)
                        finalLabels.push(regexValue);

                    popupInput.onSubmit(finalLabels)
                    onClose()
                }}
            >
                Criar
            </button>
        </GenericPopup>
    );
  };
  
  export default CreateTransitionPopup;