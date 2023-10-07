
interface State {
    id: string;
    // label: string;

    // Rendering
    x: number;
    y: number;
    diameter: number;
    color: any;

    // Definição automato
    isInitial: boolean;
    isFinal: boolean;
    transitions: string[];
} 

interface Transition {
    from: State;
    to: State;
    label: string;
}

interface Automata {
    states: State[];
    transitions: Transition[];
}

const automataStates: State[] = [];
const transitions: Transition[] = [];
const stateColor = "#000000";

export const addState = (id: string, x: number, y: number, color: string) => {
    const newState: State = { id, x, y, transitions: [], diameter: 80, color, isInitial: false, isFinal: false };
    automataStates.push(newState);
};

export const deleteState = (state: State) => {
  const index = automataStates.findIndex(s => s.id === state.id);
  if (index !== -1) {
    automataStates.splice(index, 1);
  }
};

export const findState = (id: string) => {
  return automataStates.find(state => state.id === id);
};

export const getStates = () => {
  return automataStates;
};

export const addTransition = (from: State, to: State, label: string) => {
  const newTransition: Transition = { from, to, label };
  transitions.push(newTransition);
};

export const getTransitions = () => {
  return transitions;
};

export const deleteTransition = (referenceState: State) => {
  return;  
}