// Css
import "./Canvas.css";

// Components
import Toolbox from "./ToolBox";
import AutomataInput from "./AutomataInput";

// Google Material Icons
import NextIcon from "../symbols/next_icon";
import PrevIcon from "../symbols/prev_icon";
import FastforwardIcon from "../symbols/fastforward_icon";
import PlayIcon from "../symbols/play_icon";
import PlusIcon from "../symbols/plus_icon";
import MinusIcon from "../symbols/minus_icon";
import ErrorIcon from "../symbols/error_icon";

// Libaries
import React, { useRef, useEffect, useState } from "react";
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

// Constants
import { CanvasColors } from "../constants/CanvasConstants";

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
  var cameraZoom: number = 1
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
  let currentCanvasAction: number = CanvasActions.NONE;
  // let currentCanvasToolRef.current: number = CanvasTools.POINTER
  const currentCanvasToolRef = useRef(CanvasTools.POINTER);
  
  const [simulationMessage, setSimulationMessage] = useState('');
  // const [isBackSimulationButtonsDisabled, setIsBackSimulationButtonsDisabled] = useState(false);
  // const [isNextSimulationButtonsDisabled, setIsNextSimulationButtonsDisabled] = useState(false);

  const [simulationStates, setSimulationStates] = useState<State[]>([]);
  const simulationStatesRef = useRef(simulationStates);
  
  const [simulationInputId, setSimulationInputId] = useState<(number | null)>(null);
  const simulationInputIdRef = useRef(simulationInputId);
  const [simulationInputText, setSimulationInputText] = useState<(string)>("");
  const [simulationTransitions, setSimulationTransitions] = useState<(Transition | null)[]>([]);
  const simulationTransitionsRef = useRef(simulationTransitions);
  
  const [simulationIndex, setSimulationIndex] = useState<number>(0);
  const simulationIndexRef = useRef(simulationIndex);

  const [zoomTarget, setZoomTarget] = useState<State>();
  const zoomTargetRef = useRef(zoomTarget);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  let currentZoom = cameraZoom; // Initialize with current zoom
  let currentTranslateX = globalTranslateX; // Initialize with current translation X
  let currentTranslateY = globalTranslateY; // Initialize with current translation Y

  let undoInterval: any = null;

  const getMouseXScaled = (p: p5) => {
    return (p.mouseX / cameraZoom)
  }
  const getMouseYScaled = (p: p5) => {
    return (p.mouseY / cameraZoom)
  }

  const getMouseX = (p: p5) => {
    return getMouseXScaled(p) - globalTranslateX
  }
  const getMouseY = (p: p5) => {
    return getMouseYScaled(p) - globalTranslateY
  }
  const getPreviousMouseX = (p: p5) => {
    return (p.pmouseX / cameraZoom) - globalTranslateX
  }
  const getPreviousMouseY = (p: p5) => {
    return (p.pmouseY / cameraZoom) - globalTranslateY
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
        CanvasColors.DEFAULT_STATE,
        CanvasColors.DEFAULT_STATE_SECONDARY,
        false,
        false,
        id
      );
    }
  }

  const createNewNote = (p: p5) => {
    let text = prompt("Digite o texto da nota: ");
    if(text)
    {
      let note = automataRef.current.addNote(getMouseX(p), getMouseY(p), text, 200, 100, [""], 16, CanvasColors.NOTES, CanvasColors.NOTES_SECONDARY);
      calculateNoteLines(note, p)
    } else{
      alert("A nota não pode estar vazia.");
    }
  }

  // Check colision
  const collidePointArc = (pointX: number, pointY: number, ellipseX: number, ellipseY: number, ellipseWidth: number, ellipseHeight: number, rotation: number, arcStart: number, arcEnd: number) => {   
    // 2D
    var ellipseRadiusX = ellipseWidth / 2, ellipseRadiusY = ellipseHeight / 2;

    // Apply the rotation to the point
    var cosR = Math.cos(rotation);
    var sinR = Math.sin(rotation);
    var xDiff = pointX - ellipseX;
    var yDiff = pointY - ellipseY;
    var rotatedX = cosR * xDiff + sinR * yDiff + ellipseX;
    var rotatedY = -sinR * xDiff + cosR * yDiff + ellipseY;

    // Calculate the angle from the center of the ellipse to the point
    var angle = Math.atan2(rotatedY - ellipseY, rotatedX - ellipseX);

    // Calculate the angle within the specified arc range
    if (arcStart < 0) arcStart += 2 * Math.PI;
    if (arcEnd < 0) arcEnd += 2 * Math.PI;
    if (arcEnd < arcStart) {
        angle += 2 * Math.PI; // Fiz essa linha na mão, talvez esteja errada
        arcEnd += 2 * Math.PI;
    }

    // Check if the angle is within the specified arc range
    if (angle >= arcStart && angle <= arcEnd) {
        // Discard the points outside the bounding box of the rotated ellipse
        if (rotatedX > ellipseX + ellipseRadiusX || rotatedX < ellipseX - ellipseRadiusX || rotatedY > ellipseY + ellipseRadiusY || rotatedY < ellipseY - ellipseRadiusY) {
            return false;
        }

        // Compare the point to its equivalent on the rotated ellipse
        var xx = rotatedX - ellipseX, yy = rotatedY - ellipseY;
        var eyy = ellipseRadiusY * Math.sqrt(Math.abs(ellipseRadiusX * ellipseRadiusX - xx * xx)) / ellipseRadiusX;

        return yy <= eyy && yy >= -eyy;
    }

    return false;
  };

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
          /* 
           * ARCO DA TRANSIÇÃO
           * A posição do arco deve ser 0, 0
           * Isso é necessario pois a rotação ocorre sempre com 0, 0 de ancora
           * Entao o mais facio é criar o elemento lá e então movelo para a posição correta
           * Por isso o p.translate() recebe o local onde o arc() deveria estar
           */
          const transitionAngle = Math.atan2(end.y - start.y, end.x - start.x); // angle of line
          const transitionLenght = p.dist(start.x, start.y, end.x, end.y); // angle of line
          const middleX = (start.x + end.x) / 2
          const middleY = (start.y + end.y) / 2
          const COLISION_ERROR_MARGIN = 20

          // Fix bug onde transição some se for 100% reta
          if (transitionHeight === 0)
            transitionHeight = 0.00000001
          
          // Faz o arco representar o lado oposto da elipse caso
          // a altura do arco seja negativa
          const getArcSlice = (transitionHeight:number, p:p5) => {
            let arcStart = 0
            let arcEnd = p.PI
            if (transitionHeight < 0){
              arcStart = p.PI
              arcEnd = 0
            }
            return {arcStart, arcEnd}
          }

          let outerColisionWidth = transitionLenght + COLISION_ERROR_MARGIN
          let outerColisionHeight = transitionHeight + COLISION_ERROR_MARGIN
          let outerColisionArc = getArcSlice(outerColisionHeight, p)
          let innerColisionWidth = transitionLenght - COLISION_ERROR_MARGIN
          let innerColisionHeight = transitionHeight - COLISION_ERROR_MARGIN
          let innerColisionArc = getArcSlice(innerColisionHeight, p)

          if (transitionHeight < -COLISION_ERROR_MARGIN){
            let aux = outerColisionHeight;
            outerColisionHeight = innerColisionHeight;
            innerColisionHeight = aux;
          }

          if (
            (-COLISION_ERROR_MARGIN < transitionHeight && transitionHeight < COLISION_ERROR_MARGIN) ?
              (collidePointArc(getMouseX(p), getMouseY(p), middleX, middleY, outerColisionWidth, Math.abs(outerColisionHeight), transitionAngle, outerColisionArc.arcStart, outerColisionArc.arcEnd)  
              || collidePointArc(getMouseX(p), getMouseY(p), middleX, middleY, innerColisionWidth, Math.abs(innerColisionHeight), transitionAngle, innerColisionArc.arcStart, innerColisionArc.arcEnd))
            :
              (collidePointArc(getMouseX(p), getMouseY(p), middleX, middleY, outerColisionWidth, Math.abs(outerColisionHeight), transitionAngle, outerColisionArc.arcStart, outerColisionArc.arcEnd)  
              && !collidePointArc(getMouseX(p), getMouseY(p), middleX, middleY, innerColisionWidth, Math.abs(innerColisionHeight), transitionAngle, innerColisionArc.arcStart, innerColisionArc.arcEnd))
          ){
            clickedTransitionTemp = transition
            return
          }
        }
      }
    })
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

  useEffect(() => {
    // calculateSteps();
    if(!automataRef.current){
      automataRef.current = new Automata(); 
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
            validadeAllInputs()
            });

          let option3 = p.createDiv("Final");
          option3.id("ContextMenu-Final")
          option3.mouseClicked(() => {
            automataRef.current.toggleFinal(selectedStates);
            hideContextMenu();
            validadeAllInputs()
          });
          
          let option4 = p.createDiv("Rename");
          option4.id("ContextMenu-Rename");
          option4.mouseClicked(() => {
            if(selectedStates.length > 1) {
              alert("Selecione um estado por vez para alterar seu nome.")
            }
            else{
              let label = prompt("Digite o novo nome: ");
              if(label)
                selectedStates[0].label = label!;
              else
                alert("O nome não pode estar vazio.");
            }
            hideContextMenu();
          });

          contextMenu.child(option2);
          contextMenu.child(option3);
          contextMenu.child(option4);
        }; 

        p.draw = () => {
          p.background(CanvasColors.BACKGROUND);
          p.push();
          p.scale(cameraZoom)
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
            cameraZoom = currentZoom;
            globalTranslateX = currentTranslateX;
            globalTranslateY = currentTranslateY;
        
            // Check if close to target values
            if (p.abs(cameraZoom - targetZoom) < 0.01 && 
                p.abs(globalTranslateX - targetTranslateX) < 0.01 && 
                p.abs(globalTranslateY - targetTranslateY) < 0.01) {
              transitioning = false; // Stop transitioning
            }
          }

          // Renderiza notas
          isCursorOverNoteResizeHandle = false; // Flag to track cursor over the resize handle
          automataRef.current.getNotes().forEach((note: Note, index: number) => {
            p.fill(note.color);
            p.strokeWeight(0) // p.strokeWeight(2)
            p.stroke(note.secondaryColor);
            
            if(clickedNote){
              if(note.id === clickedNote.id){
                p.fill(CanvasColors.NOTES_CLICKED);
                p.stroke(CanvasColors.NOTES_CLICKED_SECONDARY);
              }
            }

            p.rect(note.x, note.y, note.width, note.height, 5);
            p.fill(0) // Reinicia cor para preto
            

            if(note.textLines.length === 1 && note.textLines[0] === ""){
              calculateNoteLines(note, p);
            }

            p.strokeWeight(0)
            p.textAlign(p.LEFT, p.TOP); // Align text to the left and top
            p.textSize(note.textSize);
            p.fill("#FFFFFF")
    
            
            note.textLines.forEach((linha, i) => {
              p.text(linha, note.x + 10, note.y + 10 + i * (note.textSize * 1.2)); // Calculate line height based on text size
            });

            /* ***** Draw resize handle ***** */
            const HANDLE_SIZE_X = 20;
            const HANDLE_SIZE_Y = 20;
            const handleX = note.x + note.width - HANDLE_SIZE_X;
            const handleY = note.y + note.height - HANDLE_SIZE_Y;
            p.fill(CanvasColors.NOTES);
            p.stroke(CanvasColors.NOTES_SECONDARY); 
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

          if (isCursorOverNoteResizeHandle) {
            window.document.body.style.cursor = 'nwse-resize';
          } else if(window.document.body.style.cursor === 'nwse-resize') {
            window.document.body.style.cursor = 'default';
          }

          if(currentCanvasAction === CanvasActions.CREATING_TRANSITION && clickedState){
            p.stroke(CanvasColors.CLICKED_TRANSITION);
            p.fill(CanvasColors.CLICKED_TRANSITION);
            p.strokeWeight(arrowWeight);
            p.line(clickedState.x, clickedState.y, getMouseX(p), getMouseY(p));
          }

          const allTransitions = automataRef.current.getTransitions();
          allTransitions.forEach(
            (transition) => {
              transition.color = CanvasColors.DEFAULT_TRANSITION
              transition.textColor = CanvasColors.DEFAULT_TRANSITION_TEXT
            }
          );
          // Colore todos os estados selecionados como CLICKED color
          selectedTransitions.forEach(
            (transition) => {
              transition.color = CanvasColors.CLICKED_TRANSITION
              transition.textColor = CanvasColors.CLICKED_TRANSITION_TEXT
            }
          );

          if(simulationIndexRef && simulationIndexRef.current! > 0 && simulationIndexRef.current! < simulationStatesRef.current.length){
            simulationTransitionsRef.current[simulationIndexRef.current!]!.color = CanvasColors.SIMULATION_STEP_TRANSITION;
            simulationTransitionsRef.current[simulationIndexRef.current!]!.textColor = CanvasColors.SIMULATION_STEP_TRANSITION_TEXT;
          }

          // Desenha transições
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
                const angle = Math.atan2(end.y - start.y, end.x - start.x); // angle of line
                const radius = start.diameter / 2; // diameter of circle
                const offsetX = radius * Math.cos(angle);
                const offsetY = radius * Math.sin(angle);

                // Draw line from the edge of the start circle to the edge of the end circle
                p.push(); // Start a new drawing state
                p.strokeWeight(arrowWeight);
                p.noFill()
                const middleX = (start.x + end.x) / 2
                const middleY = (start.y + end.y) / 2
                p.bezier(
                  start.x, start.y,
                  middleX, middleY,
                  middleX, middleY,
                  end.x, end.y,
                )
                p.pop()

                // Draw an arrowhead at the edge of the end circle
                p.push(); // Start a new drawing state
                const arrowWidth = 15; // length of arrowhead
                const arrowHeight = 9; // length of arrowhead
                p.translate(end.x - offsetX, end.y - offsetY);
                p.rotate(angle);
                // Arrow tip
                p.triangle(0, 0, -arrowWidth, +arrowHeight, -arrowWidth, -arrowHeight);
                p.pop(); // Restore original state

                const midX = (start.x + end.x) / 2;
                const midY = (start.y + end.y) / 2; 
                const textOffsetY = -15; // Vertical offset for the text label 

                p.push(); // Start another new ing state for the tilted text
                p.translate(midX, midY);
                
                // Corrige textos de cabeça para baixo
                let correctedAngle = angle
                if(end.x < start.x){
                  correctedAngle += Math.PI
                }

                p.strokeWeight(0.1);
                p.stroke(CanvasColors.DEFAULT_TRANSITION_TEXT)
                p.fill(CanvasColors.DEFAULT_TRANSITION_TEXT)
                p.rotate(correctedAngle);
                p.textAlign(p.CENTER, p.CENTER); // Center the text relative to the point
                p.textSize(20);
                p.text(transition.label, 0, textOffsetY);
                p.pop(); // Restore original state
              }
            }
          });

          // Colore todos os estados para DEFAULT color
          const allStates = automataRef.current.getStates();
          allStates.forEach(
            (state) => {
              state.color = CanvasColors.DEFAULT_STATE
              state.secondaryColor = CanvasColors.DEFAULT_STATE_SECONDARY
            }
          );
          // Colore estados do passo atual da simulação como SIMULATION_STEP color
          if(simulationStatesRef.current[simulationIndexRef.current!]){
            simulationStatesRef.current[simulationIndexRef.current!].color = CanvasColors.SIMULATION_STEP_STATE;
            simulationStatesRef.current[simulationIndexRef.current!].secondaryColor = CanvasColors.SIMULATION_STEP_STATE_SECONDARY;
          }
          // Colore todos os estados selecionados como CLICKED color
          selectedStates.forEach(
            (state) => {
              state.color = CanvasColors.CLICKED_STATE
              state.secondaryColor = CanvasColors.CLICKED_STATE_SECONDARY
            }
          );
            
          // ----Desenha estados
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

              p.fill(255);
              p.textAlign(p.CENTER, p.CENTER);
              p.strokeWeight(0)
              wrapText(p, state.label, state.x, state.y, state.diameter, 12);
              
              p.fill(0);
              p.stroke(0);
              p.strokeWeight(2);
            });

          // Desenha caixa de seleção
          if (currentCanvasAction === CanvasActions.CREATING_SELECTION) {
            p.push(); // Start a new drawing state
            p.fill(CanvasColors.SELECTION);
            p.stroke(CanvasColors.SELECTION_BORDER);
            p.rect(
              selectionX,
              selectionY,
              selectionDistanceX,
              selectionDistanceY
            );
            p.pop();
          }

          /* 🎬🎬🎬 TEXTO DA SIMULAÇÃO DO AUTOMATO */
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
                  p.fill(CanvasColors.DEFAULT_TRANSITION);
                } else if (i === currentIndex) {
                  p.fill(CanvasColors.DEFAULT_STATE);
                } else {
                  p.fill(CanvasColors.DEFAULT_TRANSITION_TEXT);
                }

              } else { //Finalizou por completo a simulação
                let lastState = simulationStatesRef.current[simulationIndexRef.current!]
                if (lastState && lastState.isFinal) {
                  p.fill(CanvasColors.INFO_SUCCESS);
                } else {
                  p.fill(CanvasColors.INFO_ERROR);
                }
              }

              p.textAlign(p.CENTER, p.CENTER);
              p.strokeWeight(7);
              p.stroke(CanvasColors.BACKGROUND)
              p.strokeJoin(p.ROUND)
              p.text(char, x + (window.innerWidth / 2), window.innerHeight - TEXT_HEIGHT); // Position the text at the top
              x += TEXT_SIZE; // Increment x for the next character

            }
            p.pop(); // Restore previous transformation state
          } 
          /* 🎬🎬🎬 TEXTO DA SIMULAÇÃO DO AUTOMATO */
        };

        function startTransition(newTargetX: number, newTargetY: number, newZoom: number) {
          targetZoom = newZoom;
          targetTranslateX = (p.width / newZoom) / 2 - newTargetX * newZoom;
          targetTranslateY = (p.height / newZoom) / 2 - newTargetY * newZoom;
          transitioning = true;
        }

        function adjustZoomAndPan(targetX: number, targetY: number) {
          const newZoom = 1;
          
          cameraZoom = newZoom;
        
          // Calculate the necessary translation to center on the target
          const canvasCenterX = (p.width / cameraZoom) / 2;
          const canvasCenterY = (p.height / cameraZoom) / 2;
        

          //Não ta centralizando corretamente. É próximo, então acredito que não está considerando
          //A escala na hora do cálculo
          //NewZoom = 1 funciona corretamente. O problema é o zoom.
          globalTranslateX = canvasCenterX - targetX * newZoom;
          globalTranslateY = canvasCenterY - targetY * newZoom;
        }
      

        p.mouseWheel = (event: WheelEvent) => {
          transitioning = false;
          var oldZoom = cameraZoom;
          cameraZoom -= (event.deltaY / 1000) //1000
          if (cameraZoom < 0.2)
            cameraZoom = 0.2
          else if(cameraZoom > 4)
            cameraZoom = 4
          
          var newZoom = cameraZoom;

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
          const allStates = automataRef.current.getStates();

          if (currentCanvasAction === CanvasActions.MOVING_STATE) {
            // selectedStates.forEach((auxState: automataRef.current.State) => { // <--- deu errado o type
            selectedStates.forEach((state: State) => {
              state.x = roundNumber(getMouseX(p), 20) + roundNumber(selectedStateMouseOffset[state.id]["x"], 20);
              state.y = roundNumber(getMouseY(p), 20) + roundNumber(selectedStateMouseOffset[state.id]["y"], 20);
            });
          } else if (currentCanvasAction === CanvasActions.CREATING_SELECTION) {
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

          } else if (currentCanvasAction === CanvasActions.MOVING_CANVAS){
            const deltaX = getMouseX(p) - getPreviousMouseX(p);
            const deltaY = getMouseY(p) - getPreviousMouseY(p);
            globalTranslateX += deltaX;
            globalTranslateY += deltaY;
          } else if (currentCanvasAction === CanvasActions.RESIZING_TRANSITION){
            if (clickedTransition){
              let dx = (getMouseX(p) - getPreviousMouseX(p)) * 2
              let dy = (getMouseY(p) - getPreviousMouseY(p)) * 2
              let angle = Math.atan2(clickedTransition.from.y - clickedTransition.to.y, clickedTransition.from.x - clickedTransition.to.x)
              let final = (Math.sin(angle) * dx) - (Math.cos(angle) * dy)

              //clickedTransition.height += final
              clickedTransition.height = clickedTransition.height;
            }
          } else if (currentCanvasAction === CanvasActions.MOVING_NOTE){
            clickedNote!.x = getMouseX(p) + selectedNoteMouseOffset[clickedNote!.id]["x"];
            clickedNote!.y = getMouseY(p) + selectedNoteMouseOffset[clickedNote!.id]["y"];
          } else if (currentCanvasAction ===  CanvasActions.RESIZING_NOTE){
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
          if(p.mouseButton === p.CENTER){
            console.log(automataRef.current.states)
            console.log(automataRef.current.transitions)
          }

          //Se o click não foi no próprio contextMenu, ocultar o menu.
          if (event.target.id && !event.target.id.includes('ContextMenu')) {
            hideContextMenu();
          }
          //Gambiarra para não executar a tool selecionada ao clicar em botões
          if ((event.target instanceof HTMLButtonElement || event.target instanceof HTMLInputElement || event.target.nodeName === 'svg' || event.target.nodeName === 'path')) {
            return;
          }

          if (contextMenuIsOpen) {
          } else {
            const allStates = automataRef.current.getStates();
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
            clickedTransition = getClickedTransition(p)
            if (clickedTransition){
              selectedTransitions = [clickedTransition] 
            } else {
              selectedTransitions = []
            }

            const allNotes = automataRef.current.getNotes();
            
            if(allNotes.length > 0){
              clickedNote = allNotes.find((note) => {
                return getMouseX(p) >= note.x && getMouseX(p) <= note.x + note.width &&
                       getMouseY(p) >= note.y && getMouseY(p) <= note.y + note.height;
              }) || null;
            }

            // Create new 
            if (p.mouseButton === p.LEFT && p.keyIsDown(p.SHIFT)) {
              if (!clickedState) {
                createNewState(allStates, p)
              }
            }
            else if (p.mouseButton === p.CENTER || (p.keyIsDown(p.CONTROL) && p.mouseButton === p.LEFT)){
                currentCanvasAction = CanvasActions.MOVING_CANVAS;
                transitioning = false;
                // Muda cursor para "grab" cursor
                window.document.body.style.cursor = 'grab';
            }
            /* Pointer */
            else if (currentCanvasToolRef.current === CanvasTools.POINTER) {
              // Botão esquerdo: Cria transições / Cria estados
              currentCanvasAction = CanvasActions.NONE;

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
                  currentCanvasAction = CanvasActions.MOVING_STATE;
                  automataRef.current.pushSnapshotToUndo()
                  automataRef.current.redoStack = [];
                  // Muda cursor para "grab" cursor
                  window.document.body.style.cursor = 'grab';
                } 
                // Criando caixa de seleção
                else if (clickedTransition){
                  currentCanvasAction = CanvasActions.RESIZING_TRANSITION;
                }
                else if (clickedNote){
                  if(isCursorOverNoteResizeHandle){
                    currentCanvasAction = CanvasActions.RESIZING_NOTE
                  }
                  else {
                    currentCanvasAction = CanvasActions.MOVING_NOTE;
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
                  currentCanvasAction = CanvasActions.CREATING_SELECTION;
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
                validadeAllInputs()
              } else if(clickedTransition) {
                automataRef.current.deleteTransition(clickedTransition);
                validadeAllInputs()
              } else if (clickedNote) {
                automataRef.current.deleteNote(clickedNote);                
              }

              /* Mover */
            } else if (currentCanvasToolRef.current === CanvasTools.MOVE) {
              currentCanvasAction = CanvasActions.MOVING_CANVAS;
              // Muda cursor para "grab" cursor
              window.document.body.style.cursor = 'grab';
              /* Cria transição */
            } else if (currentCanvasToolRef.current === CanvasTools.TRANSITION) {
              currentCanvasAction = CanvasActions.CREATING_TRANSITION;
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
          window.document.body.style.cursor = 'default';
          
          if(currentCanvasAction === CanvasActions.MOVING_STATE)
          {
            automataRef.current.pushSnapshotToUndo();
            automataRef.current.redoStack = [];
          }

          if(currentCanvasAction === CanvasActions.RESIZING_NOTE){
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
              currentCanvasAction === CanvasActions.CREATING_TRANSITION
            ) {
              let label = prompt("Digite o símbolo de transição: ");
              if (label !== null) {
                if (label === "") label = "λ";
                const labels = label.split(",");
                labels.forEach(l => l.trim());
                automataRef.current.addTransition(
                  clickedState,
                  endState,
                  labels,
                  CanvasColors.DEFAULT_TRANSITION,
                  CanvasColors.DEFAULT_TRANSITION_TEXT,
                );
                validadeAllInputs()
              }
            }
          }
          currentCanvasAction = CanvasActions.NONE;
          clickedState = null;
        };

        p.keyPressed = () => {
          // Está bugado!
          // Não reconhece numero, a não ser q alt ou cntrl estejam apertados

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
                validadeAllInputs()
              }
            } else if (clickedTransition){
              automataRef.current.deleteTransition(clickedTransition);
              validadeAllInputs();
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
            automataRef.current.redo();
            undoInterval = setInterval(() => {
              automataRef.current.redo();
            }, 200); 
          }

          // Redo
          else if (p.keyIsDown(p.CONTROL) && (p.key === 'Z' || p.key === 'z') && !undoInterval) {
            automataRef.current.undo();
            undoInterval = setInterval(() => {
              automataRef.current.undo();
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
        };

        p.keyReleased = () => {
          // Stop Undo when Z is released
          if ((p.key === 'Z' || p.key === 'z' || p.key === 'Y' || p.key === 'y') && undoInterval) {
            clearInterval(undoInterval);
            undoInterval = null;
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
    currentCanvasAction = CanvasActions.SIMULATING;
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
            x.from === estadoAnterior && 
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
    console.log("Updated States", newSimulationStates);
    console.log("Updated Transitions", newSimulationTransitions);
    console.log("Updated inputText", inputText);
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

  function stopSimulation(){
    setSimulationMessage("");
    setSimulationIndex(0)
    setSimulationTransitions([])
    setSimulationStates([])
    setSimulationInputText("")
    setSimulationInputId(null)
    simulationInputIdRef.current = null
  }

  function handleSimulationButtonClick(change: number) {
    let newIndex = simulationIndexRef.current! + change;

    if(change === 0 || newIndex === 0){
      newIndex = 0;
      setSimulationMessage("");
      // setIsBackSimulationButtonsDisabled(false);
      // setIsNextSimulationButtonsDisabled(false);
    }
    else if (newIndex < 0) {
      newIndex = 0;
      setSimulationMessage("A Simulação já está em seu estado inicial");
      // setIsBackSimulationButtonsDisabled(true);
      // setIsNextSimulationButtonsDisabled(false);
    } else if (newIndex >= simulationStatesRef.current.length) {
      newIndex = simulationStatesRef.current.length - 1;
      setSimulationMessage("A Simulação já chegou ao fim");
      // setIsBackSimulationButtonsDisabled(false);
      // setIsNextSimulationButtonsDisabled(true);
    } else {
      setSimulationMessage("");
      // setIsBackSimulationButtonsDisabled(false);
      // setIsNextSimulationButtonsDisabled(false);
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
    // Data to save
    const dataToSave = createXMLData();  // Replace this with the actual data you want to save
    
    // Default file name
    const defaultFileName = "myAutomaton.jff";  // You can prompt the user for a file name if needed
  
    // Call the save function
    saveDataToFile(dataToSave, defaultFileName);
  };


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
        CanvasColors.DEFAULT_STATE,
        CanvasColors.DEFAULT_STATE_SECONDARY,
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
        CanvasColors.DEFAULT_TRANSITION, 
        CanvasColors.DEFAULT_TRANSITION_TEXT
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
        CanvasColors.NOTES,
        CanvasColors.NOTES_SECONDARY,
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

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        accept=".jff"
        style={{ display: 'none' }}
        onChange={handleFileSelection}
      />

      <div id="navbar-div">
        {/* Lado Esquerdo */}
        <Toolbox
          currentCanvasToolRef={currentCanvasToolRef}
          handleImportFile={clickImportFile}
          handleSaveFile={clickSaveFile}
          Undo={() => automataRef.current.undo()}
          Redo={() => automataRef.current.redo()}
          MinimizeDFA={() => automataRef.current.minimizeDFA()}
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

export default Canvas;

