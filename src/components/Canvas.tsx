import './Canvas.css';

// Canvas.tsx
import React, { useRef, useEffect } from "react";
import p5 from "p5";
import * as AutomataModule from "../modules/AutomataModule";

const Canvas: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  let clickedNode: any;
  let nearNode: any;
  let currentState: any = null

  const DEFAULT_BACKGROUND_COLOR: string = "#ebebeb";
  const DEFAULT_STATE_COLOR: string = "#004e98";
  const DEFAULT_CLICKED_COLOR: string = "#ff6700";
  const DEFAULT_TRANSITION_COLOR: string = "#d0d0d0"

  const STATES: any = {
    none: 0,
    moving_node: 1,
    creating_transition: 2
  }

  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.addEventListener("contextmenu", (e) => {
        e.preventDefault();
      });

      new p5((p: p5) => {
        p.setup = () => {
          p.createCanvas(window.innerWidth, window.innerHeight);
          p.frameRate(30);
        };

        p.draw = () => {
          p.background(DEFAULT_BACKGROUND_COLOR);

          AutomataModule.getTransitions().forEach((transition) => {
            const start = AutomataModule.findNode(transition.from);
            const end = AutomataModule.findNode(transition.to);
            if (start && end) {
              p.stroke(DEFAULT_TRANSITION_COLOR);
              p.line(start.x, start.y, end.x, end.y);

              const angle = Math.atan2(end.y - start.y, end.x - start.x); // angle of line
              const radius = start.radius; // radius of circle
              const offsetX = radius * Math.cos(angle);
              const offsetY = radius * Math.sin(angle);

              // Draw line from the edge of the start circle to the edge of the end circle
              p.line(start.x, start.y, end.x - offsetX, end.y - offsetY);

              // Draw an arrowhead at the edge of the end circle
              const length = 10; // length of arrowhead
              p.push(); // Start a new drawing state
              p.translate(end.x - offsetX, end.y - offsetY);
              p.rotate(angle);
              p.line(0, 0, -length, length);
              p.line(0, 0, -length, -length);
              p.pop(); // Restore original state
              p.stroke(1);

              const midX = (start.x + end.x - offsetX) / 2;
              const midY = (start.y + end.y - offsetY) / 2;
              const textOffsetY = -10; // Vertical offset for the text label

              p.push(); // Start another new drawing state for the tilted text
              p.translate(midX, midY);

              // Correct the angle for backward lines
              const correctedAngle = (end.y < start.y) ? angle + Math.PI : angle;

              p.rotate(correctedAngle);
              p.textAlign(p.CENTER, p.CENTER); // Center the text relative to the point
              p.text(transition.label, 0, textOffsetY);
              p.pop(); // Restore original state
            }
          });

          AutomataModule.getNodes().forEach((node, index) => {
            p.noStroke();
            p.fill(node.color);
            p.ellipse(node.x, node.y, 50, 50, 0);
            p.fill(255);
            p.text(node.id, node.x - 5, node.y + 5);
            p.fill(0);
            p.stroke(0);
            p.strokeWeight(2);
          });
        };
        
        p.mouseDragged = () => {
          p.frameRate(144);
          if(clickedNode && p.mouseButton === p.RIGHT){
            clickedNode.x = p.mouseX
            clickedNode.y = p.mouseY
          }
        }

        // Left click
        p.mousePressed = () => {
          const allNodes = AutomataModule.getNodes();
          // Encontra estado que foi clicado
          clickedNode =
            allNodes.find((node) => {
              return p.dist(node.x, node.y, p.mouseX, p.mouseY) < node.radius;
            }) || null;
          if (clickedNode) {
            clickedNode.color = DEFAULT_CLICKED_COLOR;
          }

          // Botão esquerdo: Cria transições / Cria estados
          currentState = STATES.none;
          if (p.mouseButton === p.LEFT) {
            if (p.keyIsDown(p.SHIFT)) {
              if (!clickedNode) {
                const id = `q${allNodes.length}`;
                nearNode =
                  allNodes.find((node) => {
                    return (
                      p.dist(node.x, node.y, p.mouseX, p.mouseY) <
                      node.radius * 2
                    );
                  }) || null;

                if (!nearNode)
                  AutomataModule.addNode(
                    id,
                    p.mouseX,
                    p.mouseY,
                    DEFAULT_STATE_COLOR
                  );
              }
            } else {
              if(currentState === STATES.none)
                currentState = STATES.creating_transition;
            }
          }

          // Botão direito: Move estados
          if (p.mouseButton === p.RIGHT) {
            if (clickedNode) {
              currentState = STATES.moving_node
              p.cursor("grab")
            }
          }
        };

        p.mouseReleased = () => {
          p.cursor("default");
          if (clickedNode) {
            const endNode = AutomataModule.getNodes().find((node) => {
              return p.dist(node.x, node.y, p.mouseX, p.mouseY) < node.radius;
            });
            if (endNode && currentState === STATES.creating_transition) {
              currentState = STATES.none;
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
          clickedNode = null;
        };
      }, canvasRef.current);
    } 
  }, []);

  var currentSelectedOption = 0

  return (
    <div>
      <div id='navbar-button-div'>
        <button
          id='eraser'
          className='navbar-button'
          onClick={() => (currentSelectedOption = 1)}>
        </button>
        <button
          id='pointer'
          className='navbar-button'
          onClick={() => (currentSelectedOption = 2)}>
        </button>
      </div>
      <div ref={canvasRef}></div>
    </div>
  )
};

export default Canvas;
