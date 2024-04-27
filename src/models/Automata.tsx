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
    const noteIds = new Set(allNotes.map(note => note.id));

    while (noteIds.has(newNoteId)) {
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

  addTransition(from: State, to: State, labels: string[], color: any, textColor: any): void {
    this.pushSnapshotToUndo();
    this.redoStack = [];
    
    const transitionExists = this.transitions.find((t) => t.from === from && t.to === to);
    if (transitionExists) {
      labels.forEach(label => {
        if (!transitionExists.label.includes(label)) {
            transitionExists.label.push(label);
        }
      });
      return;
    } else {
      const newTransition: Transition = {
        from,
        to,
        label: labels,
        height: 0,
        color,
        textColor,
      };
      this.transitions.push(newTransition);
    }
    
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
      .filter((t) => t.from.id === state.id || t.to.id === state.id)
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
      (transition) => transition.from.id === estado_atual.id
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


  /* Minimização de automatos - Algoritmo de Hopcroft*/
  minimizeDFA(): Automata {
    const partition = new Map<string, State[]>();
    partition.set('final', this.finalStates);
    partition.set('non-final', this.states.filter(s => !this.finalStates.includes(s)));

    let partitions = [this.finalStates, this.states.filter(s => !this.finalStates.includes(s))];
    let oldPartitions = [];

    while (partitions.length !== oldPartitions.length) {
      oldPartitions = partitions;
      partitions = this.refinePartitions(partitions);
    }
    
    var result = this.buildMinimizedDFA(partitions);
    this.transitions = result.transitions;
    this.states = result.states;
    this.initialState = result.initialState;
    this.finalStates = result.finalStates;
    return result
  }

  refinePartitions(partitions: State[][]): State[][] {
    let newPartitions: State[][] = [];
    let isStable = false;
  
    // Repeat until no changes occur.
    while (!isStable) {
      isStable = true;
      newPartitions = [];
  
      partitions.forEach(partition => {
        const refined = this.splitPartition(partition, partitions);
  
        // Check if partition has been refined.
        if (refined.length > 1) {
          isStable = false;
        }
  
        newPartitions.push(...refined);
      });
  
      if (!isStable) {
        partitions = newPartitions;
      }
    }
  
    return newPartitions;
  }

  splitPartition(partition: State[], otherPartitions: State[][]): State[][] {
    const subgroupMap = new Map<string, State[]>();
  
    // Use a map to record transitions for each state.
    partition.forEach(state => {
      const transitionKey = this.transitions
        .filter(t => t.from === state)
        .map(t => {
          // Get the partition index for the state where the transition goes to.
          const partitionIndex = otherPartitions.findIndex(p => p.includes(t.to));
          // Use the label and the partition index as the key.
          return `${t.label.join('')}:${partitionIndex}`;
        })
        .sort()
        .join('|'); // '|' is used to delimit different transition keys.
  
      if (!subgroupMap.has(transitionKey)) {
        subgroupMap.set(transitionKey, []);
      }
      subgroupMap.get(transitionKey)?.push(state);
    });
  
    return Array.from(subgroupMap.values());
  }

  buildMinimizedDFA(partitions: State[][]): Automata {
    const minimizedAutomata = new Automata();
    const newStates = partitions.map((partition, index) => {
      const newState = { ...partition[0], id: `S${index}` };
      minimizedAutomata.states.push(newState);
      if (partition.some(state => state.isInitial)) {
        minimizedAutomata.initialState = newState;
      }
      if (partition.some(state => state.isFinal)) {
        minimizedAutomata.finalStates.push(newState);
      }
      return newState;
    });

    partitions.forEach((partition, index) => {
      partition.forEach(state => {
        this.transitions.forEach(transition => {
          if (transition.from === state) {
            const newStateTo = newStates[partitions.findIndex(p => p.includes(transition.to))];
            minimizedAutomata.transitions.push(new Transition(newStates[index], newStateTo, transition.label, transition.height, transition.color, transition.textColor));
          }
        });
      });
    });

    return minimizedAutomata;
  }
}
