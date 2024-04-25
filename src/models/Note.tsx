export interface Note {
    id: number;
    text: string;

    // Rendering
    x: number;
    y: number;
    width: number;
    height: number;
    textLines: string[];
    textSize: number;

    color: any;
    secondaryColor: any;

} 
