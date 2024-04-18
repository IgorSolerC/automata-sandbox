// Css
import "./Canvas.css";

// Components
import Toolbox from "./ToolBox";
import AutomataInput from "./AutomataInput";

// Google Material Icons
import CursorIcon from "../symbols/cursor_icon";
import TrashIcon from "../symbols/trash_icon";
import UndoIcon from "../symbols/undo_icon";
import RedoIcon from "../symbols/redo_icon";
import MoveIcon from "../symbols/move_icon";
import TransitionIcon from "../symbols/transition_icon";
import CheckIcon from "../symbols/check_icon";
import WarningIcon from "../symbols/warning_icon";
import NextIcon from "../symbols/next_icon";
import PrevIcon from "../symbols/prev_icon";
import FastforwardIcon from "../symbols/fastforward_icon";
import PauseIcon from "../symbols/pause_icon";
import PlayIcon from "../symbols/play_icon";
import ErrorIcon from "../symbols/error_icon";
import PlusIcon from "../symbols/plus_icon";
import MinusIcon from "../symbols/minus_icon";
import AddCircleIcon from "../symbols/add_circle_icon";

// Libaries
import React, { useRef, useEffect, useState } from "react";
import p5 from "p5";
import { XMLParser } from 'fast-xml-parser';

// Objects
import { Automata } from "../models/Automata";
import { State } from "../models/State";
import { Transition } from "../models/Transition";

// Enums
import { CanvasActions } from "../enums/CanvasActionsEnum";
import { CanvasTools } from "../enums/CanvasToolsEnum";
import { AutomataInputResultsEnum } from "../enums/AutomataInputEnum";

// Constants
import { CanvasColors } from "../Constants/CanvasConstants";

// Contexts
import { ToolboxProvider, useToolboxContext } from "../contexts/ToolboxContext";
import { AutomataInputProvider, useAutomataInputContext } from "../contexts/AutamataInputContext";
import { json } from "body-parser";

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
  
  // Enums
  let currentCanvasAction: number = CanvasActions.NONE;
  // let currentCanvasToolRef.current: number = CanvasTools.POINTER
  const currentCanvasToolRef = useRef(CanvasTools.POINTER);
  
  const [simulationMessage, setSimulationMessage] = useState('');
  const [isBackSimulationButtonsDisabled, setIsBackSimulationButtonsDisabled] = React.useState(false);
  const [isNextSimulationButtonsDisabled, setIsNextSimulationButtonsDisabled] = React.useState(false);

  const [simulationStates, setSimulationStates] = useState<State[]>([]);
  const simulationStatesRef = useRef(simulationStates);
  
  const [simulationTransitions, setSimulationTransitions] = useState<(Transition | null)[]>([]);
  const simulationTransitionsRef = useRef(simulationTransitions);
  
  const [simulationIndex, setSimulationIndex] = useState<number>();
  const simulationIndexRef = useRef(simulationIndex);

  const [zoomTarget, setZoomTarget] = useState<State>();
  const zoomTargetRef = useRef(zoomTarget);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    simulationStatesRef.current = simulationStates;
  }, [simulationStates]);



  let selectedStateMouseOffset: any; // {'q1': {'x': 10, 'y': -10}, 'q2': {'x': 10, 'y': -10}}

  // Selection box variables
  let selectionStarterY: number = 0; 
  let selectionStarterX: number = 0;
  let selectionX: number = 0;
  let selectionY: number = 0;
  let selectionDistanceX: number = 0;
  let selectionDistanceY: number = 0;

  let transitioning = false;
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
      while (allStates.some(state => state.id === id || state.label === id)) {
        id_number++;
        id = `q${id_number}`;
      }
      // Cria novo estado
      automataRef.current.addState(
        id,
        getMouseX(p),
        getMouseY(p),
        CanvasColors.DEFAULT_STATE,
        CanvasColors.DEFAULT_STATE_SECONDARY,
      );
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

    calculateSteps();

      // Simulate automata again
    setAumataInputResults(aumataInputResultsAux)
  }

  useEffect(() => {
    calculateSteps();
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
          option2.mouseClicked(() => {
            toggleInitial(p);
            hideContextMenu();
            validadeAllInputs()
            });

          let option3 = p.createDiv("Final");
          option3.mouseClicked(() => {
            automataRef.current.toggleFinal(selectedStates);
            hideContextMenu();
            validadeAllInputs()
          });
          
          let option4 = p.createDiv("Change State Name");
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
          
          var input = (document.getElementsByClassName("automata-input")[0] as HTMLInputElement)?.value;
          let currentIndex = simulationIndexRef.current;
          if (input && (currentIndex || currentIndex === 0)) {
            let x = - (input.length * 12) / 2; // Adjust starting x position relative to the center

            p.push(); // Save current transformation state
            p.resetMatrix(); // Reset transformations or adjust according to the camera

            // Drawing the text at the top of the canvas
            if(currentIndex < simulationStatesRef.current.length - 1){

              for (let i = 0; i < input.length; i++) {
                let char = input[i];
                if (i < currentIndex) {
                    p.fill('gray');
                  } else if (i === currentIndex) {
                    p.fill('red');
                    p.textSize(30);
                } else {
                    p.fill(CanvasColors.DEFAULT_TRANSITION_TEXT);
                    p.textSize(20);
                }
                
                p.textAlign(p.CENTER, p.CENTER);
                p.strokeWeight(0.1);
                p.text(char, x + (window.innerWidth / 2), 20); // Position the text at the top
                x += 18; // Increment x for the next character
              }

              p.pop(); // Restore previous transformation state
            } else { //Finalizou por completo a simulação
              for (let i = 0; i < input.length; i++) {
                let char = input[i];
                let lastState = simulationStatesRef.current[simulationIndexRef.current!]
                if (lastState && lastState.isFinal) {
                    p.fill('green');
                } else {
                    p.fill('red');
                  }
                p.textSize(30);
                
                p.textAlign(p.CENTER, p.CENTER);
                p.strokeWeight(0.1);
                p.text(char, x + (window.innerWidth / 2), 20); // Position the text at the top
                x += 20; // Increment x for the next character
              }

              p.pop(); // Restore previous transformation state
            }
          } 
          
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
              // Transições para outros estrados
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

                p.push(); // Start another new drawing state for the tilted text
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
          
          // 🕯️🕯️🕯️🕯️🕯️🕯️🕯️🕯️
          const mouseXWorld = getMouseXScaled(p);
          const mouseYWorld = getMouseYScaled(p);
          
          // Calculate how the mouse's world coordinates would change due to the new zoom
          const mouseXWorldScaled = mouseXWorld * (newZoom / oldZoom);
          const mouseYWorldScaled = mouseYWorld * (newZoom / oldZoom);
          
          // Update globalTranslateX and globalTranslateY to keep the mouse's world coordinates the same
          globalTranslateX += mouseXWorld - mouseXWorldScaled;
          globalTranslateY += mouseYWorld - mouseYWorldScaled;
          // 🕯️🕯️🕯️🕯️🕯️🕯️🕯️🕯️
        }
        
        p.mouseDragged = () => {
          const allStates = automataRef.current.getStates();

          if (currentCanvasAction === CanvasActions.MOVING_STATE) {
            // selectedStates.forEach((auxState: automataRef.current.State) => { // <--- deu errado o type
            selectedStates.forEach((state: State) => {
              state.x = getMouseX(p) + selectedStateMouseOffset[state.id]["x"];
              state.y = getMouseY(p) + selectedStateMouseOffset[state.id]["y"];
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
          }
        };

        p.mousePressed = (event: any) => {
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
                //Esconde o menu de contexto
                // hideContextMenu();
                
                /* Shift NÃO apertado, clicou em um estado */
                // Move estado
                if (clickedState) {
                  // Set offset, usado para não centralizar com o mouse os estados movidos
                  selectedStateMouseOffset = {};
                  selectedStates.forEach((state) => {
                    selectedStateMouseOffset[state.id] = {};
                    selectedStateMouseOffset[state.id]["x"] =
                      state.x - getMouseX(p);
                    selectedStateMouseOffset[state.id]["y"] =
                      state.y - getMouseY(p);
                  });

                  // Set estado atual como "Movendo estado"
                  currentCanvasAction = CanvasActions.MOVING_STATE;
                  automataRef.current.pushSnapshotToUndo()
                  automataRef.current.redoStack = [];
                  // Muda cursor para "grap" cursor
                  window.document.body.style.cursor = 'grab';
                } 
                // Criando caixa de seleção
                else if (clickedTransition){
                  currentCanvasAction = CanvasActions.RESIZING_TRANSITION;
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
              } else if(clickedTransition){
                automataRef.current.deleteTransition(clickedTransition);
                validadeAllInputs()
              }

              /* Mover */
            } else if (currentCanvasToolRef.current === CanvasTools.MOVE) {
              currentCanvasAction = CanvasActions.MOVING_CANVAS;
              // Muda cursor para "grap" cursor
              window.document.body.style.cursor = 'grab';
              /* Cria transição */
            } else if (currentCanvasToolRef.current === CanvasTools.TRANSITION) {
              currentCanvasAction = CanvasActions.CREATING_TRANSITION;
              /* Cria estado */
            } else if (currentCanvasToolRef.current === CanvasTools.ADD_STATE) {
              createNewState(allStates, p)
            }
          }
        };

        p.mouseReleased = () => {
          window.document.body.style.cursor = 'default';
          console.log(automataRef.current.undoStack)
          console.log(automataRef.current.redoStack);
          
          if(currentCanvasAction === CanvasActions.MOVING_STATE)
          {
            automataRef.current.pushSnapshotToUndo();
            automataRef.current.redoStack = [];
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
                automataRef.current.addTransition(
                  clickedState,
                  endState,
                  label,
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
              }
            
            } else if (clickedTransition){
              automataRef.current.deleteTransition(clickedTransition);
            }
            validadeAllInputs()
          }

          /* Undo e Redo */
          if (p.keyIsDown(p.CONTROL) && (p.key === 'Z' || p.key === 'z') && !undoInterval) {
            automataRef.current.undo();
            undoInterval = setInterval(() => {
              automataRef.current.undo();
            }, 200);  // Repeat undo every 200 ms
          }
          if (p.keyIsDown(p.CONTROL) && (p.key === 'Y' || p.key === 'y') && !undoInterval) {
            automataRef.current.redo();
            undoInterval = setInterval(() => {
              automataRef.current.redo();
            }, 200); 
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
            currentCanvasToolRef.current = CanvasTools.MOVE;
            setSelectedToolState(CanvasTools.MOVE)
          }
          else if (p.key === "5") {
            currentCanvasToolRef.current = CanvasTools.ERASER;
            setSelectedToolState(CanvasTools.ERASER)
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

  function calculateSteps() {
    currentCanvasAction = CanvasActions.SIMULATING;
    var input = (document.getElementsByClassName("automata-input")[0] as HTMLInputElement).value;
    let newSimulationStates = [];
    let newSimulationTransitions = [];
    setSimulationIndex(0);
    simulationIndexRef.current = 0;
    var estadoAtual: State = automataRef.current.getInitialState()!;

    var estadoAnterior: State = estadoAtual;

    newSimulationStates.push(estadoAtual)
    const allTransitions = automataRef.current.getTransitions();
    for(let i = 0; i < input.length; i++) {
      let result = automataRef.current.testTransition(input, estadoAtual, i);

      if(i === 0)
        newSimulationTransitions.push(null);
      else{
        newSimulationTransitions.push(allTransitions.find(x => x.from === estadoAnterior && x.label === input[i - 1])!);
      }
      

      newSimulationStates.push(result.nextState!);
      if(!result.isValidTransition){ 
        console.log('Transição inválida');
        break;  
      }
      estadoAnterior = estadoAtual;
      estadoAtual = result.nextState!;
    }

    if(estadoAnterior)
      newSimulationTransitions.push(allTransitions.find(x => x.from === estadoAnterior && x.label === input[input.length - 1])!);
    
      if(automataRef.current.getFinalStates().some(x => x === simulationStates[simulationStates.length - 1])){
      console.log("ACEITO"); 
    } else{
      console.log("REJEITADO");
    }
    setSimulationStates(newSimulationStates);
    simulationStatesRef.current = newSimulationStates;
    setSimulationTransitions(newSimulationTransitions)
    simulationTransitionsRef.current = newSimulationTransitions;
    console.log("Updated States", newSimulationStates);
    console.log("Updated Transitions", newSimulationTransitions);
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

  function handleSimulationButtonClick(change: number) {
    let newIndex = simulationIndexRef.current! + change;

    if(change === 0 || newIndex === 0){
      newIndex = 0;
      setSimulationMessage("");
      setIsBackSimulationButtonsDisabled(false);
      setIsNextSimulationButtonsDisabled(false);
    }
    else if (newIndex < 0) {
      newIndex = 0;
      setSimulationMessage("A Simulação já está em seu estado inicial");
      setIsBackSimulationButtonsDisabled(true);
      setIsNextSimulationButtonsDisabled(false);
    } else if (newIndex >= simulationStatesRef.current.length) {
      newIndex = simulationStatesRef.current.length - 1;
      setSimulationMessage("A Simulação já chegou ao fim");
      setIsBackSimulationButtonsDisabled(false);
      setIsNextSimulationButtonsDisabled(true);
    } else {
      setSimulationMessage("");
      setIsBackSimulationButtonsDisabled(false);
      setIsNextSimulationButtonsDisabled(false);
    }
  
    setSimulationIndex(newIndex);
    simulationIndexRef.current = newIndex;
    const targetState = simulationStatesRef.current[newIndex];
    setZoomTarget(targetState);
    zoomTargetRef.current = targetState;
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
    return transitionsXml.map((transitionXml: { from: string; to: string; read: string; }) => {
      const fromState = states.find(state => state.id === transitionXml.from.toString())!;
      const toState = states.find(state => state.id === transitionXml.to.toString())!;
      const label = transitionXml.read === "" ? "λ" : transitionXml.read.toString();
      const transition = automataRef.current.addTransition(
        fromState, 
        toState, 
        label, 
        CanvasColors.DEFAULT_TRANSITION, 
        CanvasColors.DEFAULT_TRANSITION_TEXT
      );
      return transition;
    });
  };

  return (
    <div>
      <div id="navbar-div">
        {/* Lado Esquerdo */}
        <Toolbox
          currentCanvasToolRef={currentCanvasToolRef}
        />

        {/* Lado Direito */}
        <AutomataInputList
          automataRef = {automataRef}
          calculateSteps = {calculateSteps}
        />
      </div>

      {/* Step by Step simulation controls */}
      <div id="simulation-controller-div">
      {simulationMessage && (
          <div className={`simulation-message ${simulationMessage && 'animate-message'}`}>
            {simulationMessage}
          </div>
        )}
        <div className='simulation-controller-buttons-div'>
          <button
              id="beginning"
              disabled={isBackSimulationButtonsDisabled}
              className={
                `canvas-button simulation-controller-button rotateicon180 ${
                    !isBackSimulationButtonsDisabled ? "enabled-button-class" : "disabled-button-class"
                }`
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
              disabled={isBackSimulationButtonsDisabled}
              className={
                `canvas-button simulation-controller-button ${
                  !isBackSimulationButtonsDisabled ? "enabled-button-class" : "disabled-button-class"
              }`
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
              disabled={isNextSimulationButtonsDisabled}
              className={
                `canvas-button simulation-controller-button ${
                  !isNextSimulationButtonsDisabled ? "enabled-button-class" : "disabled-button-class"
              }`
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
              disabled={isNextSimulationButtonsDisabled}
              className={
                `canvas-button simulation-controller-button ${
                  !isNextSimulationButtonsDisabled ? "enabled-button-class" : "disabled-button-class"
              }`
              }
              title="Fastforward"
              onClick={() => {
                handleSimulationButtonClick(simulationStatesRef.current.length - 1);
              }}
            >
              <FastforwardIcon/>
          </button>
          <button
            id="Import"
            className="canvas-button simulation-controller-button rotateicon90"
            title="Import"
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.click();
              }
            }}
          >
            <PlayIcon />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            accept=".jff"
            style={{ display: 'none' }}
            onChange={handleFileSelection}
          />
        </div>
      </div>
      
      {/* Canvas */}
      <div ref={canvasRef}></div>
    </div>
  );
};

interface AutomataInputListProps {
  automataRef: React.MutableRefObject<Automata>;
  calculateSteps: any;
}
const AutomataInputList: React.FC<AutomataInputListProps> = (
  {
    automataRef,
    calculateSteps
  }
) => {
  const { aumataInputResults, removeInput, addInput } = useAutomataInputContext();

  return(
    <div id='automata-input-div'>
      <div id='automata-input-adder-div' className="canvas-button ">
        <button
          className="automata-input-adder-button mais"
          onClick={() => {addInput(automataRef)}}
        >
          <PlusIcon/>
        </button>
        <button
          className="automata-input-adder-button menos"
          onClick={removeInput}
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
          />
          ))}
      </div>
    </div>
    )
}

export default Canvas;

