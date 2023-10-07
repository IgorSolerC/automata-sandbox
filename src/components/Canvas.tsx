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
import { Automata } from '../models/Automata';
import { State } from '../models/State';
import { CanvasActions } from '../enums/CanvasActionsEnum';
import { CanvasTools } from '../enums/CanvasToolsEnum';
import { CanvasColors } from '../Constants/CanvasConstants';

let canvasObject: p5 | null = null; // Variável para armazenar o sketch
let automata : Automata = new Automata();

const Canvas: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement | null>(null);

  // Arrays de States
  let clickedState: State | null;
  let selectedStates: State[] = [];
  let nearState: State | null;

  // Enums
  let currentCanvasAction: CanvasActions = CanvasActions.NONE;
  const [currentCanvasTool, setcurrentCanvasTool] = useState(CanvasTools.POINTER)
  
  let selectedStateMouseOffset: any; // {'q1': {'x': 10, 'y': -10}, 'q2': {'x': 10, 'y': -10}}

  // Selection box variables
  let selectionStarterY: number = 0;
  let selectionStarterX: number = 0;
  let selectionX: number = 0
  let selectionY: number = 0
  let selectionDistanceX: number = 0
  let selectionDistanceY: number = 0

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
          p.background(CanvasColors.BACKGROUND);

          // Desenha transições
          automata.getTransitions().forEach((transition) => {
            const start = automata.findState(transition.from.id);
            const end = automata.findState(transition.to.id);
            if (start && end) {
              p.stroke(CanvasColors.DEFAULT_TRANSITION);
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
          automata.getStates().slice().reverse().forEach((state, index) => {
            p.noStroke(); 
            
            const allNodes = automata.getStates()
            allNodes.forEach(state => state.color = CanvasColors.DEFAULT_STATE)
            selectedStates.forEach(state => state.color = CanvasColors.CLICKED_STATE)

            p.fill(state.color); 
            p.ellipse(state.x, state.y, state.diameter); 
            p.fill(255);
            p.text(state.id, state.x - 5, state.y + 5);
            p.fill(0);
            p.stroke(0);
            p.strokeWeight(2);
          });

          // Desenha caixa de seleção
          if (currentCanvasAction === CanvasActions.CREATING_SELECTION){
            p.push(); // Start a new drawing state
            p.fill(CanvasColors.SELECTION);
            p.stroke(CanvasColors.SELECTION_BORDER);
            p.rect(selectionX, selectionY, selectionDistanceX, selectionDistanceY);
            p.pop();
          }
        };
        
        p.mouseDragged = () => {
          const allStates = automata.getStates();

          if(currentCanvasAction === CanvasActions.MOVING_STATE){
              // selectedStates.forEach((auxState: automata.State) => { // <--- deu errado o type
              selectedStates.forEach((state: State) => {
                state.x = p.mouseX + selectedStateMouseOffset[state.id]['x']
                state.y = p.mouseY + selectedStateMouseOffset[state.id]['y']
              })
          }
          else if (currentCanvasAction === CanvasActions.CREATING_SELECTION){
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
          }
        }

        // Left click
        p.mousePressed = () => {
          const allStates = automata.getStates();

          // Encontra estado que foi clicado
          clickedState =
            allStates.find((state) => {
              return p.dist(state.x, state.y, p.mouseX, p.mouseY) < state.diameter/2;
            }) || null;
            
          // New clicked state
          if (clickedState){
            let clickedStateIsSelected = selectedStates.find(state => state.id === clickedState!.id)
            if(!clickedStateIsSelected){
              selectedStates = [clickedState]
            }
          }
          else {
            selectedStates = []
          }

          if (currentCanvasTool === CanvasTools.POINTER){
            // Botão esquerdo: Cria transições / Cria estados
            currentCanvasAction = CanvasActions.NONE;
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
                    automata.addState(
                      id,
                      p.mouseX,
                      p.mouseY,
                      CanvasColors.DEFAULT_STATE
                    );
                  }
                }
              }
              // Criando transição
              else if(clickedState) {
                currentCanvasAction = CanvasActions.CREATING_TRANSITION;
              }
              // Criando caixa de seleção
              else {
                // Set state
                currentCanvasAction = CanvasActions.CREATING_SELECTION;
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
                currentCanvasAction = CanvasActions.MOVING_STATE

                // Muda cursor para "grap" cursor
                p.cursor("grab")
              }
            }
          }
          else if(currentCanvasTool === CanvasTools.ERASER){
            if (clickedState){
              automata.deleteState(clickedState)
            }
          }
          else if (currentCanvasTool === CanvasTools.MOVE){
            if (clickedState) {
              // Set offset, usado para não centralizar com o mouse os estados movidos
              selectedStateMouseOffset = {}
              selectedStates.forEach(state => {
                selectedStateMouseOffset[state.id] = {}
                selectedStateMouseOffset[state.id]['x'] = state.x - p.mouseX
                selectedStateMouseOffset[state.id]['y'] = state.y - p.mouseY
              })
              
              // Set estado atual como "Movendo estado"
              currentCanvasAction = CanvasActions.MOVING_STATE

              // Muda cursor para "grap" cursor
              p.cursor("grab")
            }
          }
        };

        p.mouseReleased = () => {
          p.cursor("default");

          if (clickedState) {
            const endState = automata.getStates().find((state) => {
              return p.dist(state.x, state.y, p.mouseX, p.mouseY) < state.diameter/2;
            });
            if (endState && currentCanvasAction === CanvasActions.CREATING_TRANSITION) {
              const label = prompt("Digite o símbolo de transição:");
              if (label !== null) {
                automata.addTransition(
                  clickedState,
                  endState,
                  label
                );
              }
            }
          }
          currentCanvasAction = CanvasActions.NONE;
          clickedState = null;
        };
        
        p.keyPressed = () => {
          const allStates = automata.getStates()
          clickedState =
          allStates.find((state) => {
              return p.dist(state.x, state.y, p.mouseX, p.mouseY) < state.diameter/2;
            }) || null;
            if (p.key === 'Delete') {
              if(selectedStates.length === 0)
                selectedStates = [clickedState!]

              selectedStates.forEach(state => {
                automata.deleteState(state)
              })
              selectedStates = []
          }
        };
        
      }, canvasRef.current);
    } 
  }, [currentCanvasTool]);

  return (
    <div>
      <div id='navbar-div'>
        <div id='toolbox'>
        	<button
            id='pointer'
            className={'canvas-button navbar-button ' + (currentCanvasTool === CanvasTools.POINTER ? 'selected' : '')}
            onClick={() => (setcurrentCanvasTool(CanvasTools.POINTER))}
            title='Pointer'
          >
            <CursorIcon/>
          </button>
          <button
            id='eraser'
            className={'canvas-button navbar-button ' + (currentCanvasTool === CanvasTools.ERASER ? 'selected' : '')}
            onClick={() => (setcurrentCanvasTool(CanvasTools.ERASER))}
            title='Eraser'
          >
            <TrashIcon/>
          </button>
          <button
            id='move'
            className={'canvas-button navbar-button ' + (currentCanvasTool === CanvasTools.MOVE ? 'selected' : '')}
            onClick={() => (setcurrentCanvasTool(CanvasTools.MOVE))}
            title='Move'
          >
            <MoveIcon/>
          </button>
          <button
            id='undo'
            className='canvas-button navbar-button'
            onClick={() => (console.log('undo!'))}
            title='Undo'
          >
            <UndoIcon/>
          </button>
          <button
            id='redo'
            className='canvas-button navbar-button'
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
          <button 
            id='redo'
            className={'canvas-button navbar-button ' + (true ? 'accepted' : '')}
            onClick={() => (console.log('redo!'))}
            title='Redo'
          >
            {/* <RedoIcon/> */}
          </button>
        </div>
      </div>
      <div ref={canvasRef}></div>
    </div>
  )
};

export default Canvas;
