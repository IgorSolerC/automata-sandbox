export enum AutomataInputResults {
    ACCEPTED = 1,
    REJECTED,
    WARNING,
}

export enum AutomataInputMessages {
    NAO_DETERMINISMO,
    SEM_ESTADO_INICIAL,
    SEM_ESTADO_FINAL,
    TRANSICAO_INVALIDA,
}