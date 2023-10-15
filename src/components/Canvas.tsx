// Css
import "./Canvas.css";

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

// Libaries
import React, { useRef, useEffect, useState } from "react";
import p5 from "p5";

// Objects
import { Automata } from "../models/Automata";
import { State } from "../models/State";

// Enums
import { CanvasActions } from "../enums/CanvasActionsEnum";
import { CanvasTools } from "../enums/CanvasToolsEnum";
import { AutomataInputResultsEnum } from "../enums/AutomataInputEnum";

// Constants
import { CanvasColors } from "../Constants/CanvasConstants";

// Contexts
import { ToolboxProvider, useToolboxContext } from "../contexts/ToolboxContext";
import { AutomataInputProvider, useAutomataInputContext } from "../contexts/AutamataInputContext";

// let canvasObject: p5 | null = null; // Variável para armazenar o sketch
let automata: Automata = new Automata();

const Canvas: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const p5Instance = useRef<p5 | null>(null);
  const automataRef = useRef(automata);
  let contextMenu: p5.Element;
  // let slider: p5.Element;
  
  let contextMenuIsOpen: boolean = false;

  // Zoom / Movement
  var cameraZoom: number = 1;

  // Tool selecionada
  const { setSelectedToolState } = useToolboxContext();
  const { aumataInputResults, setAumataInputResults } = useAutomataInputContext();
  
  // Arrays de States
  let clickedState: State | null;
  let selectedStates: State[] = [];
  let nearState: State | null;
  let highlightedState: State | null;
  let simulationStates: State[] = [];
  let simulationIndex: number = 0;

  // Enums
  let currentCanvasAction: number = CanvasActions.NONE;
  // let currentCanvasToolRef.current: number = CanvasTools.POINTER
  const currentCanvasToolRef = useRef(CanvasTools.POINTER);

  let selectedStateMouseOffset: any; // {'q1': {'x': 10, 'y': -10}, 'q2': {'x': 10, 'y': -10}}

  // Selection box variables
  let selectionStarterY: number = 0; 
  let selectionStarterX: number = 0;
  let selectionX: number = 0;
  let selectionY: number = 0;
  let selectionDistanceX: number = 0;
  let selectionDistanceY: number = 0;

  const getMouseX = (p: p5) => {
    return p.mouseX / cameraZoom
  }
  const getMouseY = (p: p5) => {
    return p.mouseY / cameraZoom
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
            // Create input array copy
            let aumataInputResultsAux = [...aumataInputResults]
            for (let i=0; i<aumataInputResultsAux.length; i++){
              const { result, message } = automataRef.current.validate(aumataInputResultsAux[i].input);
              
              // Update automata results
              aumataInputResultsAux[i].result = result
              aumataInputResultsAux[i].message = message
            }
              // Simulate automata again
            setAumataInputResults(aumataInputResultsAux)
            });

          let option3 = p.createDiv("Final");
          option3.mouseClicked(() => {
            automataRef.current.toggleFinal(selectedStates);
            hideContextMenu();
            // Create input array copy
            let aumataInputResultsAux = [...aumataInputResults]
            for (let i=0; i<aumataInputResultsAux.length; i++){
              const { result, message } = automataRef.current.validate(aumataInputResultsAux[i].input);
              
              // Update automata results
              aumataInputResultsAux[i].result = result
              aumataInputResultsAux[i].message = message
            }
              // Simulate automata again
            setAumataInputResults(aumataInputResultsAux)
          });

          contextMenu.child(option2);
          contextMenu.child(option3);
        }; 

        p.draw = () => {
          p.background(CanvasColors.BACKGROUND);

          p.scale(cameraZoom)
          p.strokeCap(p.PROJECT);
          const arrowWeight = 5; 

          // Desenha transições
          automataRef.current.getTransitions().forEach((transition) => {
            const start = automataRef.current.findState(transition.from.id);
            const end = automataRef.current.findState(transition.to.id);
            if (start && end) {
              p.stroke(CanvasColors.DEFAULT_TRANSITION);

              // Transições para o mesmo estado
              if (start.id === end.id) {
                const loopRadius = start.diameter / 2;
                const angle = Math.PI / 6; 
                
                const loopStartX = start.x + loopRadius * Math.cos(angle);
                const loopStartY = start.y + loopRadius * Math.sin(angle);
          
                p.noFill();
                p.stroke(CanvasColors.DEFAULT_TRANSITION);
                p.strokeWeight(arrowWeight);
                p.ellipse(start.x, start.y - start.diameter / 2, loopRadius * 2, loopRadius * 2);
                
                p.push();
                p.translate(loopStartX, loopStartY - loopRadius);

                p.fill(CanvasColors.DEFAULT_TRANSITION);
                p.triangle(1,-2,-4,-19,14,-12);
                p.pop();

                // Label
                p.push();
                p.stroke(CanvasColors.DEFAULT_TRANSITION_TEXT)
                p.fill(CanvasColors.DEFAULT_TRANSITION_TEXT)
                p.textAlign(p.CENTER, p.CENTER);
                p.strokeWeight(0.1)
                p.textSize(20);
                p.text(transition.label, start.x, start.y - start.diameter - 15);
                p.pop();

              }
              // Transições para outros estrados
              else {
                p.line(start.x  , start.y, end.x, end.y);

                const angle = Math.atan2(end.y - start.y, end.x - start.x); // angle of line
                const radius = start.diameter / 2; // diameter of circle
                const offsetX = radius * Math.cos(angle);
                const offsetY = radius * Math.sin(angle);

                // Draw line from the edge of the start circle to the edge of the end circle
                
                p.push(); // Start a new drawing state
                p.strokeWeight(arrowWeight);
                p.line(start.x, start.y, end.x - offsetX, end.y - offsetY);

                // Draw an arrowhead at the edge of the end circle
                const length = 15; // length of arrowhead
                p.translate(end.x - offsetX, end.y - offsetY);
                p.rotate(angle);
                // Arrow line 1
                p.strokeWeight(arrowWeight);
                p.line(0, 0, -length, length);
                // Arrow line 2
                p.strokeWeight(arrowWeight);
                p.line(0, 0, -length, -length);
                p.pop(); // Restore original state

                const midX = (start.x + end.x - offsetX) / 2;
                const midY = (start.y + end.y - offsetY) / 2;
                const textOffsetY = -15; // Vertical offset for the text label

                p.push(); // Start another new drawing state for the tilted text
                p.translate(midX, midY);

                // Corrige textos de cabeça para baico
                // angle + Math.PI == angle + 180º
                const correctedAngle =
                  end.x < start.x ? angle + Math.PI : angle;

                p.strokeWeight(0.1);
                p.stroke(CanvasColors.DEFAULT_TRANSITION_TEXT)
                p.fill(CanvasColors.DEFAULT_TRANSITION_TEXT)
                p.rotate(correctedAngle);
                p.textAlign(p.CENTER, p.CENTER); // Center the text relative to the point
                p.textSize(20);
                p.text(transition.label, 20, textOffsetY);
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
          simulationStates[simulationIndex].color = CanvasColors.SIMULATION_STEP_STATE;
          simulationStates[simulationIndex].secondaryColor = CanvasColors.SIMULATION_STEP_STATE_SECONDARY;
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
              p.fill(255);
              p.text(state.id, state.x - 5, state.y + 5);

              // Marcador de "IsFinal"
              if (state.isFinal) {
                // Draw an inner circle with only its outline
                p.noFill(); // Disable filling
                p.stroke(state.secondaryColor);
                p.strokeWeight(4); // Set outline thickness
                const innerDiameter = state.diameter / 1.3; // Set the diameter of the inner circle
                p.ellipse(state.x, state.y, innerDiameter);
              }

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

        p.mouseWheel = (event: WheelEvent) => {
          cameraZoom -= (event.deltaY / 1000)
          if (cameraZoom < 0.2)
            cameraZoom = 0.2
          else if(cameraZoom > 3)
            cameraZoom = 3
          console.log(cameraZoom)  
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
          }
        };

        p.mousePressed = () => {
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

            /* Pointer */
            if (currentCanvasToolRef.current === CanvasTools.POINTER) {
              // Botão esquerdo: Cria transições / Cria estados
              currentCanvasAction = CanvasActions.NONE;
              // Left click
              if (p.mouseButton === p.LEFT) {
                //Esconde o menu de contexto
                // hideContextMenu();

                /* Shift apertado */
                // Cria estado
                if (p.keyIsDown(p.SHIFT)) {
                  if (!clickedState) {
                    // Check se o novo estado criado estaria overlaping com um estágo exstente
                    nearState =
                      allStates.find((state) => {
                        return (
                          p.dist(state.x, state.y, getMouseX(p), getMouseY(p)) <
                          state.diameter // Note que este não é "/2", isso é proposital
                        );
                      }) || null;

                    if (!nearState) {
                      // Gera ID do novo estado
                      var id: string;
                      if (!allStates.length) {
                        id = "q0";
                      } else {
                        let lastest_id = allStates[allStates.length - 1].id;
                        let id_number_string = lastest_id.slice(1);
                        let id_number = parseInt(id_number_string) + 1;
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
                }
                /* Shift NÃO apertado, clicou em um estado */
                // Move estado
                else if (clickedState) {
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

                  // Muda cursor para "grap" cursor
                  p.cursor("grab");
                }
                // Criando caixa de seleção
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

              // Botão direito: Move estados
              if (p.mouseButton === p.RIGHT) {
                if (clickedState) {
                  showContextMenu(p.mouseX, p.mouseY);
                } else {
                  hideContextMenu();
                }
              }

              /* Eraser */
            } else if (currentCanvasToolRef.current === CanvasTools.ERASER) {
              if (clickedState) {
                automataRef.current.deleteState(clickedState);
              }

              /* Mover */
            } else if (currentCanvasToolRef.current === CanvasTools.MOVE) {
              // Move a CAMERA, não o estado
              console.log("Não implementado ainda");

              /* Transition */
            } else if (currentCanvasToolRef.current === CanvasTools.TRANSITION) {
              currentCanvasAction = CanvasActions.CREATING_TRANSITION;
            }
          }
        };

        p.mouseReleased = () => {
          p.cursor("default");

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
              let label = prompt("Digite o s 1ímbolo de transição:");
              if (label !== null) {
                if (label === "") label = "λ";
                automataRef.current.addTransition(clickedState, endState, label);
              }
            }
          }
          currentCanvasAction = CanvasActions.NONE;
          clickedState = null;

          // // OLD Input validation
          // const { isValid, errorMessage } = automataRef.current.validate(inputValue);
          // setIsValid(isValid);
          // setErrorMessage(errorMessage);

          // Create input array copy
          let aumataInputResultsAux = [...aumataInputResults]
          for (let i=0; i<aumataInputResultsAux.length; i++){
            const { result, message } = automataRef.current.validate(aumataInputResultsAux[i].input);
            
            // Update automata results
            aumataInputResultsAux[i].result = result
            aumataInputResultsAux[i].message = message
          }
            // Simulate automata again
          setAumataInputResults(aumataInputResultsAux)

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
            if (selectedStates.length === 0) selectedStates = [clickedState!];

            selectedStates.forEach((state) => {
              automataRef.current.deleteState(state);
            });
            selectedStates = [];

            // Create input array copy
            let aumataInputResultsAux = [...aumataInputResults]
            for (let i=0; i<aumataInputResultsAux.length; i++){
              const { result, message } = automataRef.current.validate(aumataInputResultsAux[i].input);
              
              // Update automata results
              aumataInputResultsAux[i].result = result
              aumataInputResultsAux[i].message = message
            }
              // Simulate automata again
            setAumataInputResults(aumataInputResultsAux)
          }

          /* Seleciona tool */
          // if (!inputFocused) {
          if (p.key === "1") {
            currentCanvasToolRef.current = CanvasTools.POINTER;
            setSelectedToolState(CanvasTools.POINTER) 
          }
          if (p.key === "2") {
            currentCanvasToolRef.current = CanvasTools.TRANSITION;
            setSelectedToolState(CanvasTools.TRANSITION)
          }
          if (p.key === "3") {
            currentCanvasToolRef.current = CanvasTools.ERASER;
            setSelectedToolState(CanvasTools.ERASER)
          }

          /* Debug */
          if (p.key === "!") {
            automataRef.current.printInfo();
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

    simulationStates = []
    simulationIndex = 0;
    var estadoAtual: State = automataRef.current.getInitialState()!;
    simulationStates.push(estadoAtual)
    for(let i = 0; i < input.length; i++) {
      let result = automataRef.current.testTransition(input, estadoAtual, i);
      simulationStates.push(result.nextState!);
      if(result.isValidTransition){ 
        console.log('Transição inválida');
        break;  
      }
    }
    if(automataRef.current.getFinalStates().some(x => x === simulationStates[simulationStates.length - 1])){
      console.log("ACEITO"); 
    } else{
      console.log("REJEITADO");
    }
    console.log(simulationStates); 
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
      prevInitialState && // Estado inicial anterios não é null
      state.isInitial && // Estado inicial atual foi toggle apara TRUE, não FALSE
      state.id !== prevInitialState.id // O estad inicial anterios não é o mesmo estado que o atual
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

      {/* Step by Step simulation controlls */}
      <div id="simulation-controller-div">
        <div className='simulation-controller-buttons-div'>
          <button
              id="begining"
              className={
                "canvas-button simulation-controller-button rotateicon180"
              }
              title="Begining"
            >
              <FastforwardIcon/>
          </button>
          <button
              id="next"
              className={
                "canvas-button simulation-controller-button"
              }
              title="Next"
              onClick={() => {
                simulationIndex--;
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
                simulationIndex = 0;
              }}
            >
              <PlayIcon />
          </button>
          <button
              id="next"
              className={
                "canvas-button simulation-controller-button"
              }
              title="Next"
              onClick={() => {
                simulationIndex++;
              }}
            >
              <NextIcon />
          </button>
          <button
              id="fastforward"
              className={
                "canvas-button simulation-controller-button"
              }
              title="Fastforward"
            >
              <FastforwardIcon/>
          </button>
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
  const { aumataInputResults, setAumataInputResults } = useAutomataInputContext();

  return(
    <div id='automata-input-drawer'>
      {aumataInputResults.map((results, index) => (
        <AutomataInput
          index = {index}
          automataRef = {automataRef}
          calculateSteps = {calculateSteps}
        />
      ))}
    </div>
    )
}

/*

          AUTOMATA INPUT

*/ 
interface AutomataInputProps {
  index: number;
  automataRef: React.MutableRefObject<Automata>;
  calculateSteps: any;
}
const AutomataInput: React.FC<AutomataInputProps> = (
  {
    index,
    automataRef,
    calculateSteps
  }
) => {
  const { aumataInputResults, setAumataInputResults } = useAutomataInputContext();

  let simulationResult = aumataInputResults[index].result
  let errorMessage = aumataInputResults[index].message

  return (
    <div id="automata-input-div">
      <input
        placeholder="Input automato" 
        className="automata-input"
        // onFocus={() => {setInputFocused(true);}}
        // onBlur={() => {
        //   setInputFocused(false);
        // }} 
        onChange={(event) => {
          let aumataInputResultsAux = [...aumataInputResults]
          let newInput = event.target.value

          // Simulate automata again
          const { result, message } = automataRef.current.validate(newInput);

          // Update automata results
          aumataInputResultsAux[index].input = newInput
          aumataInputResultsAux[index].result = result
          aumataInputResultsAux[index].message = message
          setAumataInputResults(aumataInputResultsAux)
        }}
      ></input>
      <button
        id="validation"
        className={
          "canvas-button input-button " + (
            (simulationResult == AutomataInputResultsEnum.ACCEPTED) ? 
              'accepted' : 
            (simulationResult == AutomataInputResultsEnum.WARNING) ? 
              'warning' :
              'rejected'
          )
        }
        onClick={() => {
          calculateSteps();
        }}
        title="Simular passo-a-passo"
      >
        {(
          (simulationResult == AutomataInputResultsEnum.ACCEPTED) ? 
            <CheckIcon/> : 
          (simulationResult == AutomataInputResultsEnum.WARNING) ? 
            <WarningIcon/> :
            <ErrorIcon/>
        )}
      </button>
      {errorMessage && (
        <div placeholder="Input automato" className="automata-input-error">
          <span>{errorMessage}</span>
        </div>
      )}
    </div>  
  )
}


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

export default Canvas;

