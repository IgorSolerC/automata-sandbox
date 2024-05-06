// Google Material Icons
import ErrorIcon from "../symbols/error_icon";

// Libaries
import React, { useRef, useEffect, useState } from "react";


interface GenericPopupProps {
  title: string
  onClose: () => void
  children: any;
}

const GenericPopup: React.FC<GenericPopupProps> = ({
  title,
  onClose,
  children,
}) => { 

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      console.log(e)
      if (e.keyCode === 27) {
        onClose()
      }
    };
    window.addEventListener('keyup', handleKeyPress);

    return () => { 
        window.removeEventListener('keyup', handleKeyPress);
    };
  }, []);

    return (
      <div id='generic-popup-main-div'>
        <div id='generic-popup'>
          <div id='generic-popup-close-div'>
            <span id='generic-popup-title'>
              {title}
            </span>
            <div className='generic-popup-close-button'
              onClick={onClose}
            >
                <ErrorIcon/>
            </div>
          </div>
          <div id='generic-popup-chindren-div'>
            {children}
          </div>
        </div>
        <div id='generic-popup-outside-div'
          // onClick={onClose}
        />
      </div>
    );
  };
  
  export default GenericPopup;