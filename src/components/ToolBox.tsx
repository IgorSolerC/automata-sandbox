// Google Material Icons
import CursorIcon from "../symbols/cursor_icon";
import TrashIcon from "../symbols/trash_icon";
import UndoIcon from "../symbols/undo_icon";
import RedoIcon from "../symbols/redo_icon";
import MoveIcon from "../symbols/move_icon";
import TransitionIcon from "../symbols/transition_icon";
import AddCircleIcon from "../symbols/add_circle_icon";
import OpenPanelIcon from "../symbols/open_panel_icon";
import ClosePanelIcon from "../symbols/close_panel_icon";
import SaveIcon from "../symbols/save_icon";
import LoadFileIcon from "../symbols/load_file_icon";
import RegexIcon from "../symbols/regex_icon";
import NewNoteIcon from "../symbols/new_note_icon";
import MinimizeAutomataIcon from "../symbols/minimize_automata_icon";

// Libaries
import React, { useRef, useEffect, useState } from "react";

// Enums
import { CanvasTools } from "../enums/CanvasToolsEnum";

// Contexts
import { ToolboxProvider, useToolboxContext } from "../contexts/ToolboxContext";
import NextIcon from "../symbols/next_icon";

/*

          TOOL BOX 

*/
interface ToolboxProps {
    currentCanvasToolRef: React.MutableRefObject<number>;
    handleImportFile: () => void;
    handleSaveFile: () => void;
    Undo: () => void;
    Redo: () => void;
}

const Toolbox: React.FC<ToolboxProps> = ({ currentCanvasToolRef, handleImportFile, handleSaveFile, Undo, Redo }) => {
    const { selectedToolState, setSelectedToolState } = useToolboxContext();
    const [isExpanded, setIsExpanded] = useState(false)


    const handleToolButtonClick = (tool: number) => {
      setSelectedToolState(tool);
      currentCanvasToolRef.current = tool;
    };
  
    return (
      <div id="toolbox">
        <div
          className='navbar-row'
        >
          <button id="pointer" title="Pointer"
            className={
              "canvas-button navbar-button " +
              (selectedToolState === CanvasTools.POINTER ? "selected" : "")
            }
            onClick={() => handleToolButtonClick(CanvasTools.POINTER)}
          >
            <CursorIcon />
          </button>
          {isExpanded &&
            <button id="save" title="Save File"
              className={
                "canvas-button navbar-button extra-option "
                // + (selectedToolState === CanvasTools.POINTER ? "selected" : "")
              }
              onClick={handleSaveFile}
            >
              <SaveIcon/>
            </button>
          }
        </div>

        <div
          className='navbar-row'
        >
          <button id="transition" title="Transition"
            className={
              "canvas-button navbar-button " +
              (selectedToolState === CanvasTools.TRANSITION ? "selected" : "")
            }
            onClick={() => handleToolButtonClick(CanvasTools.TRANSITION)}
            >
            <TransitionIcon />
          </button>
          {isExpanded &&
            <button id="load" title="Load File"
              className={
                "canvas-button navbar-button extra-option "
                // + (selectedToolState === CanvasTools.POINTER ? "selected" : "")
              }
              onClick={handleImportFile}
            >
              <LoadFileIcon/>
            </button>
          }
        </div>

        <div
          className='navbar-row'
        >
          <button id="add_state" title="Add State" 
            className={
              "canvas-button navbar-button " +
              (selectedToolState === CanvasTools.ADD_STATE ? "selected" : "")
            }
            onClick={() => handleToolButtonClick(CanvasTools.ADD_STATE)}
          >
            <AddCircleIcon />
          </button>
          {isExpanded &&
            <button id="add-note" title="Create Note"
              className={
                "canvas-button navbar-button extra-option "
                + (selectedToolState === CanvasTools.NOTE ? "selected" : "")
              }
              onClick={() => handleToolButtonClick(CanvasTools.NOTE)}
            >
              <NewNoteIcon/>
            </button>
          }
        </div>

        <div
          className='navbar-row'
        >
          <button id="eraser" title="Eraser"
            className={
              "canvas-button navbar-button " +
              (selectedToolState === CanvasTools.ERASER ? "selected" : "")
            }
            onClick={() => handleToolButtonClick(CanvasTools.ERASER)}
          >
            <TrashIcon />
          </button>
          {isExpanded &&
            <button id="regex" title="Create from RegEx" disabled
              className={
                "canvas-button navbar-button extra-option "
                // + (selectedToolState === CanvasTools.POINTER ? "selected" : "")
              }
              onClick={() => {}}
            >
              <RegexIcon/>
            </button>
          }
        </div>

        <div
          className='navbar-row'
        >
          <button id="move" title="Move"
            className={
              "canvas-button navbar-button " +
              (selectedToolState === CanvasTools.MOVE ? "selected" : "")
            }
            onClick={() => handleToolButtonClick(CanvasTools.MOVE)}
          >
            <MoveIcon/>
          </button>
          {isExpanded &&
            <button id="minimize-automara" title="Minimize Automata" disabled
              className={
                "canvas-button navbar-button extra-option "
                // + (selectedToolState === CanvasTools.POINTER ? "selected" : "")
              }
              onClick={() => {}}
            >
              <MinimizeAutomataIcon/>
            </button>
          }
        </div>

        <button id="undo" title="Undo"
          className="canvas-button navbar-button undo"
          onClick={Undo}
        >
          <UndoIcon />
        </button>

        <button id="redo" title="Redo"
          className="canvas-button navbar-button redo"
          onClick={Redo}
        >
          <RedoIcon />
        </button>

        <button id="expand-menu" title={isExpanded ? "Minimize Menu" : "Expand Menu"}
          className="canvas-button navbar-button no-background"
          onClick={() => {
            setIsExpanded(!isExpanded)
          }}
        >
          {isExpanded
            ?
            <ClosePanelIcon />
            :
            <OpenPanelIcon />
          }
        </button>
      </div>
    );
  };
  
  export default Toolbox;