export interface State {
    id: string;
    // label: string;

    // Rendering
    x: number;
    y: number;
    diameter: number;
    color: any;

    // Definição automato
    isInitial: boolean;
    isFinal: boolean;
    transitions: string[];
} 