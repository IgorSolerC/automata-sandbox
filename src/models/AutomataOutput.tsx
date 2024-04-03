import { AutomataInputResultsEnum } from "../enums/AutomataInputEnum";

export interface AutomataOutput {
    input: string,
    result: AutomataInputResultsEnum,
    message: string,
} 
