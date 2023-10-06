import './Canvas.css';

// Google Material Icons
import CursorIcon from '../symbols/cursor_icon';
import TrashIcon from '../symbols/trash_icon';
import UndoIcon from '../symbols/undo_icon';
import RedoIcon from '../symbols/redo_icon';

// Canvas.tsx
import React, { useRef, useEffect, useState, } from "react";
import p5 from "p5";
import * as AutomataModule from "../modules/AutomataModule";

let canvasObject: p5 | null = null; // Variável para armazenar o sketch

const Canvas: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  let clickedNode: any;
  let nearNode: any;
  let currentState: any = null

  // Selection box variables
  let selectionX: number = 0
  let selectionY: number = 0

  const DEFAULT_BACKGROUND_COLOR: string = "#eee";
  const DEFAULT_STATE_COLOR: string = "#7b2cbf";
  const DEFAULT_CLICKED_COLOR: string = "#9d4edd";
  const DEFAULT_TRANSITION_COLOR: string = "#ccc"

  // const DEFAULT_SELECTIONBOX_COLOR: string = "#55ccff44"
  // const DEFAULT_SELECTIONBOX_BORDER_COLOR: string = "#55ccffcc"
  const DEFAULT_SELECTIONBOX_COLOR: string = "#DDDDDD55"
  const DEFAULT_SELECTIONBOX_BORDER_COLOR: string = "#DDDDDDAA"
  // const DEFAULT_SELECTIONBOX_COLOR: string = "#0000"
  // const DEFAULT_SELECTIONBOX_BORDER_COLOR: string = "#000F"

  const STATES: any = {
    none: 0,
    moving_node: 1,
    creating_transition: 2,
    creating_selection: 3
  }

  const OPTIONS: any = {
    pointer: 1,
    eraser: 2
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
            const start = AutomataModule.findNode(transition.from);
            const end = AutomataModule.findNode(transition.to);
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
              const textOffsetY = -10; // Vertical offset for the text label

              p.push(); // Start another new drawing state for the tilted text
              p.translate(midX, midY);

              // Corrige textos de cabeça para baico
              // angle + Math.PI == angle + 180º
              const correctedAngle = (end.x < start.x) ? angle + Math.PI : angle;

              p.strokeWeight(1)
              p.rotate(correctedAngle);
              p.textAlign(p.CENTER, p.CENTER); // Center the text relative to the point
              p.textSize(20)
              p.text(transition.label, 0, textOffsetY);
              p.pop(); // Restore original state
            }
          });

          // Desenha estados
          AutomataModule.getNodes().forEach((node, index) => {
            p.noStroke(); 
            p.fill(node.color); 
            p.ellipse(node.x, node.y, node.diameter); 
            p.fill(255);
            p.text(node.id, node.x - 5, node.y + 5);
            p.fill(0);
            p.stroke(0);
            p.strokeWeight(2);
          });

          // Desenha caixa de seleção
          if (currentState === STATES.creating_selection){
            p.push(); // Start a new drawing state
            p.fill(DEFAULT_SELECTIONBOX_COLOR);
            p.stroke(DEFAULT_SELECTIONBOX_BORDER_COLOR);
            let distanceX: number = selectionX - p.mouseX
            let distanceY: number = selectionY - p.mouseY
            p.rect(selectionX, selectionY, -distanceX, -distanceY);
            p.pop();
          }

        };
        
        p.mouseDragged = () => {
          p.frameRate(144);
          if(clickedNode && p.mouseButton === p.RIGHT && currentState === STATES.moving_node){
            clickedNode.x = p.mouseX
            clickedNode.y = p.mouseY
          }
        }

        // Left click
        p.mousePressed = () => {
          const allNodes = AutomataModule.getNodes();

          // Previous clicked node
          if (clickedNode)
            // Reseta cor do estado anterior clicado
            clickedNode.color = DEFAULT_STATE_COLOR;

          // Encontra estado que foi clicado
          clickedNode =
            allNodes.find((node) => {
              return p.dist(node.x, node.y, p.mouseX, p.mouseY) < node.diameter/2;
            }) || null;

          // New clicked node
          if (clickedNode)
          // Highlight cor do estado clicado atual
            clickedNode.color = DEFAULT_CLICKED_COLOR;

          if (selectedOption === OPTIONS.pointer){
            // Botão esquerdo: Cria transições / Cria estados
            currentState = STATES.none;
            if (p.mouseButton === p.LEFT) {
              // Criando estado
              if (p.keyIsDown(p.SHIFT)) {
                if (!clickedNode) {
                  // Check se o novo estado criado estaria overlaping com um estágo exstente
                  nearNode =
                    allNodes.find((node) => {
                      return (
                        p.dist(node.x, node.y, p.mouseX, p.mouseY) <
                        node.diameter // Note que este não é "/2", isso é proposital
                      );
                    }) || null;

                  if (!nearNode)
                    // Gera ID do novo estado
                    var id: string;
                    if (!allNodes.length){
                      id = 'q0'
                    }
                    else {
                      let lastest_id = allNodes[allNodes.length-1].id
                      let id_number_string = lastest_id.slice(1);
                      let id_number = parseInt(id_number_string) + 1
                      id = `q${id_number}`;
                    }
                    // Cria novo estado
                    AutomataModule.addNode(
                      id,
                      p.mouseX,
                      p.mouseY,
                      DEFAULT_STATE_COLOR
                    );
                }
              }
              // Criando transição
              else if(clickedNode) {
                currentState = STATES.creating_transition;
              }
              // Criando caixa de seleção
              else {
                currentState = STATES.creating_selection;
                selectionX = p.mouseX
                selectionY = p.mouseY
              }
            }

            // Botão direito: Move estados
            if (p.mouseButton === p.RIGHT) {
              if (clickedNode) {
                currentState = STATES.moving_node
                p.cursor("grab")
              }
            }
          }
          else if(selectedOption === OPTIONS.eraser){
            if (clickedNode){
              AutomataModule.deleteNode(clickedNode.id)
            }
          }
          
        };

        p.mouseReleased = () => {
          p.cursor("default");

          if (clickedNode) {
            const endNode = AutomataModule.getNodes().find((node) => {
              return p.dist(node.x, node.y, p.mouseX, p.mouseY) < node.diameter/2;
            });
            if (endNode && currentState === STATES.creating_transition) {
              const label = prompt("Digite o símbolo de transição:");
              if (label !== null) {
                AutomataModule.addTransition(
                  clickedNode.id,
                  endNode.id,
                  label
                );
              }
            }
            clickedNode.color = DEFAULT_STATE_COLOR;
          }
          currentState = STATES.none;
        };
        clickedNode = null;
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
