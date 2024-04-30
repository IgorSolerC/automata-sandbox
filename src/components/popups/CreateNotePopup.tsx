// Libaries
import React, { useRef, useEffect, useState } from "react";

// Components
import GenericPopup from "../GenericPopup"; 


interface CreateNotePopupProps {
    popupInput: {
        onSubmit: (newName: string) => void
        previousText: string 
    }
    onClose: () => void
}

const CreateNotePopup: React.FC<CreateNotePopupProps> = ({
    popupInput,
    onClose,
}) => { 
    // const [inputValue, setInputValue] = useState([''])
    const [inputValue, setInputValue] = useState(popupInput.previousText)

    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.keyCode === 13 && !e.shiftKey) { // Enter key, but not with Shift
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
    }, []);
    

    return (
        <GenericPopup onClose={onClose} title='Cria nota'>
            <textarea  className='generic-popup-textarea'
                placeholder="Sua nota..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                // style={{resize: 'none'}}
            />
            <button
                className="canvas-button generic-popup-button"
                onClick={() => {
                    popupInput.onSubmit(inputValue)
                    onClose()
                }}
            >
                Criar
            </button>
        </GenericPopup>
    );
  };
  
  export default CreateNotePopup;