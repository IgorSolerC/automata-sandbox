import { State } from "./State";

export class Transition {
    from: State;
    to: State;
    label: string[];
    height: number;
    color: any;
    textColor: any;

    constructor(from: State, to: State, label: string[], height: number, color: any, textColor: any) {
        this.from = from;
        this.to = to;
        this.label = label;
        this.height = height;
        this.color = color;
        this.textColor = textColor;
    }
}
