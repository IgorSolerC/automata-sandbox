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



interface ToolboxProps {
}

const Toolbox: React.FC<ToolboxProps> = () => { 
    return (
      <div id='generic-popup-main-div'>
        <div id='generic-popup'>
        </div>
      </div>
    );
  };
  
  export default Toolbox;