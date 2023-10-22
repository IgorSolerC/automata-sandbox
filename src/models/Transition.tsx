import { State } from "./State";

// Definition transition
export interface Transition {
    from: State;
    to: State;
    label: string;
    height: number;
}
