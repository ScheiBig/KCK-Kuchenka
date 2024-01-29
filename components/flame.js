/** @module flame  */

/**
 * Tworzony element ustawiany ma od razu odpowiednią klasę CSS do renderowania wyglądu płomienia,
 * jak i przypisaną mu zmienną CSS która kontroluje obrót płomienia względem środka palnika.
 * @param {number} deg Wyrażony w stopniach kąt obrotu
 * @returns Utworzony element (`<div>`), który można wstawić do *DOM*
 */
function flame(deg) {
    let e = document.createElement("div")
    e.className = "flame"
    e.style.setProperty("--r", `${deg}deg`)
    return e
}

/**
 * Klasa definiująca komponent, który reprezentuje płomienie palnika gazowego.
 * 
 * Płomienie opakowane są jako komponent, ze względu na dość dużą ilość pojedynczych 
 * płomieni wydostających się z palnika - ich tworzenie oraz dodawanie jest procesem żmudnym, 
 * który wewnątrz komponentu można zawrzeć w pętli `for`.
 * 
 * W arkuszu styli, dodatkowo używana jest jeszcze jedna zmienna, która odpowiada za 
 * "wysuwanie płomieni spod palnika" - jest to zmienna CSS `--show` z zakresem `0..1`. Warto
 * nadmienić że zachowanie to nie jest zdefiniowane w tym komponencie, a w arkuszu styli (ten
 * komponent nie definiuje *shadow dom*, co oznacza że elementy są dostępne z zewnątrz).
 * 
 * @example
 * <!-- Tworzy płomienie pod palnikiem z 24 dyszami -->
 * <x-flame times="24" style="--show: 1;"></x-flame>
 */
class ComponentFlame extends HTMLElement {

    /**
     * Właściwość klasy delegowana to *atrybutu HTML* `times` komponentu.
     * 
     * Reprezentuje liczbę płomieni wydostających się z palnika gazowego (liczbę dysz palnika).
     */
    get times() {
        return this.hasAttribute("times") ? parseInt(this.getAttribute("times")) : null
    }
    set times(value) {
        this.setAttribute("times", parseInt(value))
    }

    /**
     * Getter definiujący listę automatycznie obserwowanych atrybutów komponentów, tj:
     * 
     * - `times`
     */
    static get observedAttributes() {
        return [ "times" ]
    }

    /**
     * Konstruktor domyślny - deleguje tworzenie elementu HTML do klasy nadrzędnej; żadne dodatkowe
     * zachowanie nie jest zdefiniowane.
     */
    constructor() {
        super()
    }

    /**
     * Uchwyt cyklu życia komponentu, odpowiedzialny za obsługę zdarzenia, którym jest zmiana
     * wartości obserwowanego atrybutu komponentu.
     * 
     * Obsługa atrybutów:
     * 
     * -`times`: przy zmianie usuwa poprzednią zawartość komponentu i tworzy nowy zestaw płomieni,
     *  w ilości zdefiniowanej przez atrybut.
     *  **UWAGA** - ze względu na prymitywność komponentu, nie wykonywane jest "sprzątanie"
     * (odpinanie obsługi *Event*'ów itp.).
     * 
     * @param {string} name Nazwa zmienionego atrybutu
     * @param {string?} prev Tekstowa reprezentacja poprzedniej wartości przed zmianą
     * @param {string?} value Tekstowa reprezentacja nowej wartości
     */
    attributeChangedCallback(name, prev, value) {
        if (name != "times") { return }
        if (prev === value) { return }

        const times = this.times
        this.innerHTML = ""
        const degDiff = 360.0 / times

        for (let i = 0; i < times; i++) {
            this.appendChild(flame(degDiff * i))
        }
    }
}
customElements.define("x-flame", ComponentFlame)

export default ComponentFlame
