/**
 * Funkcja typu *`tagged template literal`*, realizująca tworzenie prawie-bezpiecznych szablonów
 * kodu HTML.
 * 
 * Zapewnia podmianę znaków `<` oraz `>` poza bezpośrednimi i prostymi lokalizacjami argumentów
 * atrybutów, ale głównym celem funkcji jest zmuszenie *LSP-C* do uruchomienia kolorowania składni
 * wewnątrz przekazanego tekstu.
 * 
 * @param {TemplateStringsArray} strings Lista przekazanych literałów
 * @param  {...string} values Lista interpolowanych wartości
 * @returns {string} Przetworzony tekst szablonu HTML
 */
function html(strings, ...values) {
    /** @type {string[]} */
    const ret = []
    
    for (let i = 0; i < values.length; i++) {
        let p = strings[ i ]
        let c = values[ i ]
        let n = strings[ i + 1 ]
        
        let pLast = p.trim().at(-1)
        let nFirst = n.trim().at(0)

        if (pLast === nFirst
            && pLast === "\"" || pLast == "'") {
            // Inside attribute 
            ret.push(p)
            ret.push(c)
        } else {
            // Elsewhere
            ret.push(p)
            ret.push(
                c.replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
            )
        }
    }

    ret.push(strings.at(-1))

    return ret.join("")
}


/**
 * Rozszerzenia zawierające potrzebne (a brakujące w bibliotece standardowej) funkcje matematyczne.
 * @namespace MathX
 */
const MathX = {
    /**
     * Operator modulo `n % d` (prawidłowe modulo, w przeciwieństwie do funkcjonalności reszty
     * z dzielenia domyślnie w JavaScript).
     * @param {number} n Wartość
     * @param {number} d Dzielnik
     * @returns {number} Wynik operacji `Wartość` modulo `Dzielnik`
     */
    mod(n, d) {
        return ((n % d) + d) % d;
    },

    /**
     * Przycina (operacja winsoryzacji do wartości) wartość do przekazanego zakresu
     * @param {number} min Dolna wartość zakresu
     * @param {number} val Wartość przycinana
     * @param {number} max Górna wartość zakresu
     * @returns {number} `val`, `min` jeśli `val < min`, lub  `max` jeśli `val > max`
     */
    clip(min, val, max) {
        return Math.min(
            Math.max(
                min,
                val
            ),
            max
        )
    },

    /** PI * 2  */
    PI2: Math.PI * 2
}
Object.freeze(MathX)

export {
    html,
    MathX
}
