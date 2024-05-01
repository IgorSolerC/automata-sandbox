import { Automata } from "./Automata"; // Assuming these are your class imports
import { State } from "./State";
import { Transition } from "./Transition";

export class DFAConverter {
    // private nfa: Automata;
    // private dfa: Automata;

    // constructor(nfa: Automata) {
    //     this.nfa = nfa;
    //     this.dfa = new Automata(); // Initialize with empty DFA
    //     this.initializeDFA();
    //     console.log("1")
    //     this.addTransitionsToDFA(); // Step 2: Add transitions based on NFA transitions
    //     console.log("2")
    //     // this.removeUnreachableStates(); // Step 3: Remove unreachable states from the DFA
    //     console.log("3")
    //     // this.mergeRedundantStates(); // Step 4: Merge redundant states to minimize the DFA
    //     console.log("4")        
    // }

    // // private initializeDFA() {
    // //     // Generate the powerset of NFA states
    // //     const powerset = this.getPowerset(this.nfa.states);
    // //     // Each subset of the powerset is a state in the DFA
    // //     let idCounter = 0;
    // //     for (const set of powerset) {
            
    // //         const newState = { 
    // //             id: `s${idCounter}`, 
    // //             label: set.map(state => state.label).join(","), 
    // //             x: 0 + 200 * (idCounter - 1), 
    // //             y: 0, 
    // //             diameter: 80, 
    // //             color: 'blue', 
    // //             secondaryColor: 'lightblue', 
    // //             isInitial: set.some(state => state.isInitial), 
    // //             isFinal: set.some(state => state.isFinal) 
    // //           }!;
    // //         // newState.label = set.map(state => state.label).join(",");
    // //         // newState.isInitial = set.some(state => state.isInitial);
    // //         // newState.isFinal = set.some(state => state.isFinal);
    // //         this.dfa.states.push(newState);
    // //         idCounter++;
    // //         // More initialization as needed
    // //     }
    // //     // Set initial and final states for the DFA
    // //     this.dfa.initialState = this.dfa.states.find(state => state.isInitial)!;
    // //     this.dfa.finalStates = this.dfa.states.filter(state => state.isFinal);
    // //     // Initialize transitions later
    // // }

    // // private getPowerset(states: State[]): State[][] {
    // //     const powerset: State[][] = [];
    // //     const total = Math.pow(2, states.length);
    // //     for (let i = 0; i < total; i++) {
    // //         const subset: State[] = [];
    // //         for (let j = 0; j < states.length; j++) {
    // //             if (i & (1 << j)) {
    // //                 subset.push(states[j]);
    // //             }
    // //         }
    // //         if (subset.length > 0) {
    // //             powerset.push(subset);
    // //         }
    // //     }
    // //     return powerset;
    // // }

    // // private addTransitionsToDFA() {
    // //     const alphabet = this.nfa.getAlphabet(); // Assuming there's a method to get the alphabet
    // //     for (const dfaState of this.dfa.states) {
    // //         const nfaStates = dfaState.label.split(","); // Split the label to get individual NFA states
    // //         for (const symbol of alphabet) {
    // //             let nextStateLabels = new Set<string>();
    // //             for (const nfaStateLabel of nfaStates) {
    // //                 const nfaState = this.nfa.states.find(state => state.label === nfaStateLabel);
    // //                 const transitions = this.nfa.transitions.filter(t => t.from === nfaState && t.label.includes(symbol));
    // //                 for (const transition of transitions) {
    // //                     nextStateLabels.add(transition.to.label);
    // //                 }
    // //             }
    // //             const nextState = this.dfa.states.find(state => state.label === Array.from(nextStateLabels).join(","));
    // //             if (nextState) {
    // //                 this.dfa.transitions.push(new Transition(dfaState, nextState, [symbol], 0, 'black', 'white'));
    // //             }
    // //         }
    // //     }
    // // }

    // // private removeUnreachableStates() {
    // //     const reachableStates = new Set<State>();
    // //     const exploreStates = [this.dfa.initialState];
    
    // //     // Use a simple BFS to find all reachable states
    // //     while (exploreStates.length > 0) {
    // //         const currentState = exploreStates.shift()!;
    // //         reachableStates.add(currentState);
    
    // //         this.dfa.transitions.forEach(transition => {
    // //             if (transition.from === currentState && !reachableStates.has(transition.to)) {
    // //                 exploreStates.push(transition.to);
    // //             }
    // //         });
    // //     }
    
    // //     // Filter out unreachable states from the DFA's state list
    // //     this.dfa.states = this.dfa.states.filter(state => reachableStates.has(state));
    // //     // Also remove transitions that involve unreachable states
    // //     this.dfa.transitions = this.dfa.transitions.filter(transition => reachableStates.has(transition.from) && reachableStates.has(transition.to));
    // // }

    // // private mergeRedundantStates() {
    // //     // This is a complex operation that often involves creating an equivalence table
    // //     let change = true;
    // //     while (change) {
    // //         change = false;
    // //         const statePairs = new Map<string, State>();
    
    // //         for (const state1 of this.dfa.states) {
    // //             for (const state2 of this.dfa.states) {
    // //                 if (state1 !== state2 && this.areEquivalent(state1, state2)) {
    // //                     statePairs.set(state1.label + "," + state2.label, state2);
    // //                     change = true;
    // //                     break;
    // //                 }
    // //             }
    // //             if (change) break;
    // //         }
    
    // //         // Merging states based on the equivalence found
    // //         statePairs.forEach((stateTo, stateFromLabel) => {
    // //             this.mergeStates(stateFromLabel, stateTo);
    // //         });
    // //     }
    // // }
    
    // // private initializeEquivalenceTable(states: State[]): boolean[][] {
    // //     const numStates = states.length;
    // //     const table = Array.from({ length: numStates }, () => Array(numStates).fill(false));
    
    // //     // Initially mark accepting and non-accepting states as non-equivalent
    // //     for (let i = 0; i < numStates; i++) {
    // //         for (let j = i + 1; j < numStates; j++) {
    // //             if (states[i].isFinal !== states[j].isFinal) {
    // //                 table[i][j] = true; // True means they are not equivalent (distinguished)
    // //             }
    // //         }
    // //     }
    // //     return table;
    // // }
    
    // // private areEquivalent(state1: State, state2: State): boolean {
    // //     const states = this.dfa.states;
    // //     const table = this.initializeEquivalenceTable(states);
    // //     let change = true;
    
    // //     // Refine the table until no further changes
    // //     while (change) {
    // //         change = false;
    // //         for (let i = 0; i < states.length; i++) {
    // //             for (let j = i + 1; j < states.length; j++) {
    // //                 if (!table[i][j]) { // If states are not already marked as non-equivalent
    // //                     for (const symbol of this.nfa.getAlphabet()) {
    // //                         const nextState1 = this.getNextState(states[i], symbol);
    // //                         const nextState2 = this.getNextState(states[j], symbol);
    
    // //                         // Handle potential null values safely
    // //                         if (nextState1 === null || nextState2 === null) {
    // //                             if (nextState1 !== nextState2) {
    // //                                 table[i][j] = true; // Different because one transitions to null and the other does not
    // //                                 change = true;
    // //                                 break;
    // //                             }
    // //                         } else {
    // //                             const index1 = states.indexOf(nextState1);
    // //                             const index2 = states.indexOf(nextState2);
    // //                             if (table[index1][index2]) {
    // //                                 table[i][j] = true;
    // //                                 change = true;
    // //                                 break; // No need to check further symbols if states are distinguished
    // //                             }
    // //                         }
    // //                     }
    // //                 }
    // //             }
    // //         }
    // //     }
    
    // //     // Finally, return whether the two specific states are equivalent
    // //     const index1 = states.indexOf(state1);
    // //     const index2 = states.indexOf(state2);
    // //     return !table[index1][index2]; // If table entry is false, states are equivalent
    // // }
    
    // // private getNextState(state: State, symbol: string): State | null {
    // //     const transition = this.dfa.transitions.find(t => t.from === state && t.label.includes(symbol));
    // //     return transition ? transition.to : null; // Return null if no transition exists
    // // }
    
    // // private mergeStates(stateFromLabel: string, stateTo: State) {
    // //     // Merge transitions and update states
    // //     this.dfa.states = this.dfa.states.filter(state => state.label !== stateFromLabel);
    // //     this.dfa.transitions.forEach(transition => {
    // //         if (transition.from.label === stateFromLabel) {
    // //             transition.from = stateTo;
    // //         }
    // //         if (transition.to.label === stateFromLabel) {
    // //             transition.to = stateTo;
    // //         }
    // //     });
    // // }
    
    // // public getDFA(): Automata {
    // //     return this.dfa;
    // // }
}
