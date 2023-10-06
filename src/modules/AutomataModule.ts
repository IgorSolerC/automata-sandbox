interface AutomataNode {
    id: string;
    x: number;
    y: number;
    transitions: string[];
    diameter: number;
    color: any;
} 

interface Transition {
    from: string;
    to: string;
    label: string;
}

const automataNodes: AutomataNode[] = [];
const transitions: Transition[] = [];
const stateColor = "#000000";

export const addNode = (id: string, x: number, y: number, color: string) => {
    const newNode: AutomataNode = { id, x, y, transitions: [], diameter: 80, color };
    automataNodes.push(newNode);
};

export const deleteNode = (id: string) => {
  const index = automataNodes.findIndex(node => node.id === id);
  if (index !== -1) {
    automataNodes.splice(index, 1);
  }
};

export const findNode = (id: string) => {
  return automataNodes.find(node => node.id === id);
};

export const getNodes = () => {
  return automataNodes;
};

export const addTransition = (from: string, to: string, label: string) => {
  const newTransition: Transition = { from, to, label };
  transitions.push(newTransition);
};

export const getTransitions = () => {
  return transitions;
};