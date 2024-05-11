// Libaries
import React, { useRef, useEffect, useState } from "react";

// Components
import GenericPopup from "../GenericPopup"; 


interface SaveAutomataFilePopupProps {
    popupInput: {
        onSubmit: (newName: string) => void 
    }
    onClose: () => void
}

const SaveAutomataFilePopup: React.FC<SaveAutomataFilePopupProps> = ({
    popupInput,
    onClose,
}) => { 
    // const [inputValue, setInputValue] = useState([''])

    const BASE_FILE_NAME = 'MeuAutomato.jff'
    const [inputValue, setInputValue] = useState(BASE_FILE_NAME)

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

    return (
        <GenericPopup onClose={onClose} title='Salvar Autômato'>
            <input  className='generic-popup-input'
                placeholder="Nome do arquivo .jff"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyUp={(e) => {
                    if (e.keyCode === 27) {
                        onClose()
                    }
                }}
            />
            <button
                className="canvas-button generic-popup-button"
                onClick={() => {
                    let finalName;

                    if (inputValue){
                        finalName = inputValue.endsWith('.jff') ? inputValue : inputValue + '.jff'
                    } else {
                        finalName = BASE_FILE_NAME
                    }
                    popupInput.onSubmit(finalName)
                    onClose()
                }}
            >
                Salvar
            </button>
        </GenericPopup>
    );
  };
  
  export default SaveAutomataFilePopup;