import React from 'react';

interface InputModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (label: string) => void;
}

const InputModal: React.FC<InputModalProps> = ({ show, onClose, onSubmit }) => {
  let inputRef = React.createRef<HTMLInputElement>();

  const handleSubmit = () => {
    if (inputRef.current) {
      onSubmit(inputRef.current.value);
      onClose();
    }
  };

  if (!show) {
    return null;
  }

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>Enter Label</h2>
        <input type="text" ref={inputRef} />
        <button onClick={handleSubmit}>Submit</button>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default InputModal;
