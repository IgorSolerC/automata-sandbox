// Models
import { State } from "../models/State";
import { Transition } from "../models/Transition";
import { Note } from "../models/Note";


// Enums
import { AutomataInputResultsEnum } from "../enums/AutomataInputEnum";

import { findByPlaceholderText } from "@testing-library/react";
import { collapseTextChangeRangesAcrossMultipleVersions } from "typescript";
import { toHaveAccessibleDescription } from "@testing-library/jest-dom/matchers";

interface AutomataSnapshot {
  states: State[];
  transitions: Transition[];
  initialState: State | null;
  finalStates: State[];
}

let StateIdNFA = 0;  // Global or static variable to keep track of state IDs

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
    let statesSnap: State[] = JSON.parse(JSON.stringify(this.states));
    statesSnap.forEach(s => s.isAnimating = false);
    const newSnapshot: AutomataSnapshot = {
      states: statesSnap,
      transitions: JSON.parse(JSON.stringify(this.transitions)),
      initialState: statesSnap.find((s: State) => s.isInitial) || null,
      finalStates: statesSnap.filter((s: State) => s.isFinal)
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
    if(this.undoStack.length >= 1){
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
    this.pushSnapshotToUndo();
    this.redoStack = [];
    states.forEach((state) => {
      state.isFinal = !state.isFinal;
    });
    
    let finalStates = this.getStates().filter((state) => state.isFinal);
    this.setFinalStates(finalStates);
  }
  
  setFinalStates(finalStates: State[]) {
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
      isAnimating: false,
      targetX: x,
      targetY: y,
    }; // Mudar pra false

    if (isInitial) this.setInitialState(newState);
    if (isFinal) this.finalStates.push(newState);

    this.states.push(newState);
  }

  addStateObject(state: State): void {
    this.pushSnapshotToUndo();
    this.redoStack = [];
    
    this.states.push(state);
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
    
    const transitionExists = this.transitions.find((t) => t.from.id === from.id && t.to.id === to.id);
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

  changeTransitionLabel(labels: string[], transition: Transition){
    this.pushSnapshotToUndo();
    this.redoStack = [];
    transition.label = labels;
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

  updateTransitionsReferences() : void{
    let allStates = this.getStates();
    this.transitions.forEach(t => {
      let to = allStates.find(s => s.id === t.to.id)!;
      let from = allStates.find(s => s.id === t.from.id)!
      t.to = to;
      t.from = from;
    })
  }
  

  validate(input: string): { result: number; message: string } {

    // console.log('VALIDATE')
    // console.log(this.transitions)
    // console.log(this.states)
    // console.log(this.initialState)

    this.updateTransitionsReferences();
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
          arr.some(x =>
            x !== t &&
            x.from.id === t.from.id &&
            x.to.id !== t.to.id &&
            x.label.every((lbl, lblIndex) => lbl === t.label[lblIndex]) &&
            t.label.every((lbl, lblIndex) => lbl === x.label[lblIndex])
          )
      ) || this.transitions.some(t => t.label.includes("λ"))
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

    // let estado_atual_antigo = JSON.stringify(estado_atual);
    estado_atual = this.getStates().find(s => s.id === estado_atual.id)!

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

  containsObject(obj: any, list: any[]) {
    return list.some(element => JSON.stringify(element) === JSON.stringify(obj));
  }
  
  containsId(obj: any, list: any[]) {
    return list.some(element => element.id === obj.id);
  }

  /* Minimização de automatos - Algoritmo de Hopcroft*/
  minimizeDFA(): Automata {
    // console.log("OldS", this.states)
    // console.log("OldT", this.transitions)
    
    const partition = new Map<string, State[]>();
    partition.set('final', this.finalStates);
    partition.set('non-final', this.states.filter(s => !this.finalStates.includes(s)));

    let partitions = [this.finalStates, this.states.filter(s => !this.containsId(s, this.finalStates))];
    let oldPartitions = [];

    while (partitions.length !== oldPartitions.length) {
      oldPartitions = partitions;
      partitions = this.refinePartitions(partitions);
    }
    
    var result = this.buildMinimizedDFA(partitions);
    
    // console.log("NewS", result.states)
    // console.log("NewT", result.transitions)

    this.transitions = [];
    for (const transition of result.transitions)
      this.addTransition(transition.from, transition.to, transition.label, transition.color, transition.textColor);
    this.states = result.states;
    this.initialState = result.initialState;
    this.finalStates = result.finalStates;
    return result
  }

  refinePartitions(partitions: State[][]): State[][] {
    let newPartitions: State[][] = [];
    let isStable = false;
  
    // Repeat until no changes occur.
    // while (!isStable) {
      isStable = true;
      newPartitions = [];
  
      for (const partition of partitions) {
        const refined = this.splitPartition(partition, partitions);
      
        // Check if partition has been refined.
        // if (refined.length > 1) {
        //   isStable = false;
        // }
      
        newPartitions.push(...refined);
      }
  
      // if (!isStable) {
      //   partitions = newPartitions;
      // }
    // }
  
    return newPartitions;
  }

  splitPartition(partition: State[], otherPartitions: State[][]): State[][] {
    const subgroupMap = new Map<string, State[]>();
  
    // Use a map to record transitions for each state.
    partition.forEach(state => {
      const transitionKey = this.transitions
        .filter(t => t.from.id === state.id)
        .map(t => {
          // Get the partition index for the state where the transition goes to.
          const partitionIndex = otherPartitions.findIndex(p => p.some(s => s.id === t.to.id));
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
      const newState = { ...partition[0]};
      minimizedAutomata.states.push(newState);
      if (partition.some(state => state.isInitial)) {
        minimizedAutomata.initialState = newState;
        newState.isInitial = true;
      }
      if (partition.some(state => state.isFinal)) {
        minimizedAutomata.finalStates.push(newState);
        newState.isFinal = true;
      }
      return newState;
    });

    partitions.forEach((partition, index) => {
      partition.forEach(state => {
        this.transitions.forEach(transition => {
          if (transition.from.id === state.id) {
            const targetIndex = partitions.findIndex(p => p.some(s => s.id === transition.to.id));
            if (targetIndex !== -1) {
              const newStateTo = newStates[targetIndex];
              minimizedAutomata.transitions.push(new Transition(newStates[index], newStateTo, transition.label, transition.height, transition.color, transition.textColor));
            }
          }
        });
      });
    });

    return minimizedAutomata;
  }

  isCharacter(token: string): boolean {
    // Define what you consider as a character. 
    // For simplicity, assume everything that is not an operator or a parenthesis is a character.
    return !['|', '*', '(', ')', '.'].includes(token);
  }

  regexToPostfix(regex: string): string {
    const precedence: Record<string, number> = { '|': 1, '.': 2, '*': 3 };
    const operators: Set<string> = new Set(['|', '*', '.']);
    const output: string[] = [];
    const stack: string[] = [];
  
    // Function to determine if a character is an operand or a special regex character.
    const isOperand = (c: string) => !['|', '*', '(', ')', '.'].includes(c);
  
    let formattedRegex = '';
  
    // First pass to insert explicit concatenation operators
    for (let i = 0; i < regex.length; i++) {
      const c = regex[i];
      formattedRegex += c;
  
      if (c === '(' || c === ')') {
        continue;
      }
  
      if (i < regex.length - 1) {
        const lookahead = regex[i + 1];
        if (isOperand(c) && (isOperand(lookahead) || lookahead === '(')) {
          formattedRegex += '.';
        } else if (c === ')' && (isOperand(lookahead) || lookahead === '(')) {
          formattedRegex += '.';
        } else if (c === '*' && (isOperand(lookahead) || lookahead === '(')) {
          if (i < regex.length - 2 && !operators.has(regex[i + 2])) {
            formattedRegex += '.';
          }
        }
      }
    }
  
    // Second pass to convert to postfix
    for (const c of formattedRegex) {
      if (isOperand(c)) {
        output.push(c);
      } else if (c === '(') {
        stack.push(c);
      } else if (c === ')') {
        while (stack.length > 0 && stack[stack.length - 1] !== '(') {
          output.push(stack.pop()!);
        }
        stack.pop(); // Remove '('
        if (stack.length > 0 && stack[stack.length - 1] === '*') {
          output.push(stack.pop()!);
        }
      } else {
        while (stack.length > 0 && precedence[c] <= precedence[stack[stack.length - 1]]) {
          output.push(stack.pop()!);
        }
        stack.push(c);
      }
    }
  
    while (stack.length > 0) {
      output.push(stack.pop()!);
    }
  
    return output.join('');
  }
  
  
  regexToNFA(postfixRegex: string): Automata {
    const automataStack: Automata[] = [];
  
    function createBasicAutomata(symbol: string): Automata {
      const automata = new Automata();
      const start = { 
        id: `s${StateIdNFA++}`, 
        label: `s${StateIdNFA}`, 
        x: 0 + 200 * (StateIdNFA - 1), 
        y: 0, 
        diameter: 80, 
        color: 'blue', 
        secondaryColor: 'lightblue', 
        isInitial: StateIdNFA === 1, 
        isFinal: false,
        isAnimating: false, 
        targetX: 0,
        targetY: 0
      };
    
      const end = { 
        id: `s${StateIdNFA++}`, 
        label: `s${StateIdNFA}`, 
        x: 200 + 200 * (StateIdNFA - 1), 
        y: 0, 
        diameter: 80, 
        color: 'green', 
        secondaryColor: 'lightgreen', 
        isInitial: false, 
        isFinal: true,
        isAnimating: false, 
        targetX: 0,
        targetY: 0
      };
    
      automata.states.push(start, end);
      automata.transitions.push(new Transition(start, end, [symbol], 1, 'black', 'white'));
      automata.initialState = start;
      automata.finalStates.push(end);
      return automata;
    }

    function applyKleeneStar(automata: Automata): Automata {
      const oldInitial = automata.initialState!;
      const oldFinal = automata.finalStates[0]; // Assume single final state for simplicity
      
      const start = {
        id: `s${StateIdNFA++}`,
        label: `s${StateIdNFA}`,
        x: oldInitial.x,
        y: oldInitial.y - 400,
        diameter: 80,
        color: 'blue',
        secondaryColor: 'lightblue',
        isInitial: true,
        isFinal: false,
        isAnimating: false, 
        targetX: 0,
        targetY: 0
      };
    
      const end = {
        id: `s${StateIdNFA++}`,
        label: `s${StateIdNFA}`,
        x: oldFinal.x,
        y: oldFinal.y - 400,
        diameter: 80,
        color: 'green',
        secondaryColor: 'lightgreen',
        isInitial: false,
        isFinal: true,
        isAnimating: false, 
        targetX: 0,
        targetY: 0
      };
    
      
      automata.states.forEach(s => {
        s.isInitial = false
        s.isFinal = false;
      })
      automata.states.push(start, end);
      
      // StateIdNFA  += 2
      automata.transitions.push(new Transition(start, oldInitial, ['λ'], 1, 'black', 'white'));
      automata.transitions.push(new Transition(oldFinal, oldInitial, ['λ'], 1, 'black', 'white'));
      automata.transitions.push(new Transition(oldFinal, end, ['λ'], 1, 'black', 'white'));
      automata.transitions.push(new Transition(end, start, ['λ'], 1, 'black', 'white'));
    
      automata.initialState = start;
      automata.finalStates = [end];
    
      return automata;
    }

    function applyAlternation(automata1: Automata, automata2: Automata): Automata {
      let resultAutomata = new Automata();
      
      let biggerLengthAutomata = automata1.states.length 
      let smallerAutomata = automata2;
      if(automata2.states.length > biggerLengthAutomata){
        biggerLengthAutomata = automata2.states.length
        smallerAutomata = automata1;
      }

      const newStart = {
        id: `s${StateIdNFA++}`,
        label: `s${StateIdNFA}`,
        x: 0,
        y: 0,
        diameter: 80,
        color: 'blue',
        secondaryColor: 'lightblue',
        isInitial: true,
        isFinal: false,
        isAnimating: false, 
        targetX: 0,
        targetY: 0
      };
    
      const newFinal = {
        id: `s${StateIdNFA++}`,
        label: `s${StateIdNFA}`,
        x: 200 + 200 * biggerLengthAutomata + 1,
        y: 0,
        diameter: 80,
        color: 'green',
        secondaryColor: 'lightgreen',
        isInitial: false,
        isFinal: true,
        isAnimating: false, 
        targetX: 0,
        targetY: 0
      };
    
      let counter = 1
      automata1.states.forEach(s => {
        s.isInitial = false
        s.isFinal = false;
        s.y += 200;
        s.x = newStart.x + 200 * counter
        counter++;
      })

      counter = 1
      automata2.states.forEach(s => {
        s.isInitial = false
        s.isFinal = false;
        s.y -= 200;
        s.x = newStart.x + 200 * counter
        counter++;
      })

      const centerLineX = newStart.x + ( 200 * (biggerLengthAutomata + 1) / 2);

      counter = 1;
      smallerAutomata.states.forEach(s => {
        s.x = centerLineX + 200 * (counter - (smallerAutomata.states.length + 1) / 2);
        counter++;
      });

      // StateIdNFA  += 2
      // Add the new states to the result automaton
      resultAutomata.states.push(newStart, newFinal);

      // Add all states and transitions from automata1 and automata2 to the result automaton
      resultAutomata.states = resultAutomata.states.concat(automata1.states, automata2.states);
      resultAutomata.transitions = resultAutomata.transitions.concat(automata1.transitions, automata2.transitions);
      // Add epsilon transitions from the new start to the initial states of both automata
      resultAutomata.transitions.push(new Transition(newStart, automata1.initialState!, ['λ'], 1, 'black', 'white'));
      resultAutomata.transitions.push(new Transition(newStart, automata2.initialState!, ['λ'], 1, 'black', 'white'));

      // Add epsilon transitions from each automaton's final states to the new final state
      automata1.finalStates.forEach(finalState => resultAutomata.transitions.push(new Transition(finalState, newFinal, ['λ'], 1, 'black', 'white')));
      automata2.finalStates.forEach(finalState => resultAutomata.transitions.push(new Transition(finalState, newFinal, ['λ'], 1, 'black', 'white')));

      // Set the new initial and final states for the result automaton
      resultAutomata.initialState = newStart;
      resultAutomata.finalStates = [newFinal];

      return resultAutomata;
    }

    function applyConcatenation(automata1: Automata, automata2: Automata): Automata {
      automata1.states = automata1.states.concat(automata2.states);
      automata1.transitions = automata1.transitions.concat(automata2.transitions);
    
      const oldFinals = automata1.finalStates;
      const newStart = automata2.initialState!;

      // Connect all final states of automata1 to the initial state of automata2
      oldFinals.forEach(finalState => {
        automata1.transitions.push(new Transition(finalState, newStart, ['λ'], 1, 'black', 'white'));
        // This ensures the old final states are no longer final unless the new start is also final
        finalState.isFinal = newStart.isFinal;
      });

      // The final states of the resulting automaton are those of automata2
      automata1.finalStates = automata2.finalStates;

      return automata1;
    }
    

    for (const symbol of postfixRegex) {
      switch (symbol) {
      case '*': {
        const automata = automataStack.pop()!;
        automataStack.push(applyKleeneStar(automata));
        break;
      }
      case '|': {
        const automata2 = automataStack.pop()!;
        const automata1 = automataStack.pop()!;
        automataStack.push(applyAlternation(automata1, automata2));
        break;
      }
      case '.': {
        const automata2 = automataStack.pop()!;
        const automata1 = automataStack.pop()!;
        automataStack.push(applyConcatenation(automata1, automata2));
        break;
      }
      default: // For any other symbol, assume it's a basic character in the regex
        automataStack.push(createBasicAutomata(symbol));
        break;
    }
  }

  // Assuming only one automata should be left if regex is well-formed
  return automataStack.length > 0 ? automataStack.pop()! : new Automata();
}

  epsilonClosure(state: State): Set<State> {
    let closure = new Set<State>([state]);
    let stack = [state];

    while (stack.length > 0) {
        let current = stack.pop();
        this.transitions.forEach(t => {
            if (t.from.id === current!.id && t.label.includes('λ')) { // Assuming 'λ' denotes epsilon
                if (!closure.has(t.to)) {
                    closure.add(t.to);
                    stack.push(t.to);
                }
            }
        });
    }

    return closure;
  }

  getAlphabet(): Set<string> {
    let alphabet = new Set<string>();
    this.transitions.forEach(transition => {
        transition.label.forEach(label => {
            if (label !== 'λ') { // Assuming 'λ' represents epsilon transitions
                alphabet.add(label);
            }
        });
    });
    return alphabet;
  }

  stateSetToLabel(stateSet: Set<State>): string {
    return Array.from(stateSet).map(state => state.id).sort().join(",");
  }
  
  convertNFAToDFA() {
    const dfaStates = new Map<string, State[]>();
    const dfaTransitions: Transition[] = [];
    const dfaFinalStates: State[] = [];
    console.log(this.initialState);
    const dfaStartState = this.epsilonClosure(this.initialState!);
  
    console.log(dfaStartState)
    const startStateLabel = this.stateSetToLabel(dfaStartState);
    const startState = {
      id: startStateLabel, label: startStateLabel, x: 100, y: 100, diameter: 80, color: 'blue', secondaryColor: 'lightblue', isInitial: true, isFinal: Array.from(dfaStartState).some(s => s.isFinal), isAnimating: false, targetX: 0, targetY: 0
    };
    dfaStates.set(startStateLabel, Array.from(dfaStartState));
  
    const queue = [startState];
    const processed = new Set();
  
    while (queue.length > 0) {
      let currentState = queue.shift()!;
      processed.add(currentState.label);
  
      this.getAlphabet().forEach(symbol => {
        let nextStateSet = new Set<State>();
  
        dfaStates.get(currentState.label)!.forEach(state => {
          this.transitions.filter(t => t.from.id === state.id && t.label.includes(symbol)).forEach(t => {
            this.epsilonClosure(t.to).forEach(s => nextStateSet.add(s));
          });
        });
  
        const nextStateLabel = this.stateSetToLabel(nextStateSet);
  
        if (nextStateSet.size > 0) {
          if (!dfaStates.has(nextStateLabel)) {
            const newState = {
              id: nextStateLabel, label: nextStateLabel, diameter: 80, x: 0, y: 0, color: 'light', secondaryColor: 'blue', isInitial: false, isFinal: Array.from(nextStateSet).some(s => s.isFinal), isAnimating: false, targetX: 0, targetY: 0 
            };
            dfaStates.set(nextStateLabel, Array.from(nextStateSet));
            queue.push(newState);
            if (newState.isFinal) {
              dfaFinalStates.push(newState);
            }
          }
          if (!processed.has(nextStateLabel)) {
            dfaTransitions.push(new Transition(currentState, dfaStates.get(nextStateLabel)![0], [symbol], 50, 'black', 'white'));
            processed.add(nextStateLabel);
          }
        }
      });
    }
  
    // Replace the current automaton states and transitions with the DFA ones
    this.states = Array.from(dfaStates.values()).map(stateArray => stateArray[0]);
    this.transitions = dfaTransitions;
    this.finalStates = dfaFinalStates;
  }

  convertRegexToDFA(regex: string) {
    StateIdNFA = 0;
    console.log(regex);
    const postfix = this.regexToPostfix(regex);
    console.log(postfix)
    const nfa = this.regexToNFA(postfix);
    this.initialState = nfa.initialState;
    this.transitions = [];
    for (const transition of nfa.transitions)
      this.addTransition(transition.from, transition.to, transition.label, transition.color, transition.textColor);
    this.states = nfa.states;
    this.finalStates = nfa.finalStates;

    this.convertNFAToDFA();
  }
}
