// Google Material Icons
import CursorIcon from "../symbols/cursor_icon";
import TrashIcon from "../symbols/trash_icon";
import UndoIcon from "../symbols/undo_icon";
import RedoIcon from "../symbols/redo_icon";
import MoveIcon from "../symbols/move_icon";
import TransitionIcon from "../symbols/transition_icon";
import AddCircleIcon from "../symbols/add_circle_icon";

// Libaries
import React, { useRef, useEffect, useState } from "react";


// Enums
import { CanvasTools } from "../enums/CanvasToolsEnum";

// Contexts
import { ToolboxProvider, useToolboxContext } from "../contexts/ToolboxContext";

/*

          TOOL BOX 

*/
interface ToolboxProps {
    currentCanvasToolRef: React.MutableRefObject<number>;
}

const Toolbox: React.FC<ToolboxProps> = ({ currentCanvasToolRef }) => {
    const { selectedToolState, setSelectedToolState } = useToolboxContext();
  
    const handleToolButtonClick = (tool: number) => {
      setSelectedToolState(tool);
      currentCanvasToolRef.current = tool;
    };
  
    return (
      <div id="toolbox">
        <button
          id="pointer"
          className={
            "canvas-button navbar-button " +
            (selectedToolState === CanvasTools.POINTER ? "selected" : "")
          }
          onClick={() => handleToolButtonClick(CanvasTools.POINTER)}
          title="Pointer"
        >
          <CursorIcon />
        </button>
        <button
          id="transition"
          className={
            "canvas-button navbar-button " +
            (selectedToolState === CanvasTools.TRANSITION ? "selected" : "")
          }
          onClick={() => handleToolButtonClick(CanvasTools.TRANSITION)}
          title="Transition"
        >
          <TransitionIcon />
        </button>
        <button
          id="add_state"
          className={
            "canvas-button navbar-button " +
            (selectedToolState === CanvasTools.ADD_STATE ? "selected" : "")
          }
          onClick={() => handleToolButtonClick(CanvasTools.ADD_STATE)}
          title="Add State"
        >
          <AddCircleIcon />
        </button>
        <button
          id="move"
          className={
            "canvas-button navbar-button " +
            (selectedToolState === CanvasTools.MOVE ? "selected" : "")
          }
          onClick={() => handleToolButtonClick(CanvasTools.MOVE)}
          title="Move"
        >
          <MoveIcon/>
        </button>
        <button
          id="eraser"
          className={
            "canvas-button navbar-button " +
            (selectedToolState === CanvasTools.ERASER ? "selected" : "")
          }
          onClick={() => handleToolButtonClick(CanvasTools.ERASER)}
          title="Eraser"
        >
          <TrashIcon />
        </button>
        <button
          id="undo"
          className="canvas-button navbar-button undo"
          onClick={() => {
            console.log("Undo Clicado");
          }}
          title="Undo"
        >
          <UndoIcon />
        </button>
        <button
          id="redo"
          className="canvas-button navbar-button redo"
          onClick={() => {
            console.log("do Clicado");
          }}
          title="Redo"
        >
          <RedoIcon />
        </button>
      </div>
    );
  };
  
  export default Toolbox;