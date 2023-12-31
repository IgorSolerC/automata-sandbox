// Models
import { State } from "../models/State";
import { Transition } from "../models/Transition";

// Enums
import { AutomataInputResultsEnum } from "../enums/AutomataInputEnum";

export class Automata {
  states: State[];
  transitions: Transition[];
  initialState: State | null;
  finalStates: State[];

  constructor() {
    this.states = [];
    this.transitions = [];
    this.initialState = null;
    this.finalStates = [];
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

  /* Initial state */
  setInitialState(state: State | null) {
    this.initialState = state;
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
    this.finalStates = finalStates;
  }

  getFinalStates() {
    return this.finalStates;
  }

  /* States */
  getStates(): State[] {
    return this.states;
  }

  addState(id: string, x: number, y: number, color: string, secondaryColor: string): void {
    let isInitial: boolean = this.states.length === 0;
    const newState: State = {
      id,
      x,
      y,
      // transitions: [],
      diameter: 80,
      color,
      secondaryColor,
      isInitial: isInitial,
      isFinal: false,
    }; // Mudar pra false

    if (isInitial) this.setInitialState(newState);

    this.states.push(newState);
  }

  deleteState(state: State): void {
    const index = this.states.findIndex((s) => s.id === state.id);
    if (index !== -1) {
      this.states.splice(index, 1);
    }

    // Att estado inicial
    if (state.isInitial) {
      this.setInitialState(null);
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

  addTransition(from: State, to: State, label: string, color: any, textColor: any): void {
    const newTransition: Transition = {
      from,
      to,
      label,
      height: 0,
      color,
      textColor,
    };
    this.transitions.push(newTransition);
  }

  deleteTransition(referenceState: State): void {
    // Your code for deleting transition can go here
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
      !possiveis_transicoes.find((transition) => transition.label === char)
    ) {
      return {
        isValidTransition: false,
        nextState: null,
      };
    } else {
      estado_atual = possiveis_transicoes.find(
        (transition) => transition.label === char
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
