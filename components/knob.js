import {
    html,
    MathX
} from "../script/utils.js";

/** @module knob */

/**
 * Szablon HTML definiujący strukturę oraz styl domyślny komponentu.
 */
const template = document.createElement('template')
template.innerHTML = html`
<style>
    :host {
        display: inline-block;
        background: #eee;
        border: 1px solid #888;
        border-radius: 50%;
        height: 32px;
        width: 32px;
        min-height: 32px;
        min-width: 32px;
        position: relative;
    }

    #knob {
        --root: 0deg;
        --angle: 0deg;
        height: 100%;
        width: 100%;
        border-radius: 50%;
        transform: rotate(calc(var(--angle) + var( --root)));
        will-change: transform;
    }

    #knob.rotating {
        background: #0001;
    }

    :host([positions]:not([sticky])) #knob.rotating {
        transition: transform 0.25s cubic-bezier(0.45, 0.9, 0.9, 1.20);
    }

    :host([positions])  #knob.syncing {
        transition: transform 0.25s cubic-bezier(0.45, 0.9, 0.9, 1.20);
    }

    #marker {
        background: #888;
        width: 2px;
        border-radius: 2px;
        height: 25%;
        margin: 0 auto;
        transform: translateY(4px);
    }

    #shine {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        width: 100%;
        border-radius: 50% 50%;
        background: linear-gradient(135deg,
            rgba(255,255,255,0.5) 0%,
            rgba(255,255,255,0) 50%,
            rgba(0,0,0,0.2) 100%
        );
    }
</style>
<div id="knob" part="knob">
    <slot>
        <div id="marker"></div>
    </slot>
</div>
<div id="shine" part="shine">
</div>
`

/**
 * Pokrętło - komponent reprezentuje pokrętło, które zapewnia interakcję poprzez obrót trzymając 
 * przycisk myszy, pokrętło obróci się w taki sposób, aby znacznik pokrętła wskazywał pozycję kursora. 
 * Bieżącą wartość można śledzić bezpośrednio poprzez właściwość `value` lub reaktywnie poprzez
 * zdarzenie `rotate`. Knob zakłada, że użytkownik będzie je obracać zgodnie z ruchem wskazówek 
 * zegara od wartości `min` do `max`.
 *
 * 1. Jakie urządzenie jest symulowane.
 *    Pokrętło można umieścić albo na enkoderze (tryb nieskończonego obrotu), 
 *    który może obracać się w nieskończoność, albo na potencjometrze (tryb ograniczonego obrotu) - 
 *    albo o mniejszym lub jednym obrocie, albo wieloobrotowym.
 *
 *    1. W „trybie enkodera” pokrętło może się swobodnie obracać, bez pozycji początkowej 
 *       i końcowej. W tym trybie `value` zostanie ustawiona pomiędzy `min` a `max`, 
 *       zawijając się od jednego ekstremum do drugiego podczas przejścia `from` kąta.
 *
 *    2. W „trybie potencjometru wieloobrotowego” pokrętło może wykonywać tylko zadany zakres 
 *       ruchu – `value` od `min` do `max` i zatrzymywać obrót poza tymi punktami.
 *       Pokrętło może wykonywać wiele obrotów, co koreluje z właściwością `lap`, która opisuje 
 *       „o ile `value` zmienia się przy każdym pełnym obrocie pokrętła".
 *
 *    3. W „trybie potencjometru jednoobrotowego” pokrętło może obracać się tylko pomiędzy 
 *       kątami `from` i `do`. W tym trybie można osiągnąć pełny obrót (`from === to`) 
 *       lub tylko jego część.
 *
 *
 * 2. Jaki "typ" urządzenia jest symulowany
 *    Pokrętło można umieścić albo na urządzeniu analogowym, które może się swobodnie obracać, 
 *    albo na urządzeniu dyskretnym, które może osiągać tylko określone kąty, 
 *    albo na urządzeniu cyfrowym, które obracając się jak analogowe, 
 *    nadal może osiągnąć tylko jedną z pozycji, do której zostanie przyciągnięte.
 *    
 *    1. Jako „typ analogowy” pokrętło może obracać się w dowolną możliwą pozycję, 
 *       zatem `value` może być dowolną liczbą rzeczywistą (zmiennoprzecinkową) 
 *       pomiędzy `min` i `max`.
 *
 *    2. Jako „typ dyskretny”, pokrętło może osiągać tylko wartości, które są przekazywane do 
 *       właściwości `positions` (atrybut jest oddzieloną przecinkami listą możliwych pozycji, 
 *       natomiast pole jest ich tablicą), zatem obrót pokrętła odbywa się tylko na granicach 
 *       pomiędzy dowolnymi dwoma sąsiednimi polami.
 *
 *    3. Jako „typ cyfrowy” pokrętło może nadal obracać się jak urządzenie analogowe, 
 *       gdy jest trzymane (podczas naciśnięcia myszy), ale gdy je puścisz, 
 *       powróci do najbliższej pozycji. W tym trybie zasadnicza `value`” zachowuje się 
 *       dokładnie tak, jak w przypadku typu dyskretnego, płynny obrót jest tylko wizualny.
 *
 * Dla każdego trybu/typu pokrętła możesz określić następujące właściwości:
 * - `from` - kąt początkowy w stopniach, w zakresie [0, 360); domyślnie wynosi 0,
 * - `min` - minimalna liczba, jaką może osiągnąć `value`; domyślnie wynosi 0,
 * - `value` - aktualna wartość, którą reprezentuje pokrętło; domyślnie jest to `min`,
 * - `max` - maksymalna liczba, jaką może osiągnąć `value`; domyślnie 360.
 * 
 * Pamiętaj, że musisz przestrzegać założenia: `min` <= `value` <= `max` 
 *      - w przeciwnym razie zostanie zwrócony błąd.
 * 
 * Dodatkowe właściwości definiują dokładne zachowanie pokrętła o tym priorytecie.
 * 
 * Dla trybów:
 * - `infinite` - jeśli atrybut jest obecny lub właściwość jest ustawiona na true, 
 *   pokrętło zawsze będzie zachowywać się w "trybie enkodera" - właściwości `lap` i `to`
 *   będą ignorowane nawet jeśli są obecne; 
 *   domyślnie jest ustawione na `null` (not truthy).
 * - `to` - w przypadku braku atrybutu `infinite` / ustawionego na false oraz ustawionego `to` 
 *   to pokrętło będzie zawsze zachowywać się w trybie "potencjometru jednoobrotowego" - 
 *   właściwość `lap` będzie ignorowana; 
 *   domyślnie ustawiona jest wartość `null`.
 * - `lap` - jeśli brakuje `infinite` (/ false) i `to` (`null`/`undefined`), to pokrętło będzie 
 *   zawsze zachowywać się w "trybie potencjometru jednoobrotowego"; 
 *   domyślnie jest to `max - min`.
 * 
 * Dla typów:
 * - `positions` - atrybut, jeśli jest ustawiony, musi być ustawiony na rozdzieloną przecinkami 
 *   listę unikalnych wartości, natomiast pole będzie reprezentowane jako tablica 
 *   tych wartości, w takim przypadku pokrętło będzie działać 
 *   albo jako „typ dyskretny” lub „typ cyfrowy”, w zależności od właściwości `sticky`; 
 *   domyślnie ustawiona jest wartość `null`.
 * - `sticky` - atrybut, jeśli występuje / pole ma wartość true, będzie określał „typ cyfrowy”, 
 *   w przeciwnym razie pokrętło będzie „typu dyskretnego”; 
 *   domyślnie ma wartość `null` (not truthy) i będzie ignorowana, jeśli brakuje `positions`.
 * 
 * W przypadku braku atrybutu `positions`, pokrętło jest `analog type`.
 *
 * ---
 * 
 * Jako komponent, `<x-knob>` zapewnia jeden `slot`, które zastępuje znacznik pokrętła (wiper), 
 * jeśli jest wypełniony; również dwie `part`s są określone on top of the `:host`:
 * - `:host` który się nie obraca, dolna część,
 * - `part=knob` czyli część obrotowa (w niej umieszczony jest slot),
 * - `part=shine`, czyli nieobrotowa warstwa nad `knob` 
 *   (może być używana do symulacji światła/cienia).
 * 
 * Przykłady użycia znaleźć można pod adresem {@link https://scheibig.github.io/Web-Components/knob/}
 */

class ComponentKnob extends HTMLElement {

    /**
     * Uchwyt do obracającej się części komponentu gałki.
     * @type {HTMLDivElement} 
     */
    #knob

    /**
     * Wewnętrzna wartość gałki - od zewnętrznej różni się tym, że w typie cyfrowym, wartość
     * wewnętrzna mapuje kąt obrotu gałki, podczas gdy wartość zewnętrzna reprezentuje najbliższą
     * pozycję.
     * @type {number} 
     */
    #value

    /**
     * Poprzedni kąt między "północą" pokrętła, środkiem pokrętła, a lokalizacją kursora myszy.
     * 
     * Wartość używana jest przy wyliczaniu zmian w pozycji pokrętła.
     * @type {number} 
     */
    #prevAngle

    /**
     * Obecna pozycja kursora myszy.
     * @type {Position} 
     */
    #cursor

    /** 
     * Flaga używana przez obsługę *Event*'ów do reprezentacji aktualnie obracanego pokrętła.
     * @type {boolean} 
     */
    #isRotating = false

    /** 
     * Cache używany do przechowywania globalnej obsługi *Event*'u menu kontekstowego, który
     * blokowany jest w trakcie obracania pokrętła.
     * 
     * @see Element#oncontextmenu
     */
    #windowContextMenuHandler

    /**
     * Getter definiujący listę automatycznie obserwowanych atrybutów komponentów, tj:
     * 
     * - `value`,
     * - `from`,
     * - `to`,
     * - `min`,
     * - `max`,
     * - `lap`,
     * - `positions`,
     * - `sticky`,
     * - `infinite`,
     * - `onrotate`.
     */
    static get observedAttributes() {
        return [
            "value", "from", "to", "min", "max", "lap", "positions", "sticky", "infinite", "onrotate"
        ]
    }

    /**
     * Właściwość klasy delegowana to *atrybutu HTML* `value` komponentu.
     * 
     * Reprezentuje zewnętrzną / postrzeganą wartość pokrętła - ta zawsze znajdować się będzie 
     * w zakresie `{@link min}..{@link max}`
     */
    get value() {
        return this.hasAttribute("value") ? parseFloat(this.getAttribute("value")) : this.min
    }
    set value(value) {
        this.setAttribute("value", parseFloat(value))
    }

    /**
     * Właściwość klasy delegowana to *atrybutu HTML* `from` komponentu.
     * 
     * Definiuje kąt początkowy od którego liczona jest wartość pokrętła; w trybie jednoobrotowym
     * dodatkowo definiuje początek ograniczonego zakresu obrotu pokrętła.
     * 
     * @default 0
     */
    get from() {
        let value = parseFloat(this.getAttribute("from"))
        if (value === 360) { value = 0 }
        return this.hasAttribute("from") ? value : 0
    }
    set from(value) {
        this.setAttribute("from", parseFloat(value))
    }

    /**
     * Właściwość klasy delegowana to *atrybutu HTML* `to` komponentu.
     * 
     * W trybie jednoobrotowym, definiuje koniec ograniczonego zakresu obrotu pokrętła.
     * 
     * @default null
     */
    get to() {
        let value = parseFloat(this.getAttribute("to"))
        if (value === 0) { value = 360 }
        return (this.hasAttribute("to") && this.infinite === false)
            ? value : null
    }
    set to(value) {
        this.setAttribute("to", value != null ? parseFloat(value) : null)
    }

    /**
     * Właściwość klasy delegowana to *atrybutu HTML* `min` komponentu.
     * 
     * Dolna granica zakresu wartości przyjmowanych przez pokrętło.
     * 
     * @default 0
     */
    get min() {
        return this.hasAttribute("min") ? parseFloat(this.getAttribute("min")) : 0
    }
    set min(value) {
        this.setAttribute("min", parseFloat(value))
    }

    /**
     * Właściwość klasy delegowana to *atrybutu HTML* `max` komponentu.
     * 
     * Górna granica zakresu wartości przyjmowanych przez pokrętło.
     * 
     * @default 360
     */
    get max() {
        return this.hasAttribute("max") ? parseFloat(this.getAttribute("max")) : 360
    }
    set max(value) {
        this.setAttribute("max", parseFloat(value))
    }

    /**
     * Właściwość klasy delegowana to *atrybutu HTML* `lap` komponentu.
     * 
     * W trybie potencjometru wieloobrotowego, atrybut ten definiuje jaki przyrost wartości
     * uzyskiwany jest na każdy pełny obrót pokrętła - a więc nie może przyjmować wartości
     * mniejszych niż różnica `max - min`; w pozostałych trybach, atrybut ten jest ignorowany, a 
     * jego wartość używana jest do przechowywania zmiennych pomocniczych przy obliczeniach - stąd
     * nie zalecane jest w takiej sytuacji używać jej bezpośrednio.
     */
    get lap() {
        let value = this.max - this.min
        if (this.to != null && !this.infinite) {
            // We are in single-turn mode - lap is ignored so we map it to angle range
            /** @type {number} */ let angle
            switch (true) {
                case this.from === 0 && this.to === 360:
                case this.from === this.to:
                    // Already mapped to one full rotation
                    angle = 360
                    break
                case this.from < this.to:
                    // Less than half of rotation - simple mapping
                    angle = this.to - this.from
                    break
                case this.to < this.from:
                    // More than half of rotation - treat `to` like its on next one
                    angle = this.to + 360 - this.from
                    break
            }
            value /= angle / 360
        }

        return (this.hasAttribute("lap") && this.infinite === false && this.to == null)
            ? parseFloat(this.getAttribute("lap")) : value
    }
    set lap(value) {
        this.setAttribute("lap", parseFloat(value))
    }

    /**
     * Właściwość klasy delegowana to *atrybutu HTML* `positions` komponentu.
     * 
     * Zawiera listę pozycji (`Array` jako właściwość, lista po przecinku jako atrybut) które może
     * przyjmować pokrętło (implikuje typ cyfrowy lub dyskretny); lista powinna zawierać wartości
     * unikalne, posortowane rosnąco oraz nie wykraczające poza zakres dozwolonych wartości.
     */
    get positions() {
        return this.hasAttribute("positions")
            ? this.getAttribute("positions")
                .split(",")
                .map(v => parseFloat(v))
            : null
    }
    set positions(value) {
        this.setAttribute("positions", value.join(","))
    }

    /**
     * Właściwość klasy delegowana to *atrybutu HTML* `sticky` komponentu.
     * 
     * Zmienia pokrętło dyskretne w pokrętło cyfrowe.
     */
    get sticky() {
        return (this.hasAttribute("sticky") && this.positions != null)
            && (
                this.getAttribute("sticky") === "true"
                || this.getAttribute("sticky") === ""
            )
    }
    set sticky(value) {
        if (value) { this.setAttribute("sticky") }
        else { this.removeAttribute("sticky") }
    }

    /**
     * Właściwość klasy delegowana to *atrybutu HTML* `infinite` komponentu.
     * 
     * Reprezentuje tryb enkodera.
     */
    get infinite() {
        return this.hasAttribute("infinite") && (
            this.getAttribute("infinite") === "true"
            || this.getAttribute("infinite") === ""
        )
    }
    set infinite(value) {
        if (value) { this.setAttribute("infinite") }
        else { this.removeAttribute("infinite") }
    }

    /**
     * Właściwość klasy delegowana to *atrybutu HTML* `onrotate` komponentu.
     * 
     * Definiuje obsługę *Event*'u zmiany wartości pokrętła; używanie atrybutu nie jest zalecane.
     */
    get onrotate() {
        return this.hasAttribute("onrotate") && this.getAttribute("onrotate")
    }
    set onrotate(value) {
        this.setAttribute("onrotate")
    }


    /**
     * Oblicza bezwzględną lokalizację środka pokrętła na ekranie monitora.
     * @type {Position}
     */
    get #location() {
        const r = this.getBoundingClientRect()
        return ({
            x: r.left + (r.width / 2),
            y: r.top + (r.height / 2)
        })
    }

    /**
     * Tworzy nowy *Element* reprezentujący ten komponent, tworzy *shadow DOM* używając 
     * *{@link template}*, oraz wykonuje stałe powiązanie metod klasy z jej instancją.
     */
    constructor() {
        super()
        this.attachShadow({ mode: "open" })
        this.shadowRoot.appendChild(template.content.cloneNode(true))

        this.#knob = this.shadowRoot.getElementById("knob")

        this.rotateBegin = this.rotateBegin.bind(this)
        this.rotateChange = this.rotateChange.bind(this)
        this.rotateEnd = this.rotateEnd.bind(this)
        this.mouseDownHandler = this.mouseDownHandler.bind(this)
        this.mouseMoveHandler = this.mouseMoveHandler.bind(this)
        this.mouseUpHandler = this.mouseUpHandler.bind(this)
        this.syncValueAngle = this.syncValueAngle.bind(this)
    }

    /**
     * Uchwyt cyklu życia komponentu, odpowiedzialny za obsługę zdarzenia, którym jest instalacja
     * komponentu w *DOM*.
     * 
     * Synchronizuje wartości początkowe pól wewnętrznych, oraz instaluje obsługę *Event*'ów myszy.
     */
    connectedCallback() {
        this.#value = this.value
        this.#knob.style.setProperty("--root", this.from + "deg")
        this.syncValueAngle()

        this.addEventListener("mousedown", this.mouseDownHandler)
    }

    /**
     * Uchwyt cyklu życia komponentu, odpowiedzialny za obsługę zdarzenia, którym jest usunięcie
     * komponentu w *DOM*.
     * 
     * Usuwa obsługę *Event*'ów myszy.
     */
    disconnectedCallback() {
        this.removeEventListener("mousedown", this.mouseDownHandler)
    }

    /**
     * Uchwyt cyklu życia komponentu, odpowiedzialny za obsługę zdarzenia, którym jest zmiana
     * wartości obserwowanego atrybutu komponentu.
     * 
     * Obsługa atrybutów:
     * 
     * -`positions`: parsuje i sprawdza poprawność listy przekazanych pozycji ,
     * - `min` / `max`: sprawdza poprawność definicji zakresu (`min <= max`),
     * - `from` / `to`: sprawdza czy kąty zawieraja się w podstawowym zakresie (`0..360`),
     * - `value`: jeśli pokrętło nie jest obecnie obracane, synchronizuje stan wewnętrzny do nowej
     *   wartości.
     * 
     * @param {string} name Nazwa zmienionego atrybutu
     * @param {string?} prev Tekstowa reprezentacja poprzedniej wartości przed zmianą
     * @param {string?} value Tekstowa reprezentacja nowej wartości
     */
    attributeChangedCallback(name, prev, value) {

        if (name === "positions" && value != null) {
            let values = value.split(",").map(v => parseFloat(v))
            let uniqueValues = values.filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b)

            if (values.length !== uniqueValues.length) {
                throw new Error(`positions [${value}] do not contain unique values`)
            }

            if (values.length < 2) {
                throw new Error(`positions [${value}] cannot contain less than two values`)
            }

            let arrEq = values.map((v, i) => v === uniqueValues[ i ])
                .reduce((p, c) => p && c)

            if (!arrEq || values.findIndex(v => isNaN(v)) !== -1) {
                throw new Error(`positions [${value}] is not ordered list of numbers`)
            }

            if (this.min > values.at(0) || values.at(-1) > this.max) {
                throw new Error(`positions [${value}] contain values `
                    + `outside of bounds '${this.min}'..'${this.max}'`)
            }
        }

        if (name === "min" || name === "max") {
            if (this.min > this.max) {
                throw new Error(`value '${value}' is outside of `
                    + `bounds '${this.min}'..'${this.max}'`)
            }
        }

        if (name === "from" || name === "to") {
            if (0 > this.from || this.from > 360
                || 0 > this.to || this.to > 360) {
                throw new Error(`angles from ('${this.from}') and to ('${this.to}')`
                    + `must be in bounds '0' .. '360'`)
            }

            if (name === "from") {
                this.#knob.style.setProperty("--root", this.from + "deg")
            }
        }

        if (name === "value" && !this.#isRotating) {
            this.#value = this.value
            this.syncValueAngle()
        }
    }

    /**
     * Obsługa *Event*'u wciśnięcia lewego klawisza myszy na pokrętle.
     * 
     * Inicjalizuje obliczenia i wprowadza pokrętło w tryb obrotu; instaluje globalną obsługę
     * Event*'ów na potrzeby wykrywania pozycji kursora.
     * 
     * @param {MouseEvent} e Stan zdarzenia
     * 
     * @see rotateBegin
     */
    mouseDownHandler(e) {
        e.preventDefault()
        if (e.button != 0) { return; }
        this.#cursor = {
            x: e.clientX,
            y: e.clientY
        }
        this.rotateBegin()
        document.addEventListener("mousemove", this.mouseMoveHandler)
        document.addEventListener("mouseup", this.mouseUpHandler)
    }

    /**
     * Obsługa *Event*'u poruszania kursorem w trakcie trzymania lewego klawisza myszy na pokrętle.
     * 
     * Oblicza nową pozycję pokrętła, na podstawie zmiany położenia kursora - wskaźnik pozycji
     * potencjometru stara się "celować w kursor".
     * 
     * @param {MouseEvent} e Stan zdarzenia
     * 
     * @see rotateChange
     */
    mouseMoveHandler(e) {
        e.preventDefault()
        if (e.button != 0) { return; }
        this.#cursor = {
            x: e.clientX,
            y: e.clientY
        }
        this.rotateChange()
    }

    /**
     * Obsługa *Event*'u puszczenia lewego klawisza myszy po obracaniu pokrętła.
     * 
     * Wyprowadza pokrętło z trybu obrotu, jak i usuwa globalną obsługę *Event*'ów.
     * 
     * @param {MouseEvent} e Stan zdarzenia
     * 
     * @see rotateEnd
     */
    mouseUpHandler(e) {
        e.preventDefault()
        if (e.button != 0) { return; }
        document.removeEventListener("mousemove", this.mouseMoveHandler)
        document.removeEventListener("mouseup", this.mouseUpHandler)
        this.rotateEnd()
    }

    /**
     * Ustawia stan początkowy zmiennych obliczeniowych, używanych do obliczania pozycji pokrętła, 
     * jak i ustawia niezbędne flagi stanu oraz zmienia style CSS na te charakteryzujące obracane 
     * pokrętło.
     * 
     * Tymczasowo zdejmuje globalną obsługę *Event*'u `contextmenuhandler`, przechowując jej stan
     * wewnątrz obiektu.
     * 
     * @see #windowContextMenuHandler
     */
    rotateBegin() {
        // Remove contextmenu handler to safe location - menu can interfere with rotation handling,
        //   so install handler that ignores such request
        this.#windowContextMenuHandler = window.oncontextmenu
        window.oncontextmenu = () => false

        // Set initial angle of line drawn between cursor and middle of knob, to "north"
        const loc = this.#location
        const cur = this.#cursor
        this.#prevAngle = MathX.mod(Math.atan2(
            loc.y - cur.y,
            loc.x - cur.x,
        ) + (3 / 4 * MathX.PI2), MathX.PI2) * 360 / MathX.PI2

        // Indicate rotation (sets up animations and disables handling value change in lifecycle
        //   hook - otherwise infinite recursion is inevitable)
        this.#isRotating = true
        this.#knob.classList.add("rotating")
    }

    /**
     * Oblicza zmiany w wartościach zewnętrznych, jak i wewnętrznych pokrętła, w szczególności
     * ustawiając zewnętrzną wartość pokrętła na najbliższą pozycję (typ cyfrowy / dyskretny).
     * 
     * Po synchronizacji kąta obrotu, wysyła *Event* informujący o zmianie wartości pokrętła.
     * 
     * @see KnobValueChangeEvent
     * @see syncValueAngle
     */
    rotateChange() {
        // Get current angle - this and previous angle acquisition gets angle as clockwise with
        //   value 0 on "north"
        const loc = this.#location
        const cur = this.#cursor
        let angle = MathX.mod(Math.atan2(
            loc.y - cur.y,
            loc.x - cur.x,
        ) + (3 / 4 * MathX.PI2), MathX.PI2) * 360 / MathX.PI2

        let prevAngle = this.#prevAngle

        // Calculate change in angle with relation to previous tick
        //   From that calculate change in value
        /** @type {number} */ let deltaValue
        if (prevAngle > 270 && angle < 90) {
            // Wrap clock-wise - next angle treat as over 360
            let deltaAngle = angle + 360 - prevAngle
            deltaValue = deltaAngle / 360 * this.lap
        } else if (prevAngle < 90 && angle > 270) {
            // Wrap counter clock-wise - previous angle treat as over 360
            let deltaAngle = angle - prevAngle - 360
            deltaValue = deltaAngle / 360 * this.lap
        } else {
            // Normal turn - nothing
            let deltaAngle = angle - prevAngle
            deltaValue = deltaAngle / 360 * this.lap
        }
        this.#value += deltaValue

        // Potentiometers are not allowed to move internal value out of bounds
        if (!this.infinite) {
            this.#value = MathX.clip(this.min, this.#value, this.max)
            if (this.positions) {
                // Non analog - sync external value, will move to position later
                this.value = this.#value
            }
        }

        if (!this.positions) {
            // Analog device - sync internal value immediately
            this.value = this.#value
            if (this.infinite) {
                // Encoder - move value to within bounds
                this.value = MathX.mod(this.value - this.min, this.lap) + this.min
            }
        } else {
            // Non-analog device - move value to nearest position

            const pos = this.positions.slice().map(v => [ v, v ])
            if (this.infinite) {
                // Encoder - move set value to within bounds
                this.value = MathX.mod(this.#value - this.min, this.lap) + this.min
                // Add dummy positions for outside of bounds - they represent additional positions
                //   on same angles as first and last position, but on next / previous rotation
                pos.unshift([
                    (this.positions.at(-1) - this.min) - this.lap + this.min
                    , this.positions.at(-1)
                ])
                pos.push([
                    this.lap + this.positions.at(0),
                    this.positions.at(0)
                ])
            }
            // Find nearest position and move external value to it
            const nearestPosition = pos
                .map(v => [ Math.abs(v[ 0 ] - this.value), v[ 0 ], v[ 1 ] ])
                .sort((a, b) => a[ 0 ] - b[ 0 ])[ 0 ][ 2 ]
            this.value = nearestPosition
        }

        // Issue synchronization of visual rotation with value and cache current angle for next tick
        this.syncValueAngle()
        this.#prevAngle = angle

        // Create and dispatch event
        // TODO -> don't dispatch, if discrete (and maybe digital) knob didn't change position
        const e = new KnobValueChangeEvent(this.value)
        if (this.onrotate !== null && this.onrotate !== false) {
            let f = eval(this.onrotate)
            if (typeof f === "function") { f(e) }
        }
        this.dispatchEvent(e)
    }

    /**
     * Kończy obracanie pokrętła, przywracając stan wyjściowy.
     * 
     * W trybach cyfrowym i dyskretnym przeprowadzana jest synchronizacja kąta (oraz mapującej go
     * wartości wewnętrznej obiektu) z powrotem do zakresu `0..<360` stopni.
     * 
     * W trybie cyfrowym, synchronizacja jest przeprowadzana z zachowaniem "magnetycznej" animacji.
     */
    async rotateEnd() {
        // Restore contextmenu listener
        window.oncontextmenu = this.#windowContextMenuHandler
        // Signal that rotation isn't taking place anymore
        this.#isRotating = false
        this.#knob.classList.remove("rotating")

        // Non-analog devices might need angle and value correction
        if (this.positions) {
            // Sticky knobs have to move to position after letting go of knob
            if (this.sticky) {
                // Install async event listener, that waits for end of rotation transition
                const transitionFinished = new Promise(res => {
                    /** @type {function(TransitionEvent): void} */
                    const handler = e => {
                        if (e.target !== this.#knob || e.propertyName !== "transform") { return }
                        this.#knob.removeEventListener("transitionend", handler)
                        this.#knob.classList.remove("syncing")
                        res()
                    }
                    this.#knob.addEventListener("transitionend", handler)
                })
                // Add class that transitions angle rotation
                this.#knob.classList.add("syncing")

                // Calculate and set angle to nearest position
                let val = this.#value
                if (this.infinite) {
                    const offset = MathX.mod(this.#value - this.min, this.lap) + this.min
                    const overflow = this.#value - offset
                    val = overflow + this.value
                    // Math fixes
                    let w = MathX.mod(this.#value - this.min, this.lap) + this.min
                    if (this.value == this.min
                        && w > (this.min)
                        && w < (this.lap / 4 + this.min)
                    ) {
                        val += this.lap
                    }
                    if (this.value == this.min
                        && w < (this.lap + this.min)
                        && w > (this.lap * 3 / 4 + this.min)
                    ) {
                        val += this.lap
                    }
                    if (this.value == this.min
                        && w > (this.min)
                        && w < (this.lap / 4 + this.min)
                    ) {
                        val -= this.lap
                    }
                    if (this.value == this.min
                        && w > (this.lap + this.min)
                        && w < (this.lap * 5 / 4 + this.min)
                    ) {
                        val -= this.lap
                    }
                } else {
                    val = this.value
                }
                const rotAngle = (val - this.min) / this.lap * 360
                this.#knob.style.setProperty("--angle", rotAngle + "deg")

                // Wait for end of transition before proceeding
                await transitionFinished
            }

            // Encoders need to return into bound values
            if (this.infinite) {
                let angle = parseFloat(this.#knob.style.getPropertyValue("--angle").slice(0, -3))
                this.#knob.style.setProperty("--angle", MathX.mod(angle, 360) + "deg")
                // External value will be already proper one - sync internal
                this.#value = this.value
            }
        }
    }

    /**
     * Synchronizuje kąt obrotu pokrętła z wartością pokrętła, przez ustawienia zmiennej CSS.
     */
    syncValueAngle() {
        if (!this.positions) {
            // Analog type
            const rotAngle = (this.value - this.min) / this.lap * 360
            this.#knob.style.setProperty("--angle", rotAngle + "deg")
        } else {
            // Non-analog type - base angle off #value, sync will perform after dropping knob
            let val = this.#value
            if (!this.sticky) {
                if (this.infinite) {
                    const offset = MathX.mod(this.#value - this.min, this.lap) + this.min
                    const overflow = this.#value - offset
                    val = overflow + this.value
                } else {
                    val = this.value
                }
            }

            const rotAngle = (val - this.min) / this.lap * 360
            this.#knob.style.setProperty("--angle", rotAngle + "deg")
        }
    }
}
customElements.define("x-knob", ComponentKnob)

/**
 * *Event* reprezentujący zmianę wartości pokrętła.
 */
class KnobValueChangeEvent extends Event {
    /**
     * Wartość pokrętła.
     * @type {number} 
     */
    value

    /**
     * Tworzy *Event*, inicjalizując go z identyfikatorem `"knobValueChange"`.
     * @param {number} value Wartość pokrętła
     */
    constructor(value) {
        super("knobValueChange", { bubbles: true })
        this.value = value
    }
}

/**
 * Klasa reprezentująca pozycję w osi współrzędnych 2D.
 */
class Position {
    /** @type {number} */ x
    /** @type {number} */ y
}


export default ComponentKnob
export {
    KnobValueChangeEvent
}
