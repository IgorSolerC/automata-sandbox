// Models
import { State } from "../models/State";
import { Transition } from "../models/Transition";
import { Note } from "../models/Note";

// Enums
import { AutomataInputResultsEnum } from "../enums/AutomataInputEnum";

interface AutomataSnapshot {
  states: State[];
  transitions: Transition[];
  initialState: State | null;
  finalStates: State[];
}

export class Automata {
  states: State[];
  transitions: Transition[];
  notes: Note[];
  initialState: State | null;
  finalStates: State[];
  undoStack: AutomataSnapshot[];
  redoStack: AutomataSnapshot[];

  constructor() {
    this.states = [];
    this.transitions = [];
    this.notes = [];
    this.initialState = null;
    this.finalStates = [];
    this.undoStack = [];
    this.redoStack = [];
  }

  /* Misc */
  printInfo() {
    // Estados
    let states: State[] = this.states.slice();
    let statesIds: string[] = states.map((state) => state.id);
    console.log("states = {" + statesIds + "}");

    // Transições
    let transitions: Transition[] = this.transitions.slice();
    let formatedTransitions: string[] = transitions.map(
      (transition) =>
        `\n(${transition["from"].id}, ${transition["label"]} = ${transition["to"].id})`
    );
    console.log("transicoes = " + formatedTransitions);

    // Estados finais
    let finalStates: State[] = this.finalStates.slice();
    let finalStatesIds: string[] = finalStates.map((state) => state.id);
    console.log("final = {" + finalStatesIds + "}");

    // Estado Inicial
    let initial: string = this.initialState ? this.initialState.id : "null";
    console.log("initial = " + initial);
  }

  pushSnapshotToUndo(){
    const newSnapshot: AutomataSnapshot = {
      states: JSON.parse(JSON.stringify(this.states)),
      transitions: JSON.parse(JSON.stringify(this.transitions)),
      initialState: JSON.parse(JSON.stringify(this.initialState)),
      finalStates: JSON.parse(JSON.stringify(this.finalStates))
    };
    
    //Validation to not make duped snapshots
    if (this.undoStack.length === 0 || !this.areSnapshotsEqual(this.undoStack[this.undoStack.length - 1], newSnapshot)) {
      this.undoStack.push(newSnapshot);
    }
  
  }

  areSnapshotsEqual(snapshot1: AutomataSnapshot, snapshot2: AutomataSnapshot): boolean {
    return JSON.stringify(snapshot1) === JSON.stringify(snapshot2);
  }

  undo(){
    if(this.undoStack.length > 1){
      this.pushSnapshotToUndo();
      const currentSnapshot = this.undoStack.pop()!;
      this.redoStack.push(currentSnapshot);
      const previousSnapshot = this.undoStack.pop()!;
      this.restoreSnapshot(previousSnapshot);

    }    
  }

  redo() {
    if(this.redoStack.length > 0 ){
      this.pushSnapshotToUndo();
      const redoSnapshot = this.redoStack.pop()!;
      this.restoreSnapshot(redoSnapshot);
    }
  }

  restoreSnapshot(snapshot: AutomataSnapshot) {
    this.states = snapshot.states;
    this.transitions = snapshot.transitions;
    this.initialState = snapshot.initialState;
    this.finalStates = snapshot.finalStates;
  }


  clearAutomata(){
    this.states = [];
    this.transitions = [];
    this.initialState = null;
    this.finalStates = [];
    this.notes = [];
    this.undoStack = []
    this.redoStack = [];
  }

  /* Initial state */
  setInitialState(newState: State | null, saveSnapshot: boolean = true) {
    if(saveSnapshot){
      this.pushSnapshotToUndo();
      this.redoStack = [];
    }

    const initialStates = this.states.filter(state => state.isInitial);

    for (const state of initialStates) {
        state.isInitial = false;
    }

    if (newState) {
      newState.isInitial = true;
    }

    this.initialState = newState;
  }

  getInitialState() {
    return this.initialState;
  }

  /* Final states */
  toggleFinal(states: State[]) {
    states.forEach((state) => {
      state.isFinal = !state.isFinal;
    });
    
    let finalStates = this.getStates().filter((state) => state.isFinal);
    this.setFinalStates(finalStates);
  }
  
  setFinalStates(finalStates: State[]) {
    this.pushSnapshotToUndo();
    this.redoStack = [];
    this.finalStates = finalStates;
  }

  getFinalStates() {
    return this.finalStates;
  }

  /* States */
  getStates(): State[] {
    return this.states;
  }

  getNotes(): Note[] {
    return this.notes;
  }

  addNote(x: number, y: number, text: string, width: number, height: number, textLines: string[], textSize: number, color: string, secondaryColor: string) {
    let newNoteId = 0;
    const allNotes = this.getNotes();
    while (allNotes.some(note => note.id === newNoteId)) {
      newNoteId++;
    }

    const newNote: Note = {
      id: newNoteId,
      x,
      y,
      text,
      textLines,
      textSize,
      width,
      height,
      color,
      secondaryColor,
    }

    this.notes.push(newNote);
    return newNote
  }
  deleteNote(note: Note): void {
    const index = this.notes.findIndex((n) => n.id === note.id);
    if (index !== -1) {
      this.notes.splice(index, 1);
    }
  }


  addState(id: string, x: number, y: number, color: string, secondaryColor: string, isInitial: boolean = false, isFinal: boolean = false, label: string = ""): void {
    this.pushSnapshotToUndo();
    this.redoStack = [];
    if(!isInitial) 
      isInitial = this.states.length === 0;
    
    if(!label)
      label = id;

    const newState: State = {
      id,
      label,
      x,
      y,
      // transitions: [],
      diameter: 80,
      color,
      secondaryColor,
      isInitial: isInitial,
      isFinal: isFinal,
    }; // Mudar pra false

    if (isInitial) this.setInitialState(newState);
    if (isFinal) this.finalStates.push(newState);

    this.states.push(newState);
  }

  deleteState(state: State, saveSnapshot: boolean = true): void {
    if(saveSnapshot){
      this.pushSnapshotToUndo();
      this.redoStack = [];
    }

    const index = this.states.findIndex((s) => s.id === state.id);
    if (index !== -1) {
      this.states.splice(index, 1);
    }

    // Att estado inicial
    if (state.isInitial) {
      this.setInitialState(null, false);
    }

    // Att estado final
    if (state.isFinal)
      this.setFinalStates(this.finalStates.filter((s) => s.id !== state.id));

    this.deleteTransitionFromState(state);
  }

  findState(id: string): State | undefined {
    return this.states.find((state) => state.id === id);
  }

  /* Transition */
  getTransitions(): Transition[] {
    return this.transitions;
  }

  addTransition(from: State, to: State, label: string[], color: any, textColor: any): void {
    const newTransition: Transition = {
      from,
      to,
      label,
      height: 0,
      color,
      textColor,
    };
    this.pushSnapshotToUndo();
    this.redoStack = [];
    this.transitions.push(newTransition);
  }

  deleteTransition(transition: Transition): void {
    this.pushSnapshotToUndo();
    const index = this.transitions.findIndex((t) => t.from === transition.from && t.to === transition.to && t.label === transition.label);
    if (index !== -1) {
      this.transitions.splice(index, 1);
    }
  }

  deleteTransitionFromState(state: State): void {
    this.transitions
      .filter((t) => t.from === state || t.to === state)
      .forEach((transition) => {
        const index = this.transitions.findIndex((t) => t === transition);
        if (index !== -1) {
          this.transitions.splice(index, 1);
        }
      });
  }

  /* Simulação */
  testTransition(input: string, estado_atual: State, i: number) {
    const char = input[i];
    let possiveis_transicoes = this.transitions.filter(
      (transition) => transition.from === estado_atual
    );

    if (
      !possiveis_transicoes ||
      !possiveis_transicoes.some((transition) => transition.label.includes(char))
      ) {
      return {
        isValidTransition: false,
        nextState: null,
      };
    } else {
      estado_atual = possiveis_transicoes.find(
        (transition) => transition.label.includes(char)
        )!.to;
      return {
        isValidTransition: true,
        nextState: estado_atual,
      };
    }
  }

  validate(input: string): { result: number; message: string } {
    const characters = input.split("");
    const temCharForaDoAlfabeto = characters.some(
      (char) =>
        !this.transitions.some((transition) => transition.label.includes(char))
    );

    if (temCharForaDoAlfabeto) {
      return {
        result: AutomataInputResultsEnum.WARNING,
        message: "Simbolo de entrada fora do alfabeto!",
      };
    }

    if (!this.initialState) {
      return {
        result: AutomataInputResultsEnum.WARNING,
        message: "Nenhum estado inicial foi definido!",
      };
    }

    if (this.finalStates.length === 0) {
      return {
        result: AutomataInputResultsEnum.WARNING,
        message: "Nenhum estado final foi definido!",
      };
    }

    if (
      this.transitions.some(
        (t, index, arr) =>
          arr.filter((x) => x.from === t.from && x.label === t.label).length > 1
      )
    ) {
      return { 
        result: AutomataInputResultsEnum.WARNING, 
        message: "Não determinismo encontrado!" 
      };
    }

    let estado_atual = this.initialState;

    for (let i = 0; i < input.length; i++) {
      const { isValidTransition, nextState } =
        this.testTransition(input, estado_atual, i);

      if (!isValidTransition) {
        return {
          result: AutomataInputResultsEnum.REJECTED,
          message: "Transição inválida!"
        };
      }

      estado_atual = nextState!;
    }

    if (estado_atual.isFinal) {
      return {
        result: AutomataInputResultsEnum.ACCEPTED,
        message: '',
      };
    } else {
      return {
        result: AutomataInputResultsEnum.REJECTED,
        message: "Não finalizou em um estado final!",
      };
    }
  }
}
