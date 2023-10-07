import { State } from "../models/State";
import { Transition } from "../models/Transition";

export class Automata {
  states: State[];
  transitions: Transition[];

  constructor() {
    this.states = [];
    this.transitions = [];
  }

  addState(id: string, x: number, y: number, color: string): void {
    const newState: State = { id, x, y, transitions: [], diameter: 80, color, isInitial: true, isFinal: true }; // Mudar pra false
    this.states.push(newState);
  }

  deleteState(state: State): void {
    const index = this.states.findIndex(s => s.id === state.id);
    if (index !== -1) {
      this.states.splice(index, 1);
    }
  }

  findState(id: string): State | undefined {
    return this.states.find(state => state.id === id);
  }

  getStates(): State[] {
    return this.states;
  }

  addTransition(from: State, to: State, label: string): void {
    const newTransition: Transition = { from, to, label };
    this.transitions.push(newTransition);
  }

  getTransitions(): Transition[] {
    return this.transitions;
  }

  deleteTransition(referenceState: State): void {
    // Your code for deleting transition can go here
  }
}
