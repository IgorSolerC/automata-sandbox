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

// Constants
import { CanvasColors } from "../Constants/CanvasConstants";

// Contexts
import { ToolboxProvider, useToolboxContext } from "../contexts/ToolboxContext";

// let canvasObject: p5 | null = null; // Variável para armazenar o sketch
let automata: Automata = new Automata();

const Canvas: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const p5Instance = useRef<p5 | null>(null);
  const automataRef = useRef(automata);
  let contextMenu: p5.Element;
  // let slider: p5.Element;
  
  let contextMenuIsOpen: boolean = false;
 
  // Validação de inputs
  const [isValid, setIsValid] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(
    "Nenhum estado inicial foi definido!"
  );

  // Tool selecionada
  const { selectedToolState, setSelectedToolState } = useToolboxContext();
  
  // Arrays de States
  let clickedState: State | null;
  let selectedStates: State[] = [];
  let nearState: State | null;
  let highlightedState: State | null;

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

  useEffect(() => {
    if(!automataRef.current){
      automataRef.current = new Automata();
    }
    console.log('Canvas Rerender Triggered!')
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
            const { isValid, errorMessage } = automataRef.current.validate(inputValue);
            setIsValid(isValid);
            setErrorMessage(errorMessage);
          });

          let option3 = p.createDiv("Final");
          option3.mouseClicked(() => {
            automataRef.current.toggleFinal(selectedStates);
            hideContextMenu();
            const { isValid, errorMessage } = automataRef.current.validate(inputValue);
            setIsValid(isValid);
            setErrorMessage(errorMessage);
          });

          contextMenu.child(option2);
          contextMenu.child(option3);
        };

        p.draw = () => {
          p.background(CanvasColors.BACKGROUND);

          // Desenha transições
          automataRef.current.getTransitions().forEach((transition) => {
            const start = automataRef.current.findState(transition.from.id);
            const end = automataRef.current.findState(transition.to.id);
            const arrow_weight = 5; 
            if (start && end) {
              p.stroke(CanvasColors.DEFAULT_TRANSITION);
              if (start.id === end.id) {
                const loopRadius = start.diameter / 2;
                const angle = Math.PI / 6; 
                
                const loopStartX = start.x + loopRadius * Math.cos(angle);
                const loopStartY = start.y + loopRadius * Math.sin(angle);
          
                p.noFill();
                p.stroke(CanvasColors.DEFAULT_TRANSITION);
                p.strokeWeight(arrow_weight);
                p.ellipse(start.x, start.y - start.diameter / 2, loopRadius * 2, loopRadius * 2);
                
                p.push();
                p.translate(loopStartX, loopStartY - loopRadius);

                p.fill(CanvasColors.DEFAULT_TRANSITION);
                p.triangle(1,-2,-4,-19,14,-12);
                p.pop();

                p.fill("black")
                p.push();
                p.textAlign(p.CENTER, p.CENTER);
                p.strokeWeight(1)
                p.stroke(1)
                p.textSize(20);
                p.text(transition.label, start.x, start.y - start.diameter - 15);
                p.pop();

              } else {
                p.line(start.x  , start.y, end.x, end.y);

                const angle = Math.atan2(end.y - start.y, end.x - start.x); // angle of line
                const radius = start.diameter / 2; // diameter of circle
                const offsetX = radius * Math.cos(angle);
                const offsetY = radius * Math.sin(angle);

                // Draw line from the edge of the start circle to the edge of the end circle
                
                p.strokeWeight(arrow_weight);
                p.line(start.x, start.y, end.x - offsetX, end.y - offsetY);

                // Draw an arrowhead at the edge of the end circle
                const length = 15; // length of arrowhead
                p.push(); // Start a new drawing state
                p.translate(end.x - offsetX, end.y - offsetY);
                p.rotate(angle);
                // Arrow line 1
                p.strokeWeight(arrow_weight);
                p.line(0, 0, -length, length);
                // Arrow line 2
                p.strokeWeight(arrow_weight);
                p.line(0, 0, -length, -length);
                p.pop(); // Restore original state
                p.stroke(1);

                const midX = (start.x + end.x - offsetX) / 2;
                const midY = (start.y + end.y - offsetY) / 2;
                const textOffsetY = -15; // Vertical offset for the text label

                p.push(); // Start another new drawing state for the tilted text
                p.translate(midX, midY);

                // Corrige textos de cabeça para baico
                // angle + Math.PI == angle + 180º
                const correctedAngle =
                  end.x < start.x ? angle + Math.PI : angle;

                p.strokeWeight(1);
                p.rotate(correctedAngle);
                p.textAlign(p.CENTER, p.CENTER); // Center the text relative to the point
                p.textSize(20);
                p.text(transition.label, 0, textOffsetY);
                p.pop(); // Restore original state
              }
            }
          });

          // ----Desenha estados
          // .slice() cria uma copia shallow
          // .reverse() desenhar mostrando o primeiro como acima, visto que é o primeiro a ser selecionado quando clica-se em estados stackados
          automataRef.current
            .getStates()
            .slice()
            .reverse()
            .forEach((state: State, index) => {
              p.noStroke();

              const allStates = automataRef.current.getStates();
              allStates.forEach(
                (state) => (state.color = CanvasColors.DEFAULT_STATE)
              );
              selectedStates.forEach(
                (state) => (state.color = CanvasColors.CLICKED_STATE)
              );

              // Marcador de "IsInitial"
              if (state.isInitial) {
                p.push();
                const triangleSize = 0.6;
                let triangleOffsetX: number =
                  state.diameter / 2 + (state.diameter / 2) * triangleSize;
                let triangleOffsetY: number =
                  (state.diameter / 2) * triangleSize;
                p.fill(CanvasColors.DEFAULT_INITIAL_MARKER);
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
              p.fill(state.color);
              p.ellipse(state.x, state.y, state.diameter);
              p.fill(255);
              p.text(state.id, state.x - 5, state.y + 5);

              // Marcador de "IsFinal"
              if (state.isFinal) {
                // Draw an inner circle with only its outline
                p.noFill(); // Disable filling
                p.stroke(CanvasColors.DEFAULT_FINAL_MARKER); // Set outline color to white (or any color you prefer)
                p.strokeWeight(2); // Set outline thickness
                const innerDiameter = state.diameter / 1.5; // Set the diameter of the inner circle
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

        p.mouseDragged = () => {
          const allStates = automataRef.current.getStates();

          if (currentCanvasAction === CanvasActions.MOVING_STATE) {
            // selectedStates.forEach((auxState: automataRef.current.State) => { // <--- deu errado o type
            selectedStates.forEach((state: State) => {
              state.x = p.mouseX + selectedStateMouseOffset[state.id]["x"];
              state.y = p.mouseY + selectedStateMouseOffset[state.id]["y"];
            });
          } else if (currentCanvasAction === CanvasActions.CREATING_SELECTION) {
            // --- Update valor da seleção ---
            // Isso é necessario para evitar tamanhos negativos ao criar
            // seleções onde o ponto de inicio é maior que o de fim
            selectionDistanceX = p.mouseX - selectionStarterX;
            selectionDistanceY = p.mouseY - selectionStarterY;
            selectionX = selectionStarterX;
            selectionY = selectionStarterY;
            if (selectionDistanceX < 0) {
              selectionX = p.mouseX;
              selectionDistanceX = -1 * selectionDistanceX;
            }
            if (selectionDistanceY < 0) {
              selectionY = p.mouseY;
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
            console.log("ContextMenu is open, nothing happend");
          } else {
            const allStates = automataRef.current.getStates();
            // Encontra estado que foi clicado
            clickedState =
              allStates.find((state) => {
                return (
                  p.dist(state.x, state.y, p.mouseX, p.mouseY) <
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
                          p.dist(state.x, state.y, p.mouseX, p.mouseY) <
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
                        p.mouseX,
                        p.mouseY,
                        CanvasColors.DEFAULT_STATE
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
                      state.x - p.mouseX;
                    selectedStateMouseOffset[state.id]["y"] =
                      state.y - p.mouseY;
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
                  selectionStarterX = p.mouseX;
                  selectionStarterY = p.mouseY;
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
                p.dist(state.x, state.y, p.mouseX, p.mouseY) <
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

          const { isValid, errorMessage } = automataRef.current.validate(inputValue);
          setIsValid(isValid);
          setErrorMessage(errorMessage);
        };

        p.keyPressed = () => {
          // Está bugado!
          // Não reconhece numero, a não ser q alt ou cntrl estejam apertados

          const allStates = automataRef.current.getStates();

          clickedState =
            allStates.find((state) => {
              return (
                p.dist(state.x, state.y, p.mouseX, p.mouseY) <
                state.diameter / 2
              );
            }) || null;

          // console.log(p.keyCode, 'test')
          // console.log(p.key, 'test')

          /* Deleta estado(s) */
          if (p.key === "Delete") {
            if (selectedStates.length === 0) selectedStates = [clickedState!];

            selectedStates.forEach((state) => {
              automataRef.current.deleteState(state);
            });
            selectedStates = [];
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
    let input = "010001";
    let listaEstados = []
    var estadoAtual = automata.getInitialState();
    for(let i = 0; i < input.length; i++) {
      let teste = automata.testTransition(input, estadoAtual!, i);
      listaEstados.push((teste.isValidTransition, teste.next_state));
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
        <AutomataInput
          setInputValue = {setInputValue}
          isValid = {isValid}
          setIsValid = {setIsValid}
          setErrorMessage = {setErrorMessage}
          errorMessage = {errorMessage}
          automataRef = {automataRef}
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
            >
              <PrevIcon />
          </button>
          <button
              id="play"
              className={
                "canvas-button simulation-controller-button"
              }
              title="Play"
            >
              <PlayIcon />
          </button>
          <button
              id="next"
              className={
                "canvas-button simulation-controller-button"
              }
              title="Next"
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


/*

          AUTOMATA INPUT

*/ 
interface AutomataInputProps {
  setInputValue: any;
  setIsValid: any;
  isValid: boolean;
  setErrorMessage: any;
  errorMessage: string | null;
  automataRef: React.MutableRefObject<Automata>;
}
const AutomataInput: React.FC<AutomataInputProps> = (
  {
    setInputValue,
    isValid, setIsValid,
    errorMessage, setErrorMessage,
    automataRef
  }
) => {

  return (
    <div id="automata-input-div">
      <input
        placeholder="Input automato"
        className="automata-input"
        // onFocus={() => {setInputFocused(true);}}
        // onBlur={() => {
        //   setInputFocused(false);
        //   console.log("teste");
        // }}
        onChange={(event) => {
          setInputValue(event.target.value);
          const { isValid, errorMessage } = automataRef.current.validate(
            event.target.value
          );
          setIsValid(isValid);
          setErrorMessage(errorMessage);
        }}
      ></input>
      <button
        id="validation"
        className={
          "canvas-button input-button " + (isValid ? 'accepted' : (errorMessage ? 'warning' : 'rejected'))
        }
        onClick={() => {console.log("validation!")}}
        title="Validation"
      >
        {isValid ? (
          <CheckIcon />
        ) : errorMessage ? (
          <WarningIcon />
        ) : (
          <ErrorIcon />
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
          console.log("undo!");
        }}
        title="Undo"
      >
        <UndoIcon />
      </button>
      <button
        id="redo"
        className="canvas-button navbar-button redo"
        onClick={() => {
          console.log("redo!");
        }}
        title="Redo"
      >
        <RedoIcon />
      </button>
    </div>
  );
};

export default Canvas;

