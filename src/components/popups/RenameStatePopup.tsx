// Libaries
import React, { useRef, useEffect, useState } from "react";

// Components
import GenericPopup from "../GenericPopup"; 


interface RenameStatePopupProps {
    popupInput: {
        onSubmit: (newName: string) => void
        previousName: string 
    }
    onClose: () => void
}

const RenameStatePopup: React.FC<RenameStatePopupProps> = ({
    popupInput,
    onClose,
}) => { 
    // const [inputValue, setInputValue] = useState([''])
    const [inputValue, setInputValue] = useState(popupInput.previousName)

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
        <GenericPopup onClose={onClose} title='Renomear Estado'>
            <input  className='generic-popup-input'
                placeholder="Rótulo do Estado"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
            />
            <button
                className="canvas-button generic-popup-button"
                onClick={() => {
                    popupInput.onSubmit(inputValue)
                    onClose()
                }}
            >
                Renomear
            </button>
        </GenericPopup>
    );
  };
  
  export default RenameStatePopup;