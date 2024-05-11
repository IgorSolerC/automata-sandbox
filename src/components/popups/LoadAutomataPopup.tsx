// Libaries
import React, { useRef, useEffect, useState } from "react";

// Components
import GenericPopup from "../GenericPopup"; 


interface LoadAutomataPopupProps {
    popupInput: any
    onClose: () => void
    onLoadAutomata: (fileContent: string) => void // Callback to load the automata
}

const LoadAutomataPopup: React.FC<LoadAutomataPopupProps> = ({
    popupInput,
    onClose,
    onLoadAutomata
}) => {
    const [selectedFile, setSelectedFile] = useState<string>();
    
    const files = [
        {fileName: "BinariosPares.jff", displayName: 'Binários pares'},
        {fileName: "teste-minimize-3.jff", displayName: 'Minimizável Básico'},
        {fileName: "teste-minimize-2.jff", displayName: 'Minimizável'},
        {fileName: "teste-transicoes-bilaterais.jff", displayName: 'Flor'},
        {fileName: "email-validator.jff", displayName: 'Validador de Email'},
    ];

    const handleFileChange = (filename: string) => {
        setSelectedFile(filename);
        fetch(`${process.env.PUBLIC_URL}/saved-automata/${filename}`)  // Use PUBLIC_URL for it to actually work
            .then(response => response.text())
            .then(data => {
                onLoadAutomata(data);
                onClose();  // Close the popup after loading
            })
            .catch(error => console.error('Error loading the automata file:', error));
    };

    return (
        <GenericPopup onClose={onClose} title='Carregar Autômato'>
            <select className="generic-popup-select"
                onChange={(e) => {
                    let value = e.target.value
                    console.log('e.target.value')
                    console.log(value)
                    handleFileChange(value)
                }}
                value={selectedFile}
            >
                <option selected disabled hidden>Selecione exemplo</option>
                {files.map((file, index) => (
                    <option value={file.fileName}>{file.displayName}</option>
                ))}
            </select>
            <button className="canvas-button generic-popup-button"
                style={{
                    width: '150px'
                }}
                onClick={popupInput.onSubmit}
            >
                Procurar no Computador
            </button>
        </GenericPopup>
    );
};

export default LoadAutomataPopup;