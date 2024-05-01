export class State {
    id: string;
    label: string;
    x: number;
    y: number;
    diameter: number;
    color: any;
    secondaryColor: any;
    isInitial: boolean;
    isFinal: boolean;
    targetX: number;
    targetY: number;
    isAnimating: boolean;

    constructor(
        id: string,
        label: string,
        x: number,
        y: number,
        diameter: number,
        color: any,
        secondaryColor: any,
        isInitial: boolean,
        isFinal: boolean,
        targetX: number,
        targetY: number,
        isAnimating: boolean
    ) {
        this.id = id;
        this.label = label;
        this.x = x;
        this.y = y;
        this.diameter = diameter;
        this.color = color;
        this.secondaryColor = secondaryColor;
        this.isInitial = isInitial;
        this.isFinal = isFinal;
        this.targetX = targetX;
        this.targetY = targetY;
        this.isAnimating = isAnimating;
    }
}
