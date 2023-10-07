import { State } from "../models/State";
import { Transition } from "../models/Transition";

export class Automata {
  states: State[];
  transitions: Transition[];
  initialState: State | null;
  finalStates: State[];
  
  constructor() {
    this.states = [];
    this.transitions = [];
    this.initialState = null;
    this.finalStates = []
  }
  
  /* Misc */
  printInfo() {
    // Estados
    let states: State[] = this.states.slice()
    let statesIds:  string[] = states.map(state => state.id);
    console.log(
      'states = (' + statesIds + ')'
      )
      
    // Transições
    let transitions: {'from':State, 'to':State, 'label': string}[] = this.transitions.slice()
    let formatedTransitions: string[] = transitions.map(transition => (
      `\n(${transition['from'].id}, ${transition['label']} = ${transition['to'].id})`
    ));
    console.log(
      'transicoes = ' + formatedTransitions
    )

    // Estados finais
    let finalStates: State[] = this.finalStates.slice()
    let finalStatesIds:  string[] = finalStates.map(state => state.id);
    console.log(
      'final = (' + finalStatesIds + ')'
    )
      
    // Estado Inicial
    let initial: string = this.initialState ? this.initialState.id : 'null'
    console.log(
      'initial = ' +  initial
    )
        
  }

  /* Initial state */
  setInitialState(state: State | null){
    this.initialState = state
  }
  
  getInitialState(){
    return this.initialState
  }


  /* Final states */
  setFinalState(finalStates: State[]){
    this.finalStates = finalStates
  }

  getFinalState(){
    return this.finalStates
  }


  /* States */
  getStates(): State[] {
    return this.states;
  }

  addState(id: string, x: number, y: number, color: string): void {
    let isInitial: boolean = (this.states.length === 0)
    const newState: State = { id, x, y, transitions: [], diameter: 80, color, isInitial: isInitial, isFinal: false }; // Mudar pra false

    if (isInitial)
      this.setInitialState(newState)

    this.states.push(newState);
  }

  deleteState(state: State): void {
    const index = this.states.findIndex(s => s.id === state.id);
    if (index !== -1) {
      this.states.splice(index, 1);
    }

    // Att estado inicial
    if (state.isInitial){
      this.setInitialState(null)
    }

    // Att estado final
    if (state.isFinal)
      this.setFinalState(this.finalStates.filter(s => s.id !== state.id))

  }

  findState(id: string): State | undefined {
    return this.states.find(state => state.id === id);
  }


  /* Transition */
  getTransitions(): Transition[] {
    return this.transitions;
  }

  addTransition(from: State, to: State, label: string): void {
    const newTransition: Transition = { from, to, label };
    this.transitions.push(newTransition);
  }

  deleteTransition(referenceState: State): void {
    // Your code for deleting transition can go here
  }
}
