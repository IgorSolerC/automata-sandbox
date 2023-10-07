class Automato {
    constructor(estados, alfabeto, estado_inicial, estados_finais, transicoes) {
        /*
            Definição de um Automato
            (Q, Σ, δ, q0, F)

            Q  = Estados
            Σ  = Alfabeto
            δ  = Transições
            q0 = Estado inicial
            F  = Estados finais
        */
        this.estados = estados;
        this.alfabeto = alfabeto;
        this.estado_inicial = estado_inicial;
        this.estados_finais = estados_finais;
        this.transicoes = transicoes;
    }

    validate(input_str) {
        const NAO_ACEITO = false;
        const ACEITO = true;

        // Checa se existe algum char fora do alfabeto
        const tem_char_fora_do_alfabeto = [...input_str].some(char => !this.alfabeto.includes(char));
        if (tem_char_fora_do_alfabeto) {
            // * Talvez seja uma boa levantar um erro aqui, visto
            //   um automato nunca deveria lidar com um char fora
            //   do seu alfabeto
            return NAO_ACEITO;
        }

        // Simula automato
        let estado_atual = this.estado_inicial;
        const i_ultimo_char = input_str.length - 1;
        for (let i = 0; i < input_str.length; i++) {
            const char = input_str[i];
            const possiveis_transicoes = this.transicoes[estado_atual];

            // Checa se o estado atual possui uma transicao para o char atual
            if (!possiveis_transicoes || !possiveis_transicoes[char]) {
                return NAO_ACEITO;
            } else {
                estado_atual = possiveis_transicoes[char];
            }

            // Se for o último char, checa se terminou um estado final
            const eh_ultimo_char = i === i_ultimo_char;
            if (eh_ultimo_char) {
                if (this.estados_finais.includes(estado_atual)) {
                    return ACEITO;
                } else {
                    return NAO_ACEITO;
                }
            }
        }
    }
}

// Exemplo: Binario que começa com 1 e termina com 0
const estados = ['q0', 'q1', 'q2'];
const alfabeto = ['1', '0'];
const estado_inicial = "q0";
const estados_finais = ['q2'];
const transicoes = {
    'q0': {
        '1': 'q1'
    },
    'q1': {
        '0': 'q1',
        '1': 'q2'
    },
    'q2': {
        '0': 'q2',
        '1': 'q1'
    }
};

const afd = new Automato(estados, alfabeto, estado_inicial, estados_finais, transicoes);

// Testa automato criado
console.log(afd.validate("1010"));
