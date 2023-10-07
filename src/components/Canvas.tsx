import './Canvas.css';

// Google Material Icons
import CursorIcon from '../symbols/cursor_icon';
import TrashIcon from '../symbols/trash_icon';
import UndoIcon from '../symbols/undo_icon';
import RedoIcon from '../symbols/redo_icon';
import MoveIcon from '../symbols/move_icon';

// Canvas.tsx
import React, { useRef, useEffect, useState, } from "react";
import p5 from "p5";
import * as AutomataModule from "../modules/AutomataModule";
import { forEachChild } from 'typescript';

let canvasObject: p5 | null = null; // Variável para armazenar o sketch

const Canvas: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  let clickedState: any;
  let nearState: any;
  let selectedStates: any[] = [];
  let selectedStateMouseOffset: any = {}
  let currentState: any = null

  // Selection box variables
  let selectionStarterY: number = 0;
  let selectionStarterX: number = 0;
  let selectionX: number = 0
  let selectionY: number = 0
  let selectionDistanceX: number = 0
  let selectionDistanceY: number = 0

  const DEFAULT_BACKGROUND_COLOR: string = "#eee";
  const DEFAULT_STATE_COLOR: string = "#7b2cbf";
  const DEFAULT_CLICKED_COLOR: string = "#fdbeff";
  const DEFAULT_TRANSITION_COLOR: string = "#ccc"

  // const DEFAULT_SELECTIONBOX_COLOR: string = "#55ccff44"
  // const DEFAULT_SELECTIONBOX_BORDER_COLOR: string = "#55ccffcc"
  const DEFAULT_SELECTIONBOX_COLOR: string = "#DDDDDD55"
  const DEFAULT_SELECTIONBOX_BORDER_COLOR: string = "#DDDDDDAA"
  // const DEFAULT_SELECTIONBOX_COLOR: string = "#0000"
  // const DEFAULT_SELECTIONBOX_BORDER_COLOR: string = "#000F"

  const STATES: any = {
    none: 0,
    moving_state: 1,
    creating_transition: 2,
    creating_selection: 3
  }

  const OPTIONS: any = {
    pointer: 1,
    eraser: 2,
    move: 3
  }
  const [selectedOption, setSelectedOption] = useState(OPTIONS.pointer)

  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.addEventListener("contextmenu", (e) => {
        e.preventDefault();
      });

      if (canvasObject) {
        canvasObject.remove()
      }

      canvasObject = new p5((p: p5) => {
        p.setup = () => {
          p.createCanvas(window.innerWidth, window.innerHeight);
          p.frameRate(144);
        };

        p.draw = () => {
          p.background(DEFAULT_BACKGROUND_COLOR);

          // Desenha transições
          AutomataModule.getTransitions().forEach((transition) => {
            const start = AutomataModule.findState(transition.from.id);
            const end = AutomataModule.findState(transition.to.id);
            if (start && end) {
              p.stroke(DEFAULT_TRANSITION_COLOR);
              p.line(start.x, start.y, end.x, end.y);

              const angle = Math.atan2(end.y - start.y, end.x - start.x); // angle of line
              const radius = start.diameter/2; // diameter of circle
              const offsetX = radius * Math.cos(angle);
              const offsetY = radius * Math.sin(angle);

              // Draw line from the edge of the start circle to the edge of the end circle
              const arrow_weight = 5; // length of arrowhead
              p.strokeWeight(arrow_weight)
              p.line(start.x, start.y, end.x - offsetX, end.y - offsetY)

              // Draw an arrowhead at the edge of the end circle
              const length = 15; // length of arrowhead
              p.push(); // Start a new drawing state
              p.translate(end.x - offsetX, end.y - offsetY);
              p.rotate(angle);
              // Arrow line 1
              p.strokeWeight(arrow_weight)
              p.line(0, 0, -length, length)
              // Arrow line 2
              p.strokeWeight(arrow_weight)
              p.line(0, 0, -length, -length)
              p.pop(); // Restore original state
              p.stroke(1);

              const midX = (start.x + end.x - offsetX) / 2;
              const midY = (start.y + end.y - offsetY) / 2;
              const textOffsetY = -15; // Vertical offset for the text label

              p.push(); // Start another new drawing state for the tilted text
              p.translate(midX, midY);

              // Corrige textos de cabeça para baico
              // angle + Math.PI == angle + 180º
              const correctedAngle = (end.x < start.x) ? angle + Math.PI : angle;

              p.strokeWeight(1)
              p.rotate(correctedAngle);
              p.textAlign(p.CENTER, p.CENTER); // Center the text relative to the point
              p.textSize(20)
              let text: string = transition.label
              if (text === '')
                text = 'λ'
              p.text(text, 0, textOffsetY);
              p.pop(); // Restore original state
            }
          });

          // ----Desenha estados
          // .slice() cria uma copia shallow
          // .reverse() desenhar mostrando o primeiro como acima, visto que é o primeiro a ser selecionado quando clica-se em estados stackados
          AutomataModule.getStates().slice().reverse().forEach((state, index) => {
            p.noStroke(); 
            p.fill(state.color); 
            p.ellipse(state.x, state.y, state.diameter); 
            p.fill(255);
            p.text(state.id, state.x - 5, state.y + 5);
            p.fill(0);
            p.stroke(0);
            p.strokeWeight(2);
          });

          // Desenha caixa de seleção
          if (currentState === STATES.creating_selection){
            p.push(); // Start a new drawing state
            p.fill(DEFAULT_SELECTIONBOX_COLOR);
            p.stroke(DEFAULT_SELECTIONBOX_BORDER_COLOR);
            p.rect(selectionX, selectionY, selectionDistanceX, selectionDistanceY);
            p.pop();
          }

        };
        
        p.mouseDragged = () => {
          const allStates = AutomataModule.getStates();

          if(currentState === STATES.moving_state){
              // selectedStates.forEach((auxState: AutomataModule.State) => { // <--- deu errado o type
              selectedStates.forEach((state: any) => {
                state.x = p.mouseX + selectedStateMouseOffset[state.id]['x']
                state.y = p.mouseY + selectedStateMouseOffset[state.id]['y']
              })
          }
          else if (currentState === STATES.creating_selection){
            // --- Update valor da seleção ---
            // Isso é necessario para evitar tamanhos negativos ao criar
            // seleções onde o ponto de inicio é maior que o de fim
            selectionDistanceX = p.mouseX - selectionStarterX
            selectionDistanceY = p.mouseY - selectionStarterY
            selectionX = selectionStarterX
            selectionY = selectionStarterY
            if (selectionDistanceX < 0){
              selectionX = p.mouseX
              selectionDistanceX = -1 * selectionDistanceX
            }
            if (selectionDistanceY < 0){
              selectionY = p.mouseY
              selectionDistanceY = -1 * selectionDistanceY
            }

            selectedStates = allStates.filter((state) => {
              return (
                (selectionX <= state.x) && (state.x <= selectionX + selectionDistanceX) &&
                (selectionY <= state.y) && (state.y <= selectionY + selectionDistanceY)
              );
            })

            // Default color
            allStates.forEach((state) => {
              state.color = DEFAULT_STATE_COLOR
            })
            selectedStates.forEach((state) => {
              state.color = DEFAULT_CLICKED_COLOR
            })
          }
        }

        // Left click
        p.mousePressed = () => {
          const allStates = AutomataModule.getStates();

          // Previous clicked state
          // if (clickedState)
          //   clickedState.color = DEFAULT_STATE_COLOR;

          // Encontra estado que foi clicado
          clickedState =
            allStates.find((state) => {
              return p.dist(state.x, state.y, p.mouseX, p.mouseY) < state.diameter/2;
            }) || null;
            
          // New clicked state
          if (clickedState){
            let clickedStateIsSelected = selectedStates.find(state => state.id === clickedState.id)
            if(!clickedStateIsSelected){
              // Previous clicked state
              selectedStates.forEach((state: any) => {
                // Reseta cor do estado anterior clicado
                state.color = DEFAULT_STATE_COLOR;
              })
              selectedStates = [clickedState]
            }
            // Highlight cor do estado clicado atual
            clickedState.color = DEFAULT_CLICKED_COLOR;
          }
          else {
            // Previous clicked state
            selectedStates.forEach((state: any) => {
              // Reseta cor do estado anterior clicado
              state.color = DEFAULT_STATE_COLOR;
            })
            selectedStates = []
          }

          if (selectedOption === OPTIONS.pointer){
            // Botão esquerdo: Cria transições / Cria estados
            currentState = STATES.none;
            if (p.mouseButton === p.LEFT) {
              // Criando estado
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

                  if (!nearState){
                    // Gera ID do novo estado
                    var id: string;
                    if (!allStates.length){
                      id = 'q0'
                    }
                    else {
                      let lastest_id = allStates[allStates.length-1].id
                      let id_number_string = lastest_id.slice(1);
                      let id_number = parseInt(id_number_string) + 1
                      id = `q${id_number}`;
                    }
                    // Cria novo estado
                    AutomataModule.addState(
                      id,
                      p.mouseX,
                      p.mouseY,
                      DEFAULT_STATE_COLOR
                    );
                  }
                }
              }
              // Criando transição
              else if(clickedState) {
                currentState = STATES.creating_transition;
              }
              // Criando caixa de seleção
              else {
                // Set state
                currentState = STATES.creating_selection;
                // Set dados da selecao
                selectionStarterX = p.mouseX
                selectionStarterY = p.mouseY
                selectionX = selectionStarterX
                selectionY = selectionStarterY
                selectionDistanceX = 0
                selectionDistanceY = 0
              }
            }

            // Botão direito: Move estados
            if (p.mouseButton === p.RIGHT) {
              if (clickedState) {
                // Set offset, usado para não centralizar com o mouse os estados movidos
                selectedStateMouseOffset = {}
                selectedStates.forEach(state => {
                  selectedStateMouseOffset[state.id] = {}
                  selectedStateMouseOffset[state.id]['x'] = state.x - p.mouseX
                  selectedStateMouseOffset[state.id]['y'] = state.y - p.mouseY
                })
                
                // Set estado atual como "Movendo estado"
                currentState = STATES.moving_state

                // Muda cursor para "grap" cursor
                p.cursor("grab")
              }
            }
          }
          else if(selectedOption === OPTIONS.eraser){
            if (clickedState){
              AutomataModule.deleteState(clickedState)
            }
          }
          else if (selectedOption === OPTIONS.move){
            if (clickedState) {
              // Set offset, usado para não centralizar com o mouse os estados movidos
              selectedStateMouseOffset = {}
              selectedStates.forEach(state => {
                selectedStateMouseOffset[state.id] = {}
                selectedStateMouseOffset[state.id]['x'] = state.x - p.mouseX
                selectedStateMouseOffset[state.id]['y'] = state.y - p.mouseY
              })
              
              // Set estado atual como "Movendo estado"
              currentState = STATES.moving_state

              // Muda cursor para "grap" cursor
              p.cursor("grab")
            }
          }
          
        };

        p.mouseReleased = () => {
          p.cursor("default");

          if (clickedState) {
            const endState = AutomataModule.getStates().find((state) => {
              return p.dist(state.x, state.y, p.mouseX, p.mouseY) < state.diameter/2;
            });
            if (endState && currentState === STATES.creating_transition) {
              const label = prompt("Digite o símbolo de transição:");
              if (label !== null) {
                AutomataModule.addTransition(
                  clickedState,
                  endState,
                  label
                );
              }
            }
            let clickedStateIsSelected = selectedStates.find(state => state.id === clickedState.id)
            if (!clickedStateIsSelected)
              clickedState.color = DEFAULT_STATE_COLOR;
          }
          currentState = STATES.none;
          clickedState = null;
        };
        
        p.keyPressed = () => {
          const allStates = AutomataModule.getStates()
          clickedState =
          allStates.find((state) => {
              return p.dist(state.x, state.y, p.mouseX, p.mouseY) < state.diameter/2;
            }) || null;
            if (p.key === 'Delete') {
              if(selectedStates.length === 0)
                selectedStates = [clickedState]

              selectedStates.forEach(state => {
                AutomataModule.deleteState(state)
              })
              selectedStates = []
          }
        };
        
      }, canvasRef.current);
    } 
  }, [selectedOption]);

  return (
    <div>
      <div id='navbar-div'>
        <div id='toolbox'>
        	<button
            id='pointer'
            className={'navbar-button ' + (selectedOption === OPTIONS.pointer ? 'selected' : '')}
            onClick={() => (setSelectedOption(OPTIONS.pointer))}
            title='Pointer'
          >
            <CursorIcon/>
          </button>
          <button
            id='eraser'
            className={'navbar-button ' + (selectedOption === OPTIONS.eraser ? 'selected' : '')}
            onClick={() => (setSelectedOption(OPTIONS.eraser))}
            title='Eraser'
          >
            <TrashIcon/>
          </button>
          <button
            id='move'
            className={'navbar-button ' + (selectedOption === OPTIONS.move ? 'selected' : '')}
            onClick={() => (setSelectedOption(OPTIONS.move))}
            title='Move'
          >
            <MoveIcon/>
          </button>
          <button
            id='undo'
            className='navbar-button'
            onClick={() => (console.log('undo!'))}
            title='Undo'
          >
            <UndoIcon/>
          </button>
          <button
            id='redo'
            className='navbar-button'
            onClick={() => (console.log('redo!'))}
            title='Redo'
          >
            <RedoIcon/>
          </button>
        </div>
        <div id='automata-input-div'>
          <input
					placeholder='Input automato'
            className='automata-input'
          >
          </input>
        </div>
      </div>
      <div ref={canvasRef}></div>
    </div>
  )
};

export default Canvas;
