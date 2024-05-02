// Css
import "./Canvas.scss";

// Components
import Toolbox from "./ToolBox"; 
import AutomataInput from "./AutomataInput";
import CreateTransitionPopup from "./popups/CreateTransitionPopup";
import RenameStatePopup from "./popups/RenameStatePopup";
import CreateNotePopup from "./popups/CreateNotePopup";
import SaveAutomataFilePopup from "./popups/SaveAutomataFilePopup";

// Google Material Icons
import NextIcon from "../symbols/next_icon";
import PrevIcon from "../symbols/prev_icon";
import FastforwardIcon from "../symbols/fastforward_icon";
import PlayIcon from "../symbols/play_icon";
import PlusIcon from "../symbols/plus_icon";
import MinusIcon from "../symbols/minus_icon";
import ErrorIcon from "../symbols/error_icon";

// Libaries
import React, { useRef, useEffect, useState, useMemo } from "react";
import p5 from "p5";
import { XMLParser } from 'fast-xml-parser';
import builder from 'xmlbuilder';

// Objects
import { Automata } from "../models/Automata";
import { State } from "../models/State";
import { Transition } from "../models/Transition";
import { Note } from "../models/Note";

// Enums
import { CanvasActions } from "../enums/CanvasActionsEnum";
import { CanvasTools } from "../enums/CanvasToolsEnum";
import { PopupType } from "../enums/PopupEnum";
import { ColorThemes } from "../enums/ColorThemesEnum";

// Constants
import { CanvasColorsLight, CanvasColorsDark } from "../constants/CanvasConstants"; 

// Contexts
import { ToolboxProvider, useToolboxContext } from "../contexts/ToolboxContext";
import { AutomataInputProvider, useAutomataInputContext } from "../contexts/AutamataInputContext";

// let canvasObject: p5 | null = null; // Variável para armazenar o sketch

let automata: Automata = new Automata();

const options = {
  attributeNamePrefix: "", // Removes any prefix for attributes
  ignoreAttributes: false, // Ensures attributes are not ignored
  trimValues: false, // Add any other options you need
};

const parser = new XMLParser(options);


const Canvas: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const p5Instance = useRef<p5 | null>(null);
  const automataRef = useRef(automata);

  let contextMenu: p5.Element;
  // let slider: p5.Element;
  
  let contextMenuIsOpen: boolean = false;

  // Zoom / Movement
  var cameraZoomRef = useRef(1)
  var globalTranslateX = 0
  var globalTranslateY = 0

  // Tool selecionada
  const { setSelectedToolState } = useToolboxContext();
  
  // Arrays de States
  let clickedState: State | null;
  let selectedStates: State[] = [];
  let nearState: State | null;
  let highlightedState: State | null;
  let selectedTransitions: Transition[] = [];
  let clickedTransition: Transition | null;
  let clickedNote:  Note | null;
  // Enums
  let currentCanvasActionRef = useRef(CanvasActions.NONE);
  // let currentCanvasToolRef.current: number = CanvasTools.POINTER
  const currentCanvasToolRef = useRef(CanvasTools.POINTER);
  
  const [simulationMessage, setSimulationMessage] = useState('');

  const [simulationStates, setSimulationStates] = useState<State[]>([]);
  const simulationStatesRef = useRef(simulationStates);
  
  const [simulationInputId, setSimulationInputId] = useState<(number | null)>(null);
  const simulationInputIdRef = useRef(simulationInputId);
  const [simulationInputText, setSimulationInputText] = useState<(string)>("");
  const [simulationTransitions, setSimulationTransitions] = useState<(Transition | null)[]>([]);
  const simulationTransitionsRef = useRef(simulationTransitions);
  
  const [simulationIndex, setSimulationIndex] = useState<number>(0);
  const simulationIndexRef = useRef(simulationIndex);
  
  const [openPopup, setOpenPopup] = useState<PopupType>(PopupType.NONE);
  const openPopupRef = useRef(openPopup);

  const [popupInput, setPopupInput] = useState<any>();

  const [zoomTarget, setZoomTarget] = useState<State>();
  const zoomTargetRef = useRef(zoomTarget);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedColorTheme, setSelectedColorTheme] = useState(localStorage.getItem('color') === "1" ? ColorThemes.LIGHT : ColorThemes.DARK)

  const updateCanvasColorEnum = () => {
    if (selectedColorTheme === ColorThemes.LIGHT){
      return CanvasColorsLight
    } else if (selectedColorTheme === ColorThemes.DARK){
      return CanvasColorsDark
    }
    return CanvasColorsDark
  }
  const CanvasColorsRef = useRef(updateCanvasColorEnum());

  const updateRootColor = () =>{
    const rootElement = document.documentElement;
    if (selectedColorTheme === ColorThemes.LIGHT){
      rootElement.setAttribute('color-mode', 'light');
    } else if (selectedColorTheme === ColorThemes.DARK) {
      rootElement.setAttribute('color-mode', 'dark');
    } else
      rootElement.setAttribute('color-mode', 'dark');
  }

  useEffect(() => {
    simulationStatesRef.current = simulationStates;
  }, [simulationStates]);



  let selectedStateMouseOffset: any; // {'q1': {'x': 10, 'y': -10}, 'q2': {'x': 10, 'y': -10}}
  let selectedNoteMouseOffset: any;
  
  // Selection box variables
  let selectionStarterY: number = 0; 
  let selectionStarterX: number = 0;
  let selectionX: number = 0;
  let selectionY: number = 0;
  let selectionDistanceX: number = 0;
  let selectionDistanceY: number = 0;

  let transitioning = false;
  let isCursorOverNoteResizeHandle = false;
  let targetZoom: number;
  let targetTranslateX: number;
  let targetTranslateY: number;

  let currentZoom = cameraZoomRef.current; // Initialize with current zoom
  let currentTranslateX = globalTranslateX; // Initialize with current translation X
  let currentTranslateY = globalTranslateY; // Initialize with current translation Y

  let undoInterval: any = null;

  const getMouseXScaled = (p: p5) => {
    return (p.mouseX / cameraZoomRef.current)
  }
  const getMouseYScaled = (p: p5) => {
    return (p.mouseY / cameraZoomRef.current)
  }

  const getMouseX = (p: p5) => {
    return getMouseXScaled(p) - globalTranslateX
  }
  const getMouseY = (p: p5) => {
    return getMouseYScaled(p) - globalTranslateY
  }
  const getPreviousMouseX = (p: p5) => {
    return (p.pmouseX / cameraZoomRef.current) - globalTranslateX
  }
  const getPreviousMouseY = (p: p5) => {
    return (p.pmouseY / cameraZoomRef.current) - globalTranslateY
  }

  function roundNumber(num: number, factor: number){
    return num - (num % factor)
  }

  const createNewState = (allStates: State[], p: p5) => {
    // Check se o novo estado criado estaria overlaping com um estágo exstente
    nearState =
      allStates.find((state) => {
        return (
          p.dist(state.x, state.y, getMouseX(p), getMouseY(p)) <
          state.diameter // Note que este não é "/2", isso é proposital
        );
      }) || null;

    if (!nearState) {
      const qStates = allStates.filter(state => state.id.startsWith("q"));
      // Gera ID do novo estado
      var id: string;
      var id_number: number;
      if (!qStates.length) {
        id_number = 0;
      } else {
        let lastest_id = qStates[qStates.length - 1].id;
        let id_number_string = lastest_id.slice(1);
        id_number = parseInt(id_number_string) + 1;
      }
      
      id = `q${id_number}`;
      while (allStates.some(state => state.id === id_number.toString() || state.label === id)) {
        id_number++;
        id = `q${id_number}`;
      }
      // Cria novo estado
      automataRef.current.addState(
        id_number.toString(),
        getMouseX(p),
        getMouseY(p),
        CanvasColorsRef.current.DEFAULT_STATE,
        CanvasColorsRef.current.DEFAULT_STATE_SECONDARY,
        false,
        false,
        id
      );
      handleAutomataChange()
    }
  }

  const createNewNote = (p: p5) => {
    // let text = prompt("Digite o texto da nota: ");
    // if(text)
    // {
    //   let note = automataRef.current.addNote(getMouseX(p), getMouseY(p), text, 200, 100, [""], 16, CanvasColorsRef.current.NOTES, CanvasColorsRef.current.NOTES_SECONDARY);
    //   calculateNoteLines(note, p)
    // } else{
    //   alert("A nota não pode estar vazia.");
    // }

    setOpenPopup(PopupType.CREATE_NOTE)
    openPopupRef.current = PopupType.CREATE_NOTE

    const onSubmit = (noteText: string) => {
      let note = automataRef.current.addNote(getMouseX(p), getMouseY(p), noteText, 200, 100, [""], 16, CanvasColorsRef.current.NOTES, CanvasColorsRef.current.NOTES_SECONDARY);
      calculateNoteLines(note, p)
    }
    setPopupInput({onSubmit, previousText:''})


  }

  // Check colision
  // const collidePointArc = (pointX: number, pointY: number, ellipseX: number, ellipseY: number, ellipseWidth: number, ellipseHeight: number, rotation: number, arcStart: number, arcEnd: number) => {   
  //   // 2D
  //   var ellipseRadiusX = ellipseWidth / 2, ellipseRadiusY = ellipseHeight / 2;

  //   // Apply the rotation to the point
  //   var cosR = Math.cos(rotation);
  //   var sinR = Math.sin(rotation);
  //   var xDiff = pointX - ellipseX;
  //   var yDiff = pointY - ellipseY;
  //   var rotatedX = cosR * xDiff + sinR * yDiff + ellipseX;
  //   var rotatedY = -sinR * xDiff + cosR * yDiff + ellipseY;

  //   // Calculate the angle from the center of the ellipse to the point
  //   var angle = Math.atan2(rotatedY - ellipseY, rotatedX - ellipseX);

  //   // Calculate the angle within the specified arc range
  //   if (arcStart < 0) arcStart += 2 * Math.PI;
  //   if (arcEnd < 0) arcEnd += 2 * Math.PI;
  //   if (arcEnd < arcStart) {
  //       angle += 2 * Math.PI; // Fiz essa linha na mão, talvez esteja errada
  //       arcEnd += 2 * Math.PI;
  //   }

  //   // Check if the angle is within the specified arc range
  //   if (angle >= arcStart && angle <= arcEnd) {
  //       // Discard the points outside the bounding box of the rotated ellipse
  //       if (rotatedX > ellipseX + ellipseRadiusX || rotatedX < ellipseX - ellipseRadiusX || rotatedY > ellipseY + ellipseRadiusY || rotatedY < ellipseY - ellipseRadiusY) {
  //           return false;
  //       }

  //       // Compare the point to its equivalent on the rotated ellipse
  //       var xx = rotatedX - ellipseX, yy = rotatedY - ellipseY;
  //       var eyy = ellipseRadiusY * Math.sqrt(Math.abs(ellipseRadiusX * ellipseRadiusX - xx * xx)) / ellipseRadiusX;

  //       return yy <= eyy && yy >= -eyy;
  //   }

  //   return false;
  // };

  const collidePointArc = (px: number, py: number, cx: number, cy: number, width: number, height: number, angle: number, startAngle: number, endAngle: number) => {
    // Adjustments for inversion based on height
    let adjustedAngle = angle;
    if (height < 0) {
      adjustedAngle += Math.PI;  // Flip the arc if height indicates a reverse curvature
      height = -height;  // Use the absolute height for calculations
    }
  
    // Convert point to ellipse-centric coordinates
    const cosAngle = Math.cos(-adjustedAngle);
    const sinAngle = Math.sin(-adjustedAngle);
    const dx = (px - cx) * cosAngle - (py - cy) * sinAngle;
    const dy = (px - cx) * sinAngle + (py - cy) * cosAngle;
  
    // Check if point is within ellipse using the ellipse equation
    const ellipseRadiusX = width / 2;
    const ellipseRadiusY = height / 2;
    const ellipseEquation = (dx * dx) / (ellipseRadiusX * ellipseRadiusX) + (dy * dy) / (ellipseRadiusY * ellipseRadiusY);
  
    // Determine the angle for the point relative to the ellipse center
    const pointAngle = Math.atan2(dy, dx);
    let normalizedStart = startAngle % (2 * Math.PI);
    let normalizedEnd = endAngle % (2 * Math.PI);
    if (normalizedEnd < normalizedStart) {  // Adjust if the start is greater than the end
      normalizedEnd += 2 * Math.PI;
    }
    let normalizedPointAngle = (pointAngle < 0) ? 2 * Math.PI + pointAngle : pointAngle;
  
    // Check if the point's angle lies within the arc span
    return ellipseEquation <= 1 &&
           normalizedPointAngle >= normalizedStart &&
           normalizedPointAngle <= normalizedEnd;
  }

  const collidePointLine = (px: number, py: number, x1: number, y1: number, x2: number, y2: number, tolerance: number) => {
    let dx = x2 - x1;
    let dy = y2 - y1;
    let length = Math.sqrt(dx * dx + dy * dy);
    
    // Normalize the direction vector
    dx /= length;
    dy /= length;
  
    // Project the point onto the line (px, py to x1, y1)
    let t = dx * (px - x1) + dy * (py - y1);
  
    // Ensure that t is within the bounds of the line segment
    t = Math.max(0, Math.min(length, t));
  
    // Get the closest point on the line
    let closestX = x1 + t * dx;
    let closestY = y1 + t * dy;
  
    // Calculate the distance from the closest point on the line to the point
    let distX = closestX - px;
    let distY = closestY - py;
    let distance = Math.sqrt(distX * distX + distY * distY);
  
    return distance <= tolerance;
  }

  const getClickedTransition = (p: p5) => {
    let clickedTransitionTemp = null

    // Desenha transições
    automataRef.current.getTransitions().forEach((transition) => {
      const start = automataRef.current.findState(transition.from.id);
      const end = automataRef.current.findState(transition.to.id);
      let transitionHeight = transition.height
      if (start && end) {
        // Transições para o mesmo estado
        if (start.id === end.id){
          const collidePointCircleSegment = (px: number, py: number, cx: number, cy: number, radius: number, startAngle: number, endAngle: number) => {
            const distX = px - cx;
            const distY = py - cy;
            const distance = Math.sqrt(distX * distX + distY * distY);
            const angle = Math.atan2(distY, distX);
        
            // Normalize angles
            const normalizedStart = startAngle % (2 * Math.PI);
            const normalizedEnd = endAngle % (2 * Math.PI);
            const normalizedPointAngle = (angle < 0) ? 2 * Math.PI + angle : angle;
        
            return distance <= radius &&
                   (
                     (normalizedStart < normalizedEnd) ? 
                     (normalizedPointAngle >= normalizedStart && normalizedPointAngle <= normalizedEnd) :
                     (normalizedPointAngle >= normalizedStart || normalizedPointAngle <= normalizedEnd)
                   );
          };

          const loopRadius = start.diameter / 2;
          const cx = start.x;
          const cy = start.y - loopRadius; // Adjusted center y-coordinate for the loop

          if (collidePointCircleSegment(getMouseX(p), getMouseY(p), cx, cy, loopRadius, Math.PI/2, Math.PI/0.255)) {
              clickedTransitionTemp = transition;
              return;
          }
        }
        else {
          // Handle transitions to different states
          const angle = Math.atan2(end.y - start.y, end.x - start.x);
          const radius = start.diameter / 2;
          const offsetRadius = 30; // additional radius to avoid overlap
          let offsetX = radius * Math.cos(angle);
          let offsetY = radius * Math.sin(angle);
  
          let curveOffsetX = offsetRadius * Math.cos(angle + Math.PI / 2); // perpendicular to the line
          let curveOffsetY = offsetRadius * Math.sin(angle + Math.PI / 2);
  
          const middleX = (start.x + end.x) / 2 + curveOffsetX;
          const middleY = (start.y + end.y) / 2 + curveOffsetY;
  
          const reverseExists = automataRef.current.getTransitions().some(t => t.from.id === end.id && t.to.id === start.id);
          
          if (reverseExists) {
            curveOffsetX *= -1; // Invert the curve direction for one of the transitions
            curveOffsetY *= -1;
            
            // Adjusted collision detection
            const transitionLenght = p.dist(start.x, start.y, end.x, end.y);
            const COLISION_ERROR_MARGIN = 20;
            let outerColisionWidth = transitionLenght + COLISION_ERROR_MARGIN;
            let outerColisionHeight = offsetRadius + COLISION_ERROR_MARGIN;
            let innerColisionWidth = transitionLenght - COLISION_ERROR_MARGIN;
            let innerColisionHeight = offsetRadius - COLISION_ERROR_MARGIN;
            
            if (collidePointArc(getMouseX(p), getMouseY(p), middleX, middleY, outerColisionWidth, outerColisionHeight + COLISION_ERROR_MARGIN, angle, 0, Math.PI) ||
            collidePointArc(getMouseX(p), getMouseY(p), middleX, middleY, innerColisionWidth, innerColisionHeight + COLISION_ERROR_MARGIN, angle, Math.PI, 0)) {
              let actualTransition = automataRef.current.getTransitions().find(t => t.to.id === transition.from.id && t.from.id === transition.to.id)
              clickedTransitionTemp = actualTransition;
              return;
            }
          } else {
            const tolerance = 10; // Pixel tolerance for clicking the line
            if (collidePointLine(getMouseX(p), getMouseY(p), start.x + offsetX, start.y + offsetY, end.x - offsetX, end.y - offsetY, tolerance)) {
              clickedTransitionTemp = transition;
              return;
            }
          }
        }
      }
    });
    return clickedTransitionTemp
  }

  /* 
   * Rotaciona um ponto em volta de outro ponto (ancora)
   * Como se a ancora fosse um prego na parede, e o ponto o fim de uma corda presa neste prego
   * O retorno é a posição do fim da corda ao se rotacionar ao redor do prego
   */  
  function rotatePoint(x: number, y: number, anchorX: number, anchorY: number, angle: number, ): { x: number, y: number } {
    const translatedX: number = anchorX - x;
    const translatedY: number = anchorY - y;
  
    const newX: number = x + translatedX * Math.cos(angle) - translatedY * Math.sin(angle);
    const newY: number = y + translatedX * Math.sin(angle) + translatedY * Math.cos(angle);
  
    return { x: newX, y: newY };
  }

  const { aumataInputResultsRef, setAumataInputResults } = useAutomataInputContext();
  const validadeAllInputs = () => {

    // Create input array copy
    let aumataInputResultsAux = [...aumataInputResultsRef.current]
    for (let i=0; i<aumataInputResultsAux.length; i++){
      const { result, message } = automataRef.current.validate(aumataInputResultsAux[i].input);
      
      // Update automata results
      aumataInputResultsAux[i].result = result
      aumataInputResultsAux[i].message = message
    }

    // calculateSteps();

    // Simulate automata again
    setAumataInputResults(aumataInputResultsAux)
  }

  function addNewTransition(labels: string[], clickedState: State, endState: State){
    labels.forEach(l => l.trim());
    automataRef.current.addTransition(
      clickedState,
      endState,
      labels,
      CanvasColorsRef.current.DEFAULT_TRANSITION,
      CanvasColorsRef.current.DEFAULT_TRANSITION_TEXT,
    );
    handleAutomataChange()
  }

  function hasOpenPopup(): boolean{
    let result = (openPopupRef.current !== PopupType.NONE)
    return result
  }

  useEffect(() => {
    updateRootColor()
    CanvasColorsRef.current = updateCanvasColorEnum()
  }, [selectedColorTheme])

  useEffect(() => {
    
    // calculateSteps();
    if(!automataRef.current){
      automataRef.current = new Automata();
    }

    let previousStates = localStorage.getItem("States")
    if(previousStates) {
      let prevStates: State[] = JSON.parse(previousStates);
      automataRef.current.states = prevStates;
      automataRef.current.initialState = prevStates.find(s => s.isInitial) || null;
      automataRef.current.finalStates = prevStates.filter(s => s.isFinal);
    }
    let previousTransitions = localStorage.getItem("Transitions")
    if(previousTransitions){
      let prevTransitions: Transition[] = JSON.parse(previousTransitions);
      automataRef.current.transitions = prevTransitions;
    }
    let previousNotes = localStorage.getItem("Notes")
    if(previousNotes){
      let prevNotes: Note[] = JSON.parse(previousNotes);
      automataRef.current.notes = prevNotes;
    }


    console.log('%c-- O CANVAS FOI RERENDERED! --', 'color: #ff7777')
    if (canvasRef.current) {
      //* Parou de funcionar */
      // canvasRef.current.addEventListener("contextmenu", (e) => {
      //   e.preventDefault();
      // });
      document.addEventListener("contextmenu", (e) => {
        e.preventDefault();
      });

      // if (canvasObject) {
      //   canvasObject.remove();
      // }

      p5Instance.current = new p5((p: p5) => {
        p.setup = () => {
          p.createCanvas(window.innerWidth, window.innerHeight);
          p.frameRate(144);

          // slider = p.createSlider(-5, 50, 1);
          // slider.position(10, 80);

          // Create custom context menu
          contextMenu = p.createDiv(" "); 
          contextMenu.id("contextMenu"); 
          contextMenu.addClass("hidden"); 

          let option2 = p.createDiv("Initial");
          option2.id("ContextMenu-Initial")
          option2.mouseClicked(() => {
            toggleInitial(p);
            hideContextMenu();
            handleAutomataChange();
            });

          let option3 = p.createDiv("Final");
          option3.id("ContextMenu-Final")
          option3.mouseClicked(() => {
            automataRef.current.toggleFinal(selectedStates);
            hideContextMenu();
            handleAutomataChange();
          });
          
          let option4 = p.createDiv("Rename");
          option4.id("ContextMenu-Rename");
          option4.mouseClicked(() => {
            if(selectedStates.length > 1) {
              alert("Selecione um estado por vez para alterar seu nome.")
            }
            else{
              // let label = prompt("Digite o novo nome: ");
              // if(label)
              //   selectedStates[0].label = label!;
              // else
              //   alert("O nome não pode estar vazio.");
              setOpenPopup(PopupType.RENAME_STATE)
              openPopupRef.current = PopupType.RENAME_STATE

              let selectedStatesAux = selectedStates
              const onSubmit = (newLabel: string) => selectedStatesAux[0].label = newLabel!
              setPopupInput({onSubmit, previousName:selectedStatesAux[0].label})
            }
            hideContextMenu();
          });

          contextMenu.child(option2);
          contextMenu.child(option3);
          contextMenu.child(option4);
        }; 

        p.draw = () => {
          p.background(CanvasColorsRef.current.BACKGROUND);
          p.push();
          p.scale(cameraZoomRef.current)
          p.strokeCap(p.PROJECT);
          p.translate(globalTranslateX, globalTranslateY)
          
          const arrowWeight = 5; 

          if (zoomTargetRef.current !== null && zoomTargetRef.current) {
            adjustZoomAndPan(zoomTargetRef.current!.x, zoomTargetRef.current!.y)
            startTransition(zoomTargetRef.current.x, zoomTargetRef.current.y, 1); //Esse 1 é o nível de zoom. Valores diferentes de 1 ainda bugam.
            zoomTargetRef.current = undefined;
          }

          if (transitioning) {
            const lerpFactor = 0.02; //Essa variável controla a velocidade da transição
        
            currentZoom = p.lerp(currentZoom, targetZoom, lerpFactor);
            currentTranslateX = p.lerp(currentTranslateX, targetTranslateX, lerpFactor);
            currentTranslateY = p.lerp(currentTranslateY, targetTranslateY, lerpFactor);
        
            // Update actual values
            cameraZoomRef.current = currentZoom;
            globalTranslateX = currentTranslateX;
            globalTranslateY = currentTranslateY;
        
            // Check if close to target values
            if (p.abs(cameraZoomRef.current - targetZoom) < 0.01 && 
                p.abs(globalTranslateX - targetTranslateX) < 0.01 && 
                p.abs(globalTranslateY - targetTranslateY) < 0.01) {
              transitioning = false; // Stop transitioning
            }
          }

          const lerpSpeed = 0.12; // Control speed of the interpolation
          automataRef.current.getStates().forEach(state => {
            if (state.isAnimating) {
              state.x = p.lerp(state.x, state.targetX, lerpSpeed);
              state.y = p.lerp(state.y, state.targetY, lerpSpeed);
              
              // Check if the state is close enough to the target to stop isAnimating
              if (p.dist(state.x, state.y, state.targetX, state.targetY) < 1) {
                state.x = state.targetX;
                state.y = state.targetY;
                state.isAnimating = false; // Stop isAnimating
              }
            }
          });

          // #region Renderiza notas
          isCursorOverNoteResizeHandle = false; // Flag to track cursor over the resize handle
          automataRef.current.getNotes().forEach((note: Note, index: number) => {
            p.fill(CanvasColorsRef.current.NOTES);
            p.strokeWeight(0) // p.strokeWeight(2)
            p.stroke(CanvasColorsRef.current.NOTES_SECONDARY);
            
            if(clickedNote){
              if(note.id === clickedNote.id){
                p.fill(CanvasColorsRef.current.NOTES_CLICKED);
                p.stroke(CanvasColorsRef.current.NOTES_CLICKED_SECONDARY);
              }
            }

            p.strokeWeight(1); // Visible lines
            p.rect(note.x, note.y, note.width, note.height, 5);
            p.fill(0) // Reinicia cor para preto
            

            if(note.textLines.length === 1 && note.textLines[0] === ""){
              calculateNoteLines(note, p);
            }

            p.strokeWeight(0)
            p.textAlign(p.LEFT, p.TOP); // Align text to the left and top
            p.textSize(note.textSize);
            p.fill(CanvasColorsRef.current.NOTES_TEXT)
    
            
            note.textLines.forEach((linha, i) => {
              p.text(linha, note.x + 10, note.y + 10 + i * (note.textSize * 1.2)); // Calculate line height based on text size
            });

            /* ***** Draw resize handle ***** */
            const HANDLE_SIZE_X = 20;
            const HANDLE_SIZE_Y = 20;
            const handleX = note.x + note.width - HANDLE_SIZE_X;
            const handleY = note.y + note.height - HANDLE_SIZE_Y;
            p.fill(CanvasColorsRef.current.NOTES);

            // p.rect(handleX, handleY, HANDLE_SIZE_X, HANDLE_SIZE_Y);
            
            /* HANDLE ICON 1 */
            // p.strokeWeight(1); // Visible lines
            // // // Draw diagonal grip lines
            // p.strokeCap(p.ROUND);
            // const numLines = 3; // Number of diagonal lines
            // const lineSpacingX = HANDLE_SIZE_X / (numLines + 1);
            // const lineSpacingY = HANDLE_SIZE_Y / (numLines + 1); 
            // for (let i = 1; i <= numLines; i++) {
            //   p.line(
            //     note.x + note.width - i * lineSpacingX, 
            //     note.y + note.height,
            //     note.x + note.width,
            //     note.y + note.height - i * lineSpacingY
            //   );
            // }
            
            /* HANDLE ICON 2 */
            let PADDING_HANDLE = 6
            let HANDLE_LINE_SIZE = 10
            p.strokeCap(p.ROUND);
            p.strokeWeight(3); // Visible lines
            p.line(
              note.x + note.width - PADDING_HANDLE - HANDLE_LINE_SIZE, 
              note.y + note.height - PADDING_HANDLE,
              note.x + note.width - PADDING_HANDLE,
              note.y + note.height - PADDING_HANDLE
            );
            p.line(
              note.x + note.width - PADDING_HANDLE, 
              note.y + note.height - PADDING_HANDLE - HANDLE_LINE_SIZE,
              note.x + note.width - PADDING_HANDLE,
              note.y + note.height - PADDING_HANDLE
            );

            // // Check if the mouse is over the resize handle
            if (getMouseX(p) >= handleX && getMouseX(p) <= handleX + HANDLE_SIZE_X &&
                getMouseY(p) >= handleY && getMouseY(p) <= handleY + HANDLE_SIZE_Y) {
              isCursorOverNoteResizeHandle = true;
            }
          });

          // #endregion

          if (isCursorOverNoteResizeHandle) {
            window.document.body.style.cursor = 'nwse-resize';
          } else if(window.document.body.style.cursor === 'nwse-resize') {
            window.document.body.style.cursor = 'default';
          }

          if(currentCanvasActionRef.current === CanvasActions.CREATING_TRANSITION && clickedState){
            p.stroke(CanvasColorsRef.current.CLICKED_TRANSITION);
            p.fill(CanvasColorsRef.current.CLICKED_TRANSITION);
            p.strokeWeight(arrowWeight);
            p.line(clickedState.x, clickedState.y, getMouseX(p), getMouseY(p));
          }

          const allTransitions = automataRef.current.getTransitions();
          if(currentCanvasActionRef.current !== CanvasActions.ANIMATING){
            allTransitions.forEach(
              (transition) => {
                transition.color = CanvasColorsRef.current.DEFAULT_TRANSITION
                transition.textColor = CanvasColorsRef.current.DEFAULT_TRANSITION_TEXT
              }
            );
            // Colore todos os estados selecionados como CLICKED color
            selectedTransitions.forEach(
              (transition) => {
                transition.color = CanvasColorsRef.current.CLICKED_TRANSITION
                transition.textColor = CanvasColorsRef.current.CLICKED_TRANSITION_TEXT
              }
            );
  
            if(simulationIndexRef && simulationIndexRef.current! > 0 && simulationIndexRef.current! < simulationStatesRef.current.length){
              simulationTransitionsRef.current[simulationIndexRef.current!]!.color = CanvasColorsRef.current.SIMULATION_STEP_TRANSITION;
              simulationTransitionsRef.current[simulationIndexRef.current!]!.textColor = CanvasColorsRef.current.SIMULATION_STEP_TRANSITION_TEXT;
            }
          }

          function getControlPointOffset(start: State, end: State, distance: number) {
            const angle = Math.atan2(end.y - start.y, end.x - start.x) + Math.PI / 2;
            return {
              x: Math.cos(angle) * distance,
              y: Math.sin(angle) * distance
            };
          }

          function transitionIsReversed(startId: string, endId: string, allTransitions: Transition[]) {
            // Check if there is a transition that goes from the 'end' state to the 'start' state
            return allTransitions.some(transition => transition.from.id === endId && transition.to.id === startId);
          }


          // #region Desenha transições
          allTransitions.forEach((transition) => {
            const start = automataRef.current.findState(transition.from.id);
            const end = automataRef.current.findState(transition.to.id);
            p.strokeWeight(arrowWeight)
            let transitionHeight = transition.height
            if (start && end) {
              p.stroke(transition.color);
              p.fill(transition.color);

              // Transições para o mesmo estado
              if (start.id === end.id) {
                // Transition line
                const loopDiameter = start.diameter;
                const loopRadius = start.diameter / 2;

                p.push()
                p.noFill();
                p.stroke(transition.color);
                p.strokeWeight(arrowWeight);
                p.arc(start.x, start.y - loopRadius, loopDiameter*0.85, loopDiameter*0.85, Math.PI/2, Math.PI/0.255);
                p.pop()
                
                // Label
                p.push();
                p.stroke(transition.textColor)
                p.fill(transition.textColor)
                p.textAlign(p.CENTER, p.CENTER);
                p.strokeWeight(0.1)
                p.textSize(20);
                p.text(transition.label, start.x, start.y - start.diameter - 15);
                p.pop();

                // Arrow tip
                const arrowWidth = 15; // length of arrowhead
                const arrowHeight = 9; // length of arrowhead
                const angle = Math.PI * 0.55; 
                p.push();
                p.translate(end.x + 30, end.y - 32);
                p.rotate(angle);
                p.triangle(0, 0, -arrowWidth, +arrowHeight, -arrowWidth, -arrowHeight);
                p.pop();

              }
              // Transições para outros estados
              else {
                const angle = Math.atan2(end.y - start.y, end.x - start.x);
                const radius = start.diameter / 2;
                const offsetRadius = 30; // additional radius to avoid overlap
          
                let offsetX = radius * Math.cos(angle);
                let offsetY = radius * Math.sin(angle);
          
                let curveOffsetX = offsetRadius * Math.cos(angle + Math.PI / 2); // perpendicular to the line
                let curveOffsetY = offsetRadius * Math.sin(angle + Math.PI / 2);
          
                let middleX = (start.x + end.x) / 2 + curveOffsetX;
                let middleY = (start.y + end.y) / 2 + curveOffsetY;
          
                // Check if there is a reverse transition
                const reverseExists = allTransitions.some(t => t.from.id === end.id && t.to.id === start.id);
                let angleOffset = 0;
              
                if (reverseExists) {
                  curveOffsetX *= -1; // Invert the curve direction for one of the transitions
                  curveOffsetY *= -1;
                  angleOffset = 0.0;
                } else {
                  middleX -= curveOffsetX;
                  middleY -= curveOffsetY;
                  curveOffsetX = 0;
                  curveOffsetY = 0;
                }
          
                // Draw curved line
                p.push();
                p.noFill();
                p.bezier(
                  start.x + offsetX, start.y + offsetY,
                  start.x + offsetX + curveOffsetX, start.y + offsetY + curveOffsetY,
                  end.x - offsetX + curveOffsetX, end.y - offsetY + curveOffsetY,
                  end.x - offsetX, end.y - offsetY
                );
                p.pop();
          
                // Draw an arrowhead
                p.push();
                const arrowX = end.x - offsetX + curveOffsetX / 3; // Adjust the arrow position
                const arrowY = end.y - offsetY + curveOffsetY / 3;
                p.translate(arrowX, arrowY);
                p.rotate(angle + angleOffset);
                p.triangle(0, 0, -15, 9, -15, -9);
                p.pop();
          
                // Label
                let correctedAngle = angle
                if(end.x < start.x && !reverseExists){
                // if(end.x < start.x){
                  correctedAngle += Math.PI
                }

                if (reverseExists && end.x < start.x){
                  correctedAngle += Math.PI
                }
                
                p.push();
                p.strokeWeight(0.1)
                p.translate(middleX, middleY);
                // p.rotate(correctedAngle + (reverseExists ? Math.PI : 0));
                p.rotate(correctedAngle);
                p.textAlign(p.CENTER, p.CENTER);
                p.stroke(transition.textColor);
                p.fill(transition.textColor);
                p.textSize(20);
                if (reverseExists){
                  p.text(transition.label, 0, curveOffsetY > 0 ? 70 : -70); // Adjust label offset
                } else {
                  p.text(transition.label, 0, -15); // Adjust label offset
                }
                p.pop();
              }
            }
          });
          // #endregion

          // Colore todos os estados para DEFAULT color
          const allStates = automataRef.current.getStates();
          allStates.forEach(
            (state) => {
              state.color = CanvasColorsRef.current.DEFAULT_STATE
              state.secondaryColor = CanvasColorsRef.current.DEFAULT_STATE_SECONDARY
            }
          );
          // Colore estados do passo atual da simulação como SIMULATION_STEP color
          if(simulationStatesRef.current[simulationIndexRef.current!]){
            simulationStatesRef.current[simulationIndexRef.current!].color = CanvasColorsRef.current.SIMULATION_STEP_STATE;
            simulationStatesRef.current[simulationIndexRef.current!].secondaryColor = CanvasColorsRef.current.SIMULATION_STEP_STATE_SECONDARY;
          }
          // Colore todos os estados selecionados como CLICKED color
          selectedStates.forEach(
            (state) => {
              state.color = CanvasColorsRef.current.CLICKED_STATE
              state.secondaryColor = CanvasColorsRef.current.CLICKED_STATE_SECONDARY
            }
          );
            
          // #region ----Desenha estados
          // .slice() cria uma copia shallow
          // .reverse() desenhar mostrando o primeiro como acima, visto que é o primeiro a ser selecionado quando clica-se em estados stackados
          automataRef.current
            .getStates()
            .slice()
            .reverse()
            .forEach((state: State, index) => {
              p.noStroke();

              // Marcador de "IsInitial"
              if (state.isInitial) {
                p.push();
                const triangleSize = 0.6;
                let triangleOffsetX: number =
                state.diameter / 2 + (state.diameter / 2) * triangleSize;
                let triangleOffsetY: number =
                (state.diameter / 2) * triangleSize;
                p.fill(state.secondaryColor);
                p.triangle(
                  state.x - triangleOffsetX,
                  state.y + triangleOffsetY,
                  state.x - triangleOffsetX,
                  state.y - triangleOffsetY,
                  state.x - state.diameter / 2,
                  state.y
                );
                p.pop();
              }

              // Circulo do estado (Estado em si)
              p.strokeWeight(4)
              p.stroke(state.secondaryColor);
              p.fill(state.color);
              p.ellipse(state.x, state.y, state.diameter);
              p.strokeWeight(0)

              // Titulo do estado
              // Marcador de "IsFinal"
              if (state.isFinal) {
                // Draw an inner circle with only its outline
                p.noFill(); // Disable filling
                p.stroke(state.secondaryColor);
                p.strokeWeight(4); // Set outline thickness
                const innerDiameter = state.diameter / 1.3; // Set the diameter of the inner circle
                p.ellipse(state.x, state.y, innerDiameter);
              }

              p.fill(CanvasColorsRef.current.DEFAULT_STATE_TEXT);
              p.textAlign(p.CENTER, p.CENTER);
              p.strokeWeight(0)
              wrapText(p, state.label, state.x, state.y, state.diameter, 12);
              
              p.fill(0);
              p.stroke(0);
              p.strokeWeight(2);
            });
          // #endregion

          // Desenha caixa de seleção
          if (currentCanvasActionRef.current === CanvasActions.CREATING_SELECTION) {
            p.push(); // Start a new drawing state
            p.fill(CanvasColorsRef.current.SELECTION);
            p.stroke(CanvasColorsRef.current.SELECTION_BORDER);
            p.rect(
              selectionX,
              selectionY,
              selectionDistanceX,
              selectionDistanceY
            );
            p.pop();
          }

          // #region 🎬🎬🎬 TEXTO DA SIMULAÇÃO DO AUTOMATO
          var input = (document.getElementById("automata-input-id-"+simulationInputIdRef.current) as HTMLInputElement)?.value;
         
          let currentIndex = simulationIndexRef.current;
          if (input && (currentIndex || currentIndex === 0) && (simulationInputIdRef.current !== null)) {
            let TEXT_SIZE = 25
            let TEXT_HEIGHT = 95 // Bottom-up
            let x = - ((input.length-1) * TEXT_SIZE) / 2; // Adjust starting x position relative to the center

            p.push(); // Save current transformation state
            p.resetMatrix(); // Reset transformations or adjust according to the camera

            // Drawing the text at the top of the canvas
            p.textSize(TEXT_SIZE);
            for (let i = 0; i < input.length; i++) {
              let char = input[i];

              if(currentIndex < simulationStatesRef.current.length - 1){
                if (i < currentIndex) {
                  p.fill(CanvasColorsRef.current.DEFAULT_TRANSITION);
                } else if (i === currentIndex) {
                  p.fill(CanvasColorsRef.current.DEFAULT_STATE);
                } else {
                  p.fill(CanvasColorsRef.current.DEFAULT_TRANSITION_TEXT);
                }

              } else { //Finalizou por completo a simulação
                let lastState = simulationStatesRef.current[simulationIndexRef.current!]
                if (lastState && lastState.isFinal) {
                  p.fill(CanvasColorsRef.current.INFO_SUCCESS);
                } else {
                  p.fill(CanvasColorsRef.current.INFO_ERROR);
                }
              }

              p.textAlign(p.CENTER, p.CENTER);
              p.strokeWeight(7);
              p.stroke(CanvasColorsRef.current.BACKGROUND)
              p.strokeJoin(p.ROUND)
              p.text(char, x + (window.innerWidth / 2), window.innerHeight - TEXT_HEIGHT); // Position the text at the top
              x += TEXT_SIZE; // Increment x for the next character

            }
            p.pop(); // Restore previous transformation state
          } 
          // #endregion 🎬🎬🎬 TEXTO DA SIMULAÇÃO DO AUTOMATO
        };

        function startTransition(newTargetX: number, newTargetY: number, newZoom: number) {
          targetZoom = newZoom;
          targetTranslateX = (p.width / newZoom) / 2 - newTargetX * newZoom;
          targetTranslateY = (p.height / newZoom) / 2 - newTargetY * newZoom;
          transitioning = true;
        }

        function adjustZoomAndPan(targetX: number, targetY: number) {
          const newZoom = 1;
          
          cameraZoomRef.current = newZoom;
        
          // Calculate the necessary translation to center on the target
          const canvasCenterX = (p.width / cameraZoomRef.current) / 2;
          const canvasCenterY = (p.height / cameraZoomRef.current) / 2;
        

          //Não ta centralizando corretamente. É próximo, então acredito que não está considerando
          //A escala na hora do cálculo
          //NewZoom = 1 funciona corretamente. O problema é o zoom.
          globalTranslateX = canvasCenterX - targetX * newZoom;
          globalTranslateY = canvasCenterY - targetY * newZoom;
        }
      
        p.mouseWheel = (event: WheelEvent) => {
          if(hasOpenPopup()) return

          transitioning = false;
          var oldZoom = cameraZoomRef.current;
          cameraZoomRef.current -= (event.deltaY / 1000) //1000
          if (cameraZoomRef.current < 0.2)
            cameraZoomRef.current = 0.2
          else if(cameraZoomRef.current > 4)
            cameraZoomRef.current = 4
          
          var newZoom = cameraZoomRef.current;

          // ☠️☠️☠️☠️☠️☠️☠️☠️
          // globalTranslateX = (getMouseXScaled(p) - (p.mouseX - globalTranslateX));
          // globalTranslateY = (getMouseYScaled(p) - (p.mouseY - globalTranslateY));
          // ☠️☠️☠️☠️☠️☠️☠️☠️
          
          // 🕯️🕯️🕯️🕯️🕯️🕯️🕯️🕯️ Só deus sabe como funciona
          const mouseXWorld = getMouseXScaled(p);
          const mouseYWorld = getMouseYScaled(p);
          
          // Calculate how the mouse's world coordinates would change due to the new zoom
          const mouseXWorldScaled = mouseXWorld * (newZoom / oldZoom);
          const mouseYWorldScaled = mouseYWorld * (newZoom / oldZoom);
          
          // Update globalTranslateX and globalTranslateY to keep the mouse's world coordinates the same
          globalTranslateX += mouseXWorld - mouseXWorldScaled;
          globalTranslateY += mouseYWorld - mouseYWorldScaled;
          // 🕯️🕯️🕯️🕯️🕯️🕯️🕯️🕯️ Só deus sabe como funciona
        }
        
        p.mouseDragged = () => {
          if(hasOpenPopup()) return 

          const allStates = automataRef.current.getStates();

          if (currentCanvasActionRef.current === CanvasActions.MOVING_STATE) {
            // selectedStates.forEach((auxState: automataRef.current.State) => { // <--- deu errado o type
            selectedStates.forEach((state: State) => {
              state.x = roundNumber(getMouseX(p), 20) + roundNumber(selectedStateMouseOffset[state.id]["x"], 20);
              state.y = roundNumber(getMouseY(p), 20) + roundNumber(selectedStateMouseOffset[state.id]["y"], 20);
            });
          } else if (currentCanvasActionRef.current === CanvasActions.CREATING_SELECTION) {
            // --- Update valor da seleção ---
            // Isso é necessario para evitar tamanhos negativos ao criar
            // seleções onde o ponto de inicio é maior que o de fim
            selectionDistanceX = getMouseX(p) - selectionStarterX;
            selectionDistanceY = getMouseY(p) - selectionStarterY;
            selectionX = selectionStarterX;
            selectionY = selectionStarterY;
            if (selectionDistanceX < 0) {
              selectionX = getMouseX(p);
              selectionDistanceX = -1 * selectionDistanceX;
            }
            if (selectionDistanceY < 0) {
              selectionY = getMouseY(p);
              selectionDistanceY = -1 * selectionDistanceY;
            }

            selectedStates = allStates.filter((state) => {
              return (
                selectionX <= state.x &&
                state.x <= selectionX + selectionDistanceX &&
                selectionY <= state.y &&
                state.y <= selectionY + selectionDistanceY
              );
            });

          } else if (currentCanvasActionRef.current === CanvasActions.MOVING_CANVAS){
            const deltaX = getMouseX(p) - getPreviousMouseX(p);
            const deltaY = getMouseY(p) - getPreviousMouseY(p);
            globalTranslateX += deltaX;
            globalTranslateY += deltaY;
          } else if (currentCanvasActionRef.current === CanvasActions.RESIZING_TRANSITION){
            if (clickedTransition){
              let dx = (getMouseX(p) - getPreviousMouseX(p)) * 2
              let dy = (getMouseY(p) - getPreviousMouseY(p)) * 2
              let angle = Math.atan2(clickedTransition.from.y - clickedTransition.to.y, clickedTransition.from.x - clickedTransition.to.x)
              let final = (Math.sin(angle) * dx) - (Math.cos(angle) * dy)

              //clickedTransition.height += final
              clickedTransition.height = clickedTransition.height;
            }
          } else if (currentCanvasActionRef.current === CanvasActions.MOVING_NOTE){
            clickedNote!.x = getMouseX(p) + selectedNoteMouseOffset[clickedNote!.id]["x"];
            clickedNote!.y = getMouseY(p) + selectedNoteMouseOffset[clickedNote!.id]["y"];
          } else if (currentCanvasActionRef.current ===  CanvasActions.RESIZING_NOTE){
            const MIN_NOTE_WIDTH = 50; 
            const MIN_NOTE_HEIGHT = 50;
            const MAX_NOTE_WIDTH = 400;
            const MAX_NOTE_HEIGHT = 300;
            const mouseX = getMouseX(p);
            const mouseY = getMouseY(p);

            // Assume resize starts from the bottom-right corner of the note
            let newWidth = Math.max(10, mouseX - clickedNote!.x);
            let newHeight = Math.max(10, mouseY - clickedNote!.y);

            newWidth = Math.max(MIN_NOTE_WIDTH, Math.min(newWidth, MAX_NOTE_WIDTH));
            newHeight = Math.max(MIN_NOTE_HEIGHT, Math.min(newHeight, MAX_NOTE_HEIGHT));          

            clickedNote!.width = newWidth;
            clickedNote!.height = newHeight;

            const textLength = clickedNote!.textLines.length;
            if (textLength < 3) {
              calculateNoteLines(clickedNote!, p)
            } else if (textLength < 5 && p.frameCount % 3 === 0) {
              calculateNoteLines(clickedNote!, p)
            } else if (textLength < 8 && p.frameCount % 5 === 0) {
              calculateNoteLines(clickedNote!, p)
            } else if (textLength < 10 && p.frameCount % 8 === 0) {
              calculateNoteLines(clickedNote!, p)
            } else if (textLength < 12 && p.frameCount % 11 === 0) {
              calculateNoteLines(clickedNote!, p)
            } else if (textLength >= 13 && p.frameCount % 14 === 0){
              calculateNoteLines(clickedNote!, p)
            }
          }
        };

        p.mousePressed = (event: any) => {
          if(hasOpenPopup()) return 
          if(p.mouseButton === p.CENTER){
            console.log(automataRef.current.getStates())
            console.log(automataRef.current.transitions)
            console.log(automataRef.current.notes)
          }

          // Se o click não foi no próprio contextMenu, ocultar o menu.
          if (event.target.id && !event.target.id.includes('ContextMenu')) {
            hideContextMenu();
          }

          // Gambiarra para não executar a tool selecionada ao clicar em botões
          if ((event.target instanceof HTMLButtonElement || event.target instanceof HTMLInputElement || event.target.nodeName === 'svg' || event.target.nodeName === 'path')) {
            return;
          }

          if (contextMenuIsOpen) {
          } else {
            const allStates = automataRef.current.getStates();
            const allNotes = automataRef.current.getNotes();
            
            // Encontra estado que foi clicado
            clickedState =
              allStates.find((state) => {
                return (
                  p.dist(state.x, state.y, getMouseX(p), getMouseY(p)) <
                  state.diameter / 2
                );
              }) || null;

            // New clicked state
            if (clickedState) {
              let clickedStateIsSelected = selectedStates.find(
                (state) => state.id === clickedState!.id
              );
              if (!clickedStateIsSelected) {
                selectedStates = [clickedState];
              }
            } else {
              selectedStates = [];
            }

            // Clicked transition
            if(!clickedState){
              clickedTransition = getClickedTransition(p);
              if (clickedTransition){
                selectedTransitions = [clickedTransition];
              } else {
                selectedTransitions = [];
              }
            } else {
              clickedTransition = null
              selectedTransitions = [];
            }

            
            if(!clickedState && !clickedTransition){
              if(allNotes.length > 0){
                clickedNote = allNotes.find((note) => {
                  return getMouseX(p) >= note.x && getMouseX(p) <= note.x + note.width &&
                        getMouseY(p) >= note.y && getMouseY(p) <= note.y + note.height;
                }) || null;
              }
            } else {
              clickedNote = null;
            }

            // Create new 
            if (p.mouseButton === p.LEFT && p.keyIsDown(p.SHIFT)) {
              if (!clickedState) {
                createNewState(allStates, p)
              } else {
                currentCanvasActionRef.current = CanvasActions.CREATING_TRANSITION;

              }
            }
            else if (p.mouseButton === p.CENTER || (p.keyIsDown(p.CONTROL) && p.mouseButton === p.LEFT)){
                currentCanvasActionRef.current = CanvasActions.MOVING_CANVAS;
                transitioning = false;
                // Muda cursor para "grab" cursor
                window.document.body.style.cursor = 'grab';
            }
            /* Pointer */
            else if (currentCanvasToolRef.current === CanvasTools.POINTER) {
              // Botão esquerdo: Cria transições / Cria estados
              currentCanvasActionRef.current = CanvasActions.NONE;

              // Open context menu
              if (p.mouseButton === p.RIGHT) {
                if (clickedState) {
                  showContextMenu(p.mouseX, p.mouseY);
                } else {
                  hideContextMenu();
                }
              }
              // Left click
              else if (p.mouseButton === p.LEFT) {
                /* Shift NÃO apertado, clicou em um estado */
                // Move estado
                if (clickedState) {

                  // Set offset, usado para não centralizar com o mouse os estados movidos
                  selectedStateMouseOffset = {};
                  selectedStates.forEach((state) => {
                    selectedStateMouseOffset[state.id] = {};
                    selectedStateMouseOffset[state.id]["x"] =
                      state.x - roundNumber(getMouseX(p), 20)
                    selectedStateMouseOffset[state.id]["y"] =
                      state.y - roundNumber(getMouseY(p), 20)
                  });

                  // Set estado atual como "Movendo estado"
                  currentCanvasActionRef.current = CanvasActions.MOVING_STATE;
                  automataRef.current.pushSnapshotToUndo()
                  automataRef.current.redoStack = [];
                  // Muda cursor para "grab" cursor
                  window.document.body.style.cursor = 'grab';
                } 
                // Criando caixa de seleção
                else if (clickedTransition){
                  currentCanvasActionRef.current = CanvasActions.RESIZING_TRANSITION;
                }
                else if (clickedNote){
                  if(isCursorOverNoteResizeHandle){
                    currentCanvasActionRef.current = CanvasActions.RESIZING_NOTE
                  }
                  else {
                    currentCanvasActionRef.current = CanvasActions.MOVING_NOTE;
                    selectedNoteMouseOffset = {};
                    selectedNoteMouseOffset[clickedNote.id] = {};
                    selectedNoteMouseOffset[clickedNote.id]["x"] = clickedNote.x - getMouseX(p);
                    selectedNoteMouseOffset[clickedNote.id]["y"] = clickedNote.y - getMouseY(p);
                    // Muda cursor para "grab" cursor
                    window.document.body.style.cursor = 'grab';
                  }
                }
                else {
                  // Set state
                  currentCanvasActionRef.current = CanvasActions.CREATING_SELECTION;
                  // Set dados da selecao
                  selectionStarterX = getMouseX(p);
                  selectionStarterY = getMouseY(p);
                  selectionX = selectionStarterX;
                  selectionY = selectionStarterY;
                  selectionDistanceX = 0;
                  selectionDistanceY = 0;
                }
              }

              /* Eraser */
            } else if (currentCanvasToolRef.current === CanvasTools.ERASER) {
              if (clickedState) {
                automataRef.current.deleteState(clickedState);
                handleAutomataChange();
              } else if(clickedTransition) {
                automataRef.current.deleteTransition(clickedTransition);
                handleAutomataChange();
              } else if (clickedNote) {
                automataRef.current.deleteNote(clickedNote);                
              }

              /* Mover */
            } else if (currentCanvasToolRef.current === CanvasTools.MOVE) {
              currentCanvasActionRef.current = CanvasActions.MOVING_CANVAS;
              // Muda cursor para "grab" cursor
              window.document.body.style.cursor = 'grab';
              /* Cria transição */
            } else if (currentCanvasToolRef.current === CanvasTools.TRANSITION) {
              currentCanvasActionRef.current = CanvasActions.CREATING_TRANSITION;
              /* Cria estado */
            } else if (currentCanvasToolRef.current === CanvasTools.ADD_STATE) {
              createNewState(allStates, p)
              /* Cria Note */
            } else if (currentCanvasToolRef.current === CanvasTools.NOTE){
              createNewNote(p)              
            }
          }
        };

        p.mouseReleased = () => {
          if(!hasOpenPopup()){
            window.document.body.style.cursor = 'default';
            
            if(currentCanvasActionRef.current === CanvasActions.MOVING_STATE)
            {
              automataRef.current.pushSnapshotToUndo();
              automataRef.current.redoStack = [];
            }

            if(currentCanvasActionRef.current === CanvasActions.RESIZING_NOTE){
              calculateNoteLines(clickedNote!, p);
            }

            if (clickedState) {            
              const endState = automataRef.current.getStates().find((state) => {
                return (
                  p.dist(state.x, state.y, getMouseX(p), getMouseY(p)) <
                  state.diameter / 2
                );
              });
              if (
                endState &&
                currentCanvasActionRef.current === CanvasActions.CREATING_TRANSITION
              ) {
                // let label = prompt("Digite o símbolo de transição: ");
                // addNewTransition(label, clickedState, endState)             
                setOpenPopup(PopupType.CREATE_TRANSITION)
                openPopupRef.current = PopupType.CREATE_TRANSITION

                let clickedStateAux = clickedState
                let endStateAux = endState;
                let currentLabelsAux = automataRef.current.getTransitions().find(t => t.from.id === clickedStateAux.id && t.to.id === endStateAux.id)
                let currentLabels = currentLabelsAux ? currentLabelsAux.label : ['']
                
                console.log(currentLabelsAux)
                const onSubmit = (labels: string[]) => {
                  if(!currentLabelsAux){
                    addNewTransition(labels, clickedStateAux, endStateAux)
                  }
                  else{
                    automataRef.current.changeTransitionLabel(labels, currentLabelsAux)
                  } 
                }
                setPopupInput({onSubmit, previousLabels:currentLabels})
              }
            }
            currentCanvasActionRef.current = CanvasActions.NONE;
            clickedState = null;
          }
        };

        p.keyPressed = () => {
          // Está bugado!
          // Não reconhece numero, a não ser q alt ou ctrl estejam apertados

          if(!hasOpenPopup()){
            const allStates = automataRef.current.getStates();

            clickedState =
              allStates.find((state) => {
                return (
                  p.dist(state.x, state.y, getMouseX(p), getMouseY(p)) <
                  state.diameter / 2
                );
              }) || null;

            /* Deleta estado(s) */
            if (p.key === "Delete") {
              if(clickedState || selectedStates.length !== 0){
                if (selectedStates.length === 0) 
                  selectedStates = [clickedState!];
              
                if(selectedStates[0] !== null){
                  selectedStates.forEach((state, index) => {
                    const isFirstState = index === 0;
                    automataRef.current.deleteState(state, isFirstState);
                  });
                  selectedStates = [];
                  handleAutomataChange()
                }
              } else if (clickedTransition){
                automataRef.current.deleteTransition(clickedTransition);
                handleAutomataChange()
                clickedTransition = null;
              } else if (clickedNote){
                automataRef.current.deleteNote(clickedNote);
                clickedNote = null;
              }
            } 

            /*
              Undo e Redo 
            */

            // Undo
            if (
              !undoInterval && (
                (p.keyIsDown(p.CONTROL) && (p.key === 'Y' || p.key === 'y')) // CTRL + Y
                || (p.keyIsDown(p.CONTROL) && p.keyIsDown(p.SHIFT) && (p.key === 'Z' || p.key === 'Z')) // CTRL + SHIFT + Z
              )
            ) {
              Redo()
              undoInterval = setInterval(() => {
                Redo()
              }, 200); 
            }

            // Redo
            else if (p.keyIsDown(p.CONTROL) && (p.key === 'Z' || p.key === 'z') && !undoInterval) {
              Undo();
              undoInterval = setInterval(() => {
                Undo()
              }, 200);  // Repeat undo every 200 ms
            }

            /* Seleciona tool */
            // if (!inputFocused) {
            if (p.key === "1") {
              currentCanvasToolRef.current = CanvasTools.POINTER;
              setSelectedToolState(CanvasTools.POINTER) 
            }
            else if (p.key === "2") {
              currentCanvasToolRef.current = CanvasTools.TRANSITION;
              setSelectedToolState(CanvasTools.TRANSITION)
            }
            else if (p.key === "3") {
              currentCanvasToolRef.current = CanvasTools.ADD_STATE;
              setSelectedToolState(CanvasTools.ADD_STATE)
            }
            else if (p.key === "4") {
              currentCanvasToolRef.current = CanvasTools.ERASER;
              setSelectedToolState(CanvasTools.ERASER)
            }
            else if (p.key === "5") {
              currentCanvasToolRef.current = CanvasTools.MOVE;
              setSelectedToolState(CanvasTools.MOVE)
            }

            /* Debug */
            if (p.key === "!") {
              automataRef.current.printInfo();
            }
            else if (p.key === "@"){
              automataRef.current.clearAutomata();
            }
          }
        };

        p.keyReleased = () => {
          if(!hasOpenPopup()){
            // Stop Undo when Z or Y is released
            if ((p.key === 'Z' || p.key === 'z' || p.key === 'Y' || p.key === 'y') && undoInterval) {
              clearInterval(undoInterval);
              undoInterval = null;
            }
          }
        };
      });
    }
    return () => {
      // Clean up the p5.js instance when the component unmounts
      if(p5Instance.current){
        p5Instance.current.remove();
      }
    }; 
  }, []);

  function calculateSteps(inputId: number) {
    var inputText = (document.getElementById("automata-input-id-"+inputId) as HTMLInputElement).value;
    let newSimulationStates = [];
    let newSimulationTransitions = [];
    setSimulationIndex(0);
    simulationIndexRef.current = 0;
    var estadoAtual: State = automataRef.current.getInitialState()!;

    var estadoAnterior: State = estadoAtual;

    newSimulationStates.push(estadoAtual)
    const allTransitions = automataRef.current.getTransitions();
    for(let i = 0; i < inputText.length; i++) {
      let result = automataRef.current.testTransition(inputText, estadoAtual, i);

      if(i === 0)
        newSimulationTransitions.push(null);
      else{
        newSimulationTransitions.push(
          allTransitions.find(x => 
            x.from.id === estadoAnterior.id && 
            x.label.includes(inputText[i - 1])
          )!
        );      }
      

      newSimulationStates.push(result.nextState!);
      if(!result.isValidTransition){ 
        console.log('Transição inválida');
        break;  
      }
      estadoAnterior = estadoAtual;
      estadoAtual = result.nextState!;
    }

    if (estadoAnterior) {
      newSimulationTransitions.push(
        allTransitions.find(x => 
          x.from === estadoAnterior && 
          x.label.includes(inputText[inputText.length - 1])
        )!
      );
    }
      
    setSimulationInputId(inputId)
    simulationInputIdRef.current = inputId
    setSimulationInputText(inputText)
    setSimulationStates(newSimulationStates);
    simulationStatesRef.current = newSimulationStates;
    setSimulationTransitions(newSimulationTransitions)
    simulationTransitionsRef.current = newSimulationTransitions;
    // console.log("Updated States", newSimulationStates);
    // console.log("Updated Transitions", newSimulationTransitions);
    // console.log("Updated inputText", inputText);
  }

  function wrapText(p: p5, text: string, x: number, y: number, maxDiameter: number, textSize: number): void {
    p.textAlign(p.CENTER, p.CENTER); // Ensure text is centered
    p.textSize(textSize);
    let words = text.split(' ');
    let tempLine = '';
    let lines = [];
  
    for (let i = 0; i < words.length; i++) {
      let testLine = tempLine + words[i] + ' ';
      let metrics = p.textWidth(testLine);
      if (metrics > maxDiameter - 10) { // 10 is a margin
        lines.push(tempLine);
        tempLine = words[i] + ' ';
      } else {
        tempLine = testLine;
      }
    }
    lines.push(tempLine); // Push the last line
  
    // Check if text height exceeds the circle's diameter
    if (lines.length * textSize > maxDiameter) {
      textSize -= 1; // Decrease text size
      return wrapText(p, text, x, y, maxDiameter, textSize); // Recursively adjust until it fits
    } else {
      // Draw each line centered in the circle
      for (let i = 0; i < lines.length; i++) {
        p.text(lines[i], x, y - (textSize * (lines.length - 1) / 2) + (textSize * i));
      }
    }
  }

  function wrapTextInRectangle(p: p5, text: string, x: number, y: number, maxWidth: number, maxHeight: number, textSize: number, padding: number, resizeOnOverflow=false): [string[], number] | undefined {
    p.strokeWeight(0);
    p.textAlign(p.LEFT, p.TOP); // Align text to the left and top
    p.textSize(textSize);
    p.fill("#FFFFFF");
  
    // Adjust the maximum width and height for padding
    maxWidth -= (padding * 2);
    maxHeight -= (padding * 2);
  
    let contentHeight;
    let lines: string[] = [];
    let lineHeight = textSize * 1.2; // Calculate line height as 1.2 times the text size for some vertical spacing
  
    // Split text into chunks by new lines, then process each chunk
    let textChunks = text.split('\n');
    for (let chunk of textChunks) {
      let words = chunk.split(' ');
      let tempLine = '';
  
      for (let i = 0; i < words.length; i++) {
        let word = words[i];
        let wordWidth = p.textWidth(word);
  
        // If a single word is wider than maxWidth, break the word
        while (wordWidth > maxWidth) {
          let subWord = word;
          while (p.textWidth(subWord + '-') > maxWidth) {
            subWord = subWord.substring(0, subWord.length - 1);
          }
          subWord += '-'; // Add a hyphen to indicate a break
  
          // If there is text in tempLine, push it to lines and reset tempLine
          if (tempLine !== '') {
            lines.push(tempLine);
            tempLine = '';
          }
  
          // Push the subWord to lines and prepare the remaining part of the word for the next line
          lines.push(subWord);
          word = word.substring(subWord.length - 1); // Exclude the hyphen from the remaining part 
          wordWidth = p.textWidth(word);
        }
  
        // Continue processing the remaining part of the word or the next word
        let testLine = tempLine + word + ' ';
        if (p.textWidth(testLine) > maxWidth) {
          lines.push(tempLine.trim());
          tempLine = word + ' ';
        } else {
          tempLine = testLine;
        }
      }
  
      if (tempLine) {
        lines.push(tempLine.trim());
      }
    }
  
    // Check and handle text overflow
    contentHeight = lines.length * lineHeight;
    if (resizeOnOverflow && contentHeight > maxHeight) {
      // If the text doesn't fit vertically, reduce text size and try again
      textSize -= 1;
      if (textSize > 0) {
        return wrapTextInRectangle(p, text, x, y, maxWidth + (padding * 2), maxHeight + (padding * 2), textSize, padding, resizeOnOverflow);
      }
    } else {
      return [lines, textSize];
    }
  }


  
  function showContextMenu(x: number, y: number) {
    contextMenu.position(x, y);
    contextMenu.removeClass("hidden");
    contextMenuIsOpen = true;
  }

  function hideContextMenu() {
    contextMenu.addClass("hidden");
    contextMenuIsOpen = false;
  }

  function toggleInitial(p: p5) {
    // O primeiro NÃO é o correto, mas fiz assim para que nunca haja mais de 1 estado inicial
    // Arrumar depois!
    let state: State = selectedStates[0];
    state.isInitial = !state.isInitial;

    // Remove estado inicial anterior, caso não seja o mesmo estado que o atual
    let prevInitialState: State | null = automataRef.current.getInitialState();
    if (
      prevInitialState && // Estado inicial anterior não é null
      state.isInitial && // Estado inicial atual foi toggle apara TRUE, não FALSE
      state.id !== prevInitialState.id // O estado inicial anterior não é o mesmo estado que o atual
    ) {
      prevInitialState.isInitial = false;
    }

    // Set novo estado inicial
    if (state.isInitial) {
      automataRef.current.setInitialState(state);
    } else {
      automataRef.current.setInitialState(null);
    }
  }

  function stopSimulation() {
    setSimulationMessage("");
    setSimulationIndex(0)
    setSimulationTransitions([])
    setSimulationStates([])
    setSimulationInputText("")
    setSimulationInputId(null)
    simulationInputIdRef.current = null
  }

  function saveLocalStorage() {
    localStorage.setItem("States", JSON.stringify(automataRef.current.states));
    localStorage.setItem("Transitions", JSON.stringify(automataRef.current.transitions));
    localStorage.setItem("Notes", JSON.stringify(automataRef.current.notes));
  }

  function handleAutomataChange(saveToLocalStorage = true) {
    stopSimulation();
    validadeAllInputs();
    if(saveToLocalStorage)
      saveLocalStorage();
  }

  function handleSimulationButtonClick(change: number) {
    let newIndex = simulationIndexRef.current! + change;

    if(change === 0 || newIndex === 0){
      newIndex = 0;
      setSimulationMessage("");
    }
    else if (newIndex < 0) {
      newIndex = 0;
      setSimulationMessage("A Simulação já está em seu estado inicial");
    } else if (newIndex >= simulationStatesRef.current.length) {
      newIndex = simulationStatesRef.current.length - 1;
      setSimulationMessage("A Simulação já chegou ao fim");
    } else {
      setSimulationMessage("");
    }
  
    setSimulationIndex(newIndex);
    simulationIndexRef.current = newIndex;
    const targetState = simulationStatesRef.current[newIndex];
    setZoomTarget(targetState);
    zoomTargetRef.current = targetState;
  }

  const createXMLData = () => {
    const root = builder.create('structure');
    root.ele('type').text('fa');
    
    const automaton = root.ele('automaton');
    
    const ScaleReducer = 1.6;
    // Add states
    automataRef.current.states.forEach(state => {
      const stateEle = automaton.ele('state', { id: state.id, name: state.label });
      stateEle.ele('x').text((state.x/ScaleReducer).toString());
      stateEle.ele('y').text((state.y/ScaleReducer).toString());
      if (state.isInitial) stateEle.ele('initial');
      if (state.isFinal) stateEle.ele('final');
    });
  
    // Add transitions
    automataRef.current.transitions.forEach(transition  => {
      transition.label.forEach(label => {
        const transitionEle = automaton.ele('transition');
        transitionEle.ele('from').text(transition.from.id);
        transitionEle.ele('to').text(transition.to.id);
        if (transition.label !== undefined) {
          transitionEle.ele('read').text(label === "λ" ? "" : label);
        } else {
          transitionEle.ele('read');
        }
      })
    });

    // Add notes
    automataRef.current.notes.forEach(note => {
      const noteEle = automaton.ele('note')
      noteEle.ele('text').text(note.text);
      noteEle.ele('x').text((note.x/ScaleReducer).toString());
      noteEle.ele('y').text((note.y/ScaleReducer).toString());
    })
    return root.end({ pretty: true });
  };

  const saveDataToFile = (data: any, defaultFileName: any) => {
    // Create a Blob from the data
    const blob = new Blob([data], { type: 'text/xml' });
  
    // Create a link element
    const link = document.createElement('a');
  
    // Use the URL.createObjectURL() method to create a URL for the Blob
    link.href = URL.createObjectURL(blob);
  
    // Set the download attribute with a default file name
    link.download = defaultFileName;
  
    // Append the link to the body, trigger the download, and then remove the link
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const clickSaveFile = () => {
    // // Data to save
    // const dataToSave = createXMLData();
    
    // const userInputFileName = prompt("Digite o nome do arquivo:", "myAutomaton.jff");
    // const fileName = userInputFileName ?
    //     (userInputFileName.endsWith(".jff") ? userInputFileName : userInputFileName + ".jff") :
    //     "myAutomaton.jff";  // Default file name if the user presses cancel or inputs nothing
  
    // // Call the save function
    // saveDataToFile(dataToSave, fileName);

    setOpenPopup(PopupType.SAVE_FILE)
    openPopupRef.current = PopupType.SAVE_FILE

    const dataToSave = createXMLData();
    const onSubmit = (fileName: string) => {
      saveDataToFile(dataToSave, fileName);
    }
    setPopupInput({onSubmit})

  };

  const clickRegexToDFA = () => {
    const regexInput = prompt("Digite o nome do arquivo:", "(a|b)*")!;
    if(regexInput)
      automataRef.current.convertRegexToDFA(regexInput);
  }

  const handleFileSelection = (event: any) => {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.jff')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        automataRef.current.clearAutomata();
        const content = e.target!.result;
        if (typeof content === "string") {
          const jsonObj = parser.parse(content);
          createStatesFromXML(jsonObj.structure.automaton.state);
          createTransitionsFromXML(jsonObj.structure.automaton.transition, automataRef.current.states);
          createNotesFromXML(jsonObj.structure.automaton.note);
          event.target.value = '';
          handleAutomataChange()
      } else {
        console.error("File content is not a string.");
      }
    };
    reader.readAsText(file);
    } else {
      alert("Please select a .jff file.");
    }
  };

  const createStatesFromXML = (statesXml: any) => {
    if (!statesXml)
      return;

    if (!Array.isArray(statesXml)) {
      statesXml = [statesXml];
    } 

    //Os arquivos do JFLAP possuem uma escala menor, então aumento um pouco as distâncias durante a importação para ter maior semelhança.
    const scaleMultiplier =  1.6;
    return statesXml.map((stateXml: { id: any; name: string; x: string; y: string; initial?: string; final?: string }) => {
      const isFinal = stateXml.final === "" ? true : false;
      const isInitial = stateXml.initial === "" ? true: false;
      const state = automataRef.current.addState(
        stateXml.id,
        +stateXml.x * scaleMultiplier,
        +stateXml.y * scaleMultiplier,
        CanvasColorsRef.current.DEFAULT_STATE,
        CanvasColorsRef.current.DEFAULT_STATE_SECONDARY,
        isInitial,
        isFinal,
        stateXml.name,
      );
      return state;
    });
  };

  const createTransitionsFromXML = (transitionsXml: any, states: State[]) => {
    if(!transitionsXml)
      return;

    if (!Array.isArray(transitionsXml)) {
      transitionsXml = [transitionsXml];
    }  

    return transitionsXml.map((transitionXml: { from: string; to: string; read: string; }) => {
      const fromState = states.find(state => state.id === transitionXml.from.toString())!;
      const toState = states.find(state => state.id === transitionXml.to.toString())!;
      const label = transitionXml.read === "" ? "λ" : transitionXml.read.toString();
      const transition = automataRef.current.addTransition(
        fromState, 
        toState, 
        [label], 
        CanvasColorsRef.current.DEFAULT_TRANSITION, 
        CanvasColorsRef.current.DEFAULT_TRANSITION_TEXT
      );
      return transition;
    });
  };

  const createNotesFromXML = (notesXml: any) => {
    if(!notesXml)
      return;
    
    if (!Array.isArray(notesXml)) {
      notesXml = [notesXml];
    }

    const scaleMultiplier =  1.6;
    return notesXml.map((noteXml: { text: string; x: string; y: string; }) => {
      const noteText = noteXml.text.toString();
      const noteX = parseFloat(noteXml.x) * scaleMultiplier;
      const noteY = parseFloat(noteXml.y) * scaleMultiplier;
      
      const note = automataRef.current.addNote(
        noteX,
        noteY,
        noteText,
        200,
        100,
        [""],
        16,
        CanvasColorsRef.current.NOTES,
        CanvasColorsRef.current.NOTES_SECONDARY,
      );

      return note;
    });
  };

  function calculateNoteLines(note: Note, p: p5){
    const TEXT_SIZE = 15
    const PADDING = 10
    const RESIZE_ON_OVERFLOW = true
    const result = wrapTextInRectangle(p, note.text, note.x, note.y, note.width, note.height, TEXT_SIZE, PADDING, RESIZE_ON_OVERFLOW);
    note.textLines = result![0];
    note.textSize = parseInt(result![1].toString());
  }
  const clickImportFile = () => {
    if (fileInputRef.current){
      fileInputRef.current.click();
    }
  }

  const Undo = () => {
    automataRef.current.undo()
    handleAutomataChange()
  }
  const Redo = () => {
    automataRef.current.redo()
    handleAutomataChange()
  }

  const closePopup = () => {
    setOpenPopup(PopupType.NONE)
    openPopupRef.current = PopupType.NONE
  }

  const MinimizeAutomata = () => {
    currentCanvasActionRef.current = CanvasActions.ANIMATING;

    let partitionList: any = [];
    let partitions = [
      automataRef.current.getFinalStates(),
      automataRef.current.getStates().filter(s => !automataRef.current.containsId(s, automataRef.current.getFinalStates()))
    ];
    let oldPartitions = [];

    partitionList.push(partitions);
    while (partitions.length !== oldPartitions.length) {
      oldPartitions = partitions;
      partitions = automataRef.current.refinePartitions(partitions);
      partitionList.push(partitions);
    }
    console.log("PartitionList: ", partitionList)
  
    let tempTransitions = JSON.parse(JSON.stringify(automataRef.current.transitions));
    let tempStates = JSON.parse(JSON.stringify(automataRef.current.states));
    
    type Coordinates = {x: number, y: number};
    type CoordinatesMap = Record<string, Coordinates>;
    let originalCoordinates: CoordinatesMap = {}
    automataRef.current.states.forEach((state, index) => {
      originalCoordinates[state.id] = {x: state.x, y: state.y };
    });

    let desiredIndex = 0;
    // automataRef.current.transitions = [];
    // automataRef.current.states = [];
  
    const triggerFunction = () => {
      if (desiredIndex < partitionList.length) {
        if(desiredIndex === 0){
          automataRef.current.addNote(-70, -80, "Estados Finais", 140, 30, ["Estados Finais"], 16, CanvasColorsRef.current.NOTES, CanvasColorsRef.current.NOTES_SECONDARY);
          automataRef.current.addNote(300 + -81, -80, "Estados Não Finais", 170, 30, ["Estados Não Finais"], 16, CanvasColorsRef.current.NOTES, CanvasColorsRef.current.NOTES_SECONDARY);
        } else {
          automataRef.current.notes = []
        }

        displayPartition(partitionList[desiredIndex]);
        displayTransitions(partitionList[desiredIndex]);
        
        desiredIndex++;
      } else {
        clearInterval(intervalId);
        let dfa = automataRef.current.buildMinimizedDFA(partitions)
        automataRef.current.notes = [];
        automataRef.current.states = dfa.states;

        automataRef.current.states.forEach((state, index) => {
          state.targetX = originalCoordinates[state.id].x;
          state.targetY = originalCoordinates[state.id].y;
          state.isAnimating = true;
        });        

        automataRef.current.finalStates = dfa.finalStates;
        automataRef.current.initialState = dfa.initialState;        
        automataRef.current.transitions = [];
        for (const transition of dfa.transitions)
          automataRef.current.addTransition(transition.from, transition.to, transition.label, CanvasColorsRef.current.DEFAULT_TRANSITION, CanvasColorsRef.current.DEFAULT_TRANSITION_TEXT);
        // automataRef.current.transitions = dfa.transitions;
      }
    };
    
    // Trigger the function immediately for the first time
    triggerFunction();
    
    // Set the interval for subsequent triggers
    let intervalId = setInterval(triggerFunction, 1000);
  }

  function displayPartition(partition: any[]) {
    let noteOffset = 50
    partition.forEach((states, counter) => {
      automataRef.current.addNote(300 * counter - noteOffset/2 - 40, -noteOffset, "", noteOffset + 80, noteOffset * 2 + (states.length - 1) * 200, [" "], 16, CanvasColorsRef.current.NOTES, CanvasColorsRef.current.NOTES_SECONDARY);
      let counterY = 0;
      states.forEach((state: State) => {
        state.targetX = 300 * counter;
        state.targetY = counterY * 200;
        state.isAnimating = true;
        counterY++;
      });
    });
  }

  function displayTransitions(partition: any[]) {
    let allTransitions = automataRef.current.getTransitions();
    automataRef.current.transitions = [];
    let stateToPartition = new Map();

    // Step 2: Map states to their sub-partitions
    partition.forEach((states, index) => {
        states.forEach((state: State) => {
            stateToPartition.set(state.id, index);
        });
    });

    // Preparing colors for each symbol-destination pair
    let colors = new Map();

    // Step 3: Draw transitions for each sub-partition
    partition.forEach((states, sourceIndex) => {
        states.forEach((state: State) => {
            allTransitions.filter(t => t.from.id === state.id).forEach(t => {
                let destinationIndex = stateToPartition.get(t.to.id);
                let symbol = t.label;
                let colorKey = `${symbol}-${destinationIndex}`;

                // Step 4: Assign colors if not already assigned
                if (!colors.has(colorKey)) {
                    colors.set(colorKey, getRandomColor());
                }
                
                t.color = colors.get(colorKey);
                t.textColor = colors.get(colorKey);
                automataRef.current.addTransition(t.from, t.to, t.label, t.color, t.textColor)
            });
        });
    });
    // automataRef.current.transitions = allTransitions;
}

function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

  return (
    <div>
      {/* Invisível. Usado para importar .jff de automatos */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".jff"
        style={{ display: 'none' }}
        onChange={handleFileSelection}
      />

      {/* Renderiza Popups */}
      {openPopup === PopupType.CREATE_TRANSITION
        ?
        <CreateTransitionPopup 
          onClose={closePopup}
          popupInput={popupInput}
        />
        : openPopup === PopupType.CREATE_NOTE
        ?
        <CreateNotePopup 
          onClose={closePopup}
          popupInput={popupInput}
        />
        : openPopup === PopupType.SAVE_FILE
        ?
        <SaveAutomataFilePopup 
          onClose={closePopup}
          popupInput={popupInput}
        />
        : openPopup === PopupType.RENAME_STATE &&
        <RenameStatePopup 
          onClose={closePopup}
          popupInput={popupInput}
        />
      }

      <div id="navbar-div">
        {/* Lado Esquerdo */}
        <Toolbox
          currentCanvasToolRef={currentCanvasToolRef}
          handleImportFile={clickImportFile}
          handleSaveFile={clickSaveFile}
          Undo={Undo}
          Redo={Redo}
          MinimizeDFA={MinimizeAutomata}
          RegexToDFA={clickRegexToDFA}
          ClearAutomata = {() => {
            // automataRef.current.clearAutomata()
            setSelectedColorTheme(selectedColorTheme === ColorThemes.DARK ? ColorThemes.LIGHT : ColorThemes.DARK)
          }}
        />

        {/* Lado Direito */}
        <AutomataInputList
          automataRef = {automataRef}
          calculateSteps = {calculateSteps}
          simulationInputId = {simulationInputId}
          stopSimulation = {stopSimulation}
          simulationIndex= {simulationIndex}
        />
      </div>

      {/* Step by Step simulation controls */}
      { simulationInputId !== null &&
        <div id="simulation-controller-div">
        {simulationMessage && (
            <div className={`simulation-message`}>
              {simulationMessage}
            </div>
          )}
          <div className='simulation-controller-buttons-div'>
            <button
                id="close"
                className={
                  `canvas-button simulation-controller-button no-background`
              }
                title="Stop Simulation"
                onClick={() => {
                  stopSimulation();
                }}
              >
                <ErrorIcon/>
            </button>
            <button
                id="beginning"
                disabled={simulationIndex <= 0}
                className={
                  `canvas-button simulation-controller-button rotateicon180`
              }
                title="Beginning"
                onClick={() => {
                  handleSimulationButtonClick(0);
                }}
              >
                <FastforwardIcon/>
            </button>
            <button
                id="next"
                disabled={simulationIndex <= 0}
                className={
                  `canvas-button simulation-controller-button`
                }
                title="Next"
                onClick={() => {
                  handleSimulationButtonClick(-1);
                }}
              >
                <PrevIcon />
            </button>
            <button
                id="play"
                className={
                  "canvas-button simulation-controller-button"
                }
                title="Play"
                onClick={() => {
                  handleSimulationButtonClick(0);
                }}
              >
                <PlayIcon />
            </button>
            <button
                id="next"
                disabled={simulationIndex >= simulationInputText.length}
                className={
                  `canvas-button simulation-controller-button`
                }
                title="Next"
                onClick={() => {
                  handleSimulationButtonClick(+1);
                }}
              >
                <NextIcon />
            </button>
            <button
                id="fastforward"
                disabled={simulationIndex >= simulationInputText.length}
                className={
                  `canvas-button simulation-controller-button`
                }
                title="Fastforward"
                onClick={() => {
                  handleSimulationButtonClick(simulationStatesRef.current.length - 1);
                }}
              >
                <FastforwardIcon/>
            </button>
          </div>
        </div>
      }
      
      {/* Canvas */}
      <div ref={canvasRef}></div>
    </div>
  );
};

// #region Input List
interface AutomataInputListProps {
  automataRef: React.MutableRefObject<Automata>;
  calculateSteps: any;
  simulationInputId: number | null;
  simulationIndex: number;
  stopSimulation: () => void;
}
const AutomataInputList: React.FC<AutomataInputListProps> = (
  {
    automataRef,
    calculateSteps,
    simulationInputId,
    simulationIndex,
    stopSimulation,
  }
) => {
  const { aumataInputResults, removeInput, addInput } = useAutomataInputContext();

  const MIN_INPUT_NUMBER = 1
  const MAX_INPUT_NUMBER = 10

  return(
    <div id='automata-input-div'>
      <div id='automata-input-adder-div' className="canvas-button ">
        <button
          className="automata-input-adder-button mais"
          onClick={() => {addInput(automataRef)}}
          disabled={aumataInputResults.length >= MAX_INPUT_NUMBER}
        >
          <PlusIcon/>
        </button>
        <button
          className="automata-input-adder-button menos"
          onClick={removeInput}
          disabled={aumataInputResults.length <= MIN_INPUT_NUMBER}
        >
          <MinusIcon/>
        </button>
      </div>
      <div id='automata-input-list'>
        {aumataInputResults.map((results, index) => (
          <AutomataInput
            index = {index}
            automataRef = {automataRef}
            calculateSteps = {calculateSteps}
            isSimulating = {index === simulationInputId}
            simulationIndex = {simulationIndex}
            stopSimulation = {stopSimulation}
          />
          ))}
      </div>
    </div>
    )
}
// #endregion

export default Canvas;

