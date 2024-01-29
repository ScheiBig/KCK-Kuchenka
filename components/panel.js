import { MathX, html } from "../script/utils.js"

/** @module panel */

/**
 * Szablon HTML definiujący strukturę oraz styl domyślny komponentu.
 */
const template = document.createElement("template")
template.innerHTML = html`
<style>
:host {
    display: block;
    height: 60px;
    width: 116px;
    color: #f3be5b;
}

@keyframes blink {
    0% {
        color: #f3be5bff;
    }
    
    50% {
        color: #f3be5b44;
    }
    
    100% {
        color: #f3be5bff;
    }
}

[part="display"] {
    height: 32px;
    background: #200;
    margin-bottom: 2px;
    border-radius: 4px;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: repeat(2, 1fr);
    justify-items: center;
    align-items: center;
    font-family: "Segmental";

    & #time {
        grid-row-end: span 2;
        font-size: 22px;
        line-height: 24px;
        height: 24px;
        justify-self: end;
        position: relative;
        white-space: pre;

        &.blink {
            animation: blink 1000ms infinite linear;
        }
        
        &::before {
            content: "## ##";
            position: absolute;
            bottom: 0px;
            color: #321;
            white-space: nowrap;
        }

        & span {
            position: relative;
        }
    }

    & #line1,
    & #line2 {
        font-size: 12px;
        position: relative;
        color: #321;

        &::before {
            content: attr(data-value);
            position: absolute;
            bottom: 0;
            right: 0;
            color: #f3be5b;
            white-space: nowrap;
            white-space: pre;
        }

        &.blink::before {
            animation: blink 1000ms infinite linear;
        }
    }
}

[part="labels"] {
    width: 100%;
    display: flex;
    justify-content: space-around;
    align-items: center;
    color: #222;
    font-size: 12px;
    line-height: 14px;
    font-family: 'Varela Round', sans-serif;
}

[part="buttons"] {
    width: 100%;
    display: flex;
    justify-content: space-evenly;
    align-items: center;
}

button {
    all: unset;
    height: 12px;
    width: 38px;
    border-radius: 2px;
    box-sizing: border-box;
    border: 1px solid #888;
    background: linear-gradient(135deg,
        rgba(255,255,255,0.5) 0%,
        rgba(255,255,255,0) 50%,
        rgba(0,0,0,0.2) 100%
    ),
    linear-gradient(#eee, #eee);

    &:active::after {
        content: "";
        display: block;
        border-radius: 2px;
        height: 100%;
        width: 100%;
        background: #0001;
    }
}

</style>
<div part="display">
    <div id="time"><span id="hour">xx</span>:<span id="minute">xx</span></div>
    <div id="line1">#######</div>
    <div id="line2">#######</div>
</div>
<div part="labels">
    <div>-</div>
    <div>f</div>
    <div>+</div>
</div>
<div part="buttons">
    <button type="button" id="minus"></button>
    <button type="button" id="function"></button>
    <button type="button" id="plus"></button>
</div>
`
/**
 * Dźwięk "pikania" klawiszy piekarnika w przypadku gdy wciśnięcie powoduje jakąś zmianę.
 */
const beep = new Audio("../resources/Button Beep Sound Effect.mp3")

/**
 * Dźwięk dzwonka (a'la minutnik kuchenny) używany przy zakończeniu pieczenia.
 */
const ring = new Audio("../resources/toaster oven ding  sound effect.mp3")

beep.volume = 0.2
ring.volume = 0.5

/**
 * Komponent reprezentujący komputer piekarnika.
 * 
 * Panel składa się z ekranu zawierającego 3 linie wyświetlaczy 14-segmentowych (1x 4.5 + 2x 7),
 * oraz zestawu 3 przycisków: dwóch zwykłych oraz jednego dwustopniowego.
 * 
 * Zestaw typowych przycisków składa się z funkcji `-` oraz `+` (przechodzenie między wybieranymi
 * programami, zmiana wartości podawanego czasu) oraz wykonującego akcję `f` (płytkie wciśnięcie 
 * zatwierdza wybraną akcję lub przechodzi do kolejnego kroku, głębokie wciśnięcie - symulowane
 * prawym przyciskiem myszy, anuluje konfigurację programu lub odrzuca zakończenie pieczenia / wraca
 * do trybu nieprogramowanego).
 * 
 * Ekran zawiera jeden duży wyświetlacz wyświetlający godzinę w formacie `##:##` (dwukropek jest
 * segmentem stałym, stąd nazwa 4.5 segmentu) lub aktualnie wprowadzaną wartość ustawianego
 * programu, natomiast 2 mniejsze wyświetlacze z 7 segmentami, tworzą 2 linie dowolnego tekstu:
 * - w trybie wyboru programu obie linie wyświetlają nazwę programu,
 * - w trybie wprowadzania wartości górna linia wyświetla nazwę wartości, druga jest pusta,
 * - w trybie pracy dolna linia wyświetla temperaturę aktualną piekarnika w formacie `###°C`,
 *   oraz po przerwie ramkę segmentu - gdy grzałka/i nie pracują, lub wypełniony segment gdy
 *   aktualnie elementy grzewcze są zasilane; ostatni symbol jest cyfrową reprezentacją tradycyjnej
 *   żarówki termostatu,
 *   - w trybie pracy z programem, górna linia wyświetla animację reprezentującą tryb pracy, oraz
 *     czas do zakończenia lub godzinę zakończenia (rozpoczęcia) pracy.
 * 
 */
class ComponentPanel extends HTMLElement {

    /** 
     * Uchwyt do pętli interwałowej odpowiedzialnej za takt pracy zegara panelu.
     * @type {number} 
     */
    #timerInterval

    /**
     * Uchwyt do części wyświetlacza głównego zawierającą godzinę.
     * @type {HTMLSpanElement}
     */
    #hour

    /**
     * Uchwyt do części wyświetlacza głównego zawierającą minuty.
     * @type {HTMLSpanElement}
     */
    #minute

    /** 
     * Uchwyt do wyświetlacza głównego (używany do zmiany stylów).
     * @type {HTMLDivElement}
     */
    #time
    
    /** Uchwyt do pierwszej linii wyświetlaczy pobocznych.
     * @type {HTMLDivElement}
     */
    #line1
    
    /** Uchwyt do drugiej linii wyświetlaczy pobocznych.
     * @type {HTMLDivElement}
     */
     #line2

    /**
     * Uchwyt do przycisku `-`.
     * @type {HTMLButtonElement} 
     */ 
    #minus

    /**
     * Uchwyt do przycisku `f`.
     * @type {HTMLButtonElement} 
     */ 
    #function

    /**
     * Uchwyt do przycisku `+`.
     * @type {HTMLButtonElement} 
     */ 
    #plus


    /** 
     * Zmienna oznaczająca pozostały czas pracy (w trybie `duration`).
     * 
     * W trybie `both`, zmienna w trakcie programowania zawiera pozostały czas pracy, jednak po
     * zatwierdzeniu programu jest do niej wyliczana godzina rozpoczęcia pracy.
     * @type {Time?} 
     */ 
    #duration = null

    /** 
     * Zmienna oznaczająca czas zakończenia pracy (tryb `end` oraz `both`).
     * @type {Time?} 
     */ 
    #end = null

    /** 
     * Zmienna oznaczająca typ wybranego programu.
     * 
     * Jeśli ta zmienna posiada wartość, jednak odpowiadający jej czas ma wartość `null`,
     * to panel znajduje się w trybie wyboru programu, a ta zmienna przechowuje aktualnie
     * wyświetlaną opcję.
     * @type {"duration" | "end" | "both" | null} 
     */
    #program

    /**
     * Flaga oznaczająca czy panel rozpoczął pracę w trybie programowanym.
     * 
     * Jeśli jej wartość jest negatywna, to wartość zmiennej `#program` reprezentuje:
     * - null: piekarnik jest w trakcie pracy w trybie niezaprogramowanym,
     * - każda inna opcja: panel jest aktualnie programowany, praca piekarnika jest wstrzymana.
     * 
     * Piekarnik wciąż może być wyłączony gdy ta flaga jest ustawiona, jeśli wybrany jest program
     * `both`, oraz oczekiwane jest na godzinę rozpoczęcia pracy.
     * @type {boolean}
     */
    #started

    /**
     * Uchwyt do interwału pomocniczego używanego do implementacji obsługi ciągłego trzymania
     * przycisku.
     * @type {number}
     */
     #interval

    /**
     * Getter definiujący listę automatycznie obserwowanych atrybutów komponentów, tj:
     * 
     * - `heating`,
     * - `temperature`.
     */
    static get observedAttributes() {
        return [ "heating", "temperature" ]
    }

    /**
     * Właściwość klasy delegowana to *atrybutu HTML* `heating` komponentu.
     * 
     * Flaga używana przez symbol reprezentujący cyfrową żarówkę termostatu, oznacza stan pracy
     * grzałek.
     * 
     * @default false
     */
    get heating() {
        return this.hasAttribute("heating")
    }
    set heating(value) {
        if (value) { this.setAttribute("heating", "") }
        else { this.removeAttribute("heating") }
    }

    /**
     * Właściwość klasy delegowana to *atrybutu HTML* `temperature` komponentu.
     * 
     * Właściwość reprezentuje temperaturę piekarnika przekazaną z czujników.
     * 
     * @default ~20
     */
    get temperature() {
        return this.getAttribute("temperature")
    }
    set temperature(value) {
        if (value !== undefined
            && value !== null
            && value !== "null") { this.setAttribute("temperature", parseInt(value)) }
        else { this.removeAttribute("temperature") }
    }

    /**
     * Tworzy nowy *Element* reprezentujący ten komponent, tworzy *shadow DOM* używając 
     * {@link template}*, oraz wykonuje stałe powiązanie metod klasy z jej instancją.
     */
    constructor() {
        super()
        this.attachShadow({ mode: "open" })
        this.shadowRoot.appendChild(template.content.cloneNode(true))

        this.clockTick = this.clockTick.bind(this)
        this.minusHandler = this.minusHandler.bind(this)
        this.minusFunc = this.minusFunc.bind(this)
        this.minusReleaseHandler = this.minusReleaseHandler.bind(this)
        this.functionHandler = this.functionHandler.bind(this)
        this.plusHandler = this.plusHandler.bind(this)
        this.plusFunc = this.plusFunc.bind(this)
        this.plusReleaseHandler = this.plusReleaseHandler.bind(this)
        this.displayTime = this.displayTime.bind(this)
    }

    /**
     * Uchwyt cyklu życia komponentu, odpowiedzialny za obsługę zdarzenia, którym jest instalacja
     * komponentu w *DOM*.
     * 
     * Pobiera uchwyty do elementów wyświetlaczy i przycisków, instaluje obsługę *Event*'ów
     * oraz uruchamia pętlę interwałową zegara.
     */
    connectedCallback() {
        this.#hour = this.shadowRoot.getElementById("hour")
        this.#minute = this.shadowRoot.getElementById("minute")

        this.#time = this.shadowRoot.getElementById("time")
        this.#line1 = this.shadowRoot.getElementById("line1")
        this.#line2 = this.shadowRoot.getElementById("line2")
        this.#minus = this.shadowRoot.getElementById("minus")
        this.#function = this.shadowRoot.getElementById("function")
        this.#plus = this.shadowRoot.getElementById("plus")

        this.#timerInterval = setInterval(this.clockTick, 1000)

        this.#minus.addEventListener("mousedown", this.minusHandler)
        this.#function.addEventListener("mousedown", this.functionHandler)
        this.#plus.addEventListener("mousedown", this.plusHandler)
        this.#function.oncontextmenu = () => false

    }

    /**
     * Uchwyt cyklu życia komponentu, odpowiedzialny za obsługę zdarzenia, którym jest usunięcie
     * komponentu w *DOM*.
     * 
     * Usuwa obsługę *Event*'ów oraz przerywa pętlę interwałową zegara.
     */
    disconnectedCallback() {
        clearInterval(this.#timerInterval)

        this.#minus.removeEventListener("mousedown", this.minusHandler)
        this.#function.removeEventListener("mousedown", this.functionHandler)
        this.#plus.removeEventListener("mousedown", this.plusHandler)
    }

    /**
     * Uchwyt cyklu życia komponentu, odpowiedzialny za obsługę zdarzenia, którym jest zmiana
     * wartości obserwowanego atrybutu komponentu.
     * 
     * Obsługa atrybutów:
     * 
     * - `program` / `started`: jeśli piekarnik aktualnie nie znajduje się w trybie programowania,
     *   to dolny ekran poboczny jest aktualizowany w oparciu o nowe wartości.
     * 
     * @param {string} name Nazwa zmienionego atrybutu
     * @param {string?} prev Tekstowa reprezentacja poprzedniej wartości przed zmianą
     * @param {string?} value Tekstowa reprezentacja nowej wartości
     */
    attributeChangedCallback(name, prev, value) {

        if (this.#program == null || this.#started == true) {
            if (name === "temperature" || name === "heating") {
                let heating = this.heating ? " #" : " O"
                let temp = this.temperature !== null
                    ? `${this.temperature}`.padStart(3, " ") + "°C"
                    : "     "


                this.#line2.dataset.value = temp + heating
            }
        }
    }

    /**
     * Funkcja pętli interwałowej zegara.
     * 
     * W każdym takcie pętli wykonywane są kolejne kroki:
     * 
     * - pobierana jest aktualna wartość "wirtualnego" zegara - w którym godzina jest resztą
     *   z dzielenia aktualnej minuty dnia przez 24, a minuta to aktualna sekunda
     * - jeśli aktualnie nie jest ustawiana wartość konfigurowanego programu, to wirtualna godzina
     *   wyświetlana jest na wyświetlaczy głównym,
     * - jeśli piekarnik pracuje obecnie w trybie zaprogramowanym, to:
     *   - w programie `duration` dekrementowany jest pozostały czas pracy, aż do "0:00" - wtedy
     *     praca piekarnika przerywana jest z *Event*'em `PanelStopOvenEvent`,
     *   - w programie `end` czas obecny porównywany jest z godziną zakończenia - gdy ta wybije,
     *     praca piekarnika przerywana jest z *Event*'em `PanelStopOvenEvent`,
     *   - w programie `both` czas obecny porównywany jest z godziną rozpoczęcia - gdy ta wybije,
     *     praca piekarnika jest rozpoczynana z *Event*'em `PanelStartOvenEvent`; wówczas panel
     *     zaczyna pracę identyczną jak w programie `end`.
     * 
     * Pętla po zakończeniu odliczania danego (do danego) czasu, natychmiast ustawia jego wartość
     * na `null`, reprezentując tym samym brak zaprogramowanego czasu do odmierzania.
     */
    clockTick() {

        const time = new Date()
        const ct = {
            hour: (time.getHours() * 60 + time.getMinutes()) % 24,
            minute: time.getSeconds()
        }
        if (window[ "--log-time--" ]) {
            console.log("[[" +
                `${ct.hour}`.padStart(2, " ")
                + ":"
                + `${ct.minute}`.padStart(2, "0")
                + "]]")
        }

        // No program is active and no program selection is undergoing rn
        if (
            (
                !this.#started
                && this.#duration === null
                && this.#end === null
            ) || this.#started) {

            this.displayTime(ct.hour, ct.minute)
        }

        // Program is running
        if (this.#started) {
            switch (this.#program) {
                case "duration": {

                    let { hour: h, minute: m } = this.#duration

                    if (h == 0 && m == 0) {

                        this.#started = null
                        this.#duration = null
                        this.#program = null
                        this.#line1.dataset.value = "-[-#-]-"
                        this.dispatchEvent(new PanelStopOvenEvent())
                        ring.play()
                        this.heating = false

                        return
                    }

                    m -= 1
                    if (m < 0) {
                        m = 59
                        h -= 1
                    }

                    this.#duration.hour = h
                    this.#duration.minute = m

                    this.#line1.dataset.value = runningTicks[ m % 4 ]
                        + `${h}`.padStart(3, " ")
                        + ":"
                        + `${m}`.padStart(2, "0")
                    break
                }
                case "end": {

                    let { hour: h, minute: m } = this.#end

                    if (h == ct.hour && m == ct.minute) {

                        this.#started = null
                        this.#end = null
                        this.#program = null
                        this.#line1.dataset.value = "-[-#-]-"
                        this.dispatchEvent(new PanelStopOvenEvent())
                        ring.play()
                        this.heating = false

                        return
                    }

                    this.#line1.dataset.value = runningTicks[ ct.minute % 4 ]
                        + `${h}`.padStart(3, " ")
                        + ":"
                        + `${m}`.padStart(2, "0")
                    break
                }
                case "both": {

                    // Waiting for start phase
                    if (this.#duration) {
                        // Change all times to minutes for easier comparisons
                        let m_d = this.#duration.hour * 60 + this.#duration.minute
                        let m_e = this.#end.hour * 60 + this.#end.minute
                        let m_c = ct.hour * 60 + ct.minute

                        let started = () => {
                            this.#duration = null
                            this.#line1.dataset.value = "Start"
                            this.dispatchEvent(new PanelStartOvenEvent())
                        }

                        let waiting = () => {
                            this.#line1.dataset.value = waitingTicks[ ct.minute % 4 ]
                                + `${this.#duration.hour}`.padStart(3, " ")
                                + ":"
                                + `${this.#duration.minute}`.padStart(2, "0")
                        }

                        // End time is next day
                        if (m_d > m_e) {
                            if (m_d <= m_c || m_c < m_e) { started() }
                            else { waiting() }
                        }
                        // End time is same day
                        else {
                            if (m_d <= m_c && m_c < m_e) { started() }
                            else { waiting() }
                        }
                    }
                    // Started
                    else {
                        let { hour: h, minute: m } = this.#end

                        if (h == ct.hour && m == ct.minute) {

                            this.#started = null
                            this.#end = null
                            this.#program = null
                            this.#line1.dataset.value = "-[-#-]-"
                            this.dispatchEvent(new PanelStopOvenEvent())
                            ring.play()
                            this.heating = false

                            return
                        }

                        this.#line1.dataset.value = runningTicks[ ct.minute % 4 ]
                            + `${h}`.padStart(3, " ")
                            + ":"
                            + `${m}`.padStart(2, "0")
                    }


                    break
                }
            }
        }
    }

    /**
     * Obsługa *Event*'u wciśnięcia lewego klawisza myszy na przycisku `-`.
     * 
     * Uruchamia obsługę wciśnięcia przycisku raz, po czym odczekuje 0.5s - jeśli po upływie tego
     * czasu przycisk nadal jest trzymany, wtedy zaczyna wykonywać obsługę wciśnięcia przycisku 20x
     * na sekundę, ułatwiając wprowadzanie odległych wartości bez ciągłego wciskania przycisku.\
     * Ze względu na brak dedykowanego *Event*u w JavaScript, funkcjonalność ta jest
     * zaimplementowana *custom*'owej obsługi z użyciem `setTimeout`, `setInterval` i globalnej
     * obsługi *Event*'ów.
     * 
     * @param {MouseEvent} e Stan zdarzenia
     * 
     * @see minusFunc
     * @see #interval
     * @see minusReleaseHandler
     */
    minusHandler(e) {
        if (!this.#started && this.#program != null) {
            beep.pause()
            beep.currentTime = 0
            beep.play()
        }
        this.minusFunc()

        this.#interval = setTimeout(() => {
            clearTimeout(this.#interval)
            this.#interval = setInterval(() => {
                this.minusFunc()
            }, 50)
        }, 500)

        document.addEventListener("mouseup", this.minusReleaseHandler)
    }

    /**
     * Obsługa *Event*'u puszczenia lewego klawisza myszy poprzednim wciśnięciu na przycisku `-`.
     * 
     * Przerywa pętle interwałowe realizujące obsługę trzymania przycisku oraz usuwa globalną
     * obsługę *Event*'ów.
     */
    minusReleaseHandler() {
        clearTimeout(this.#interval)
        clearInterval(this.#interval)
        document.removeEventListener("mouseup", this.minusReleaseHandler)
    }

    /**
     * Realizuje obsługę wciśnięcia klawisza `-`.
     * 
     * W przypadku menu wyboru programu, przechodzi w tył między dostępnymi programami.\
     * W przypadku menu wprowadzania wartości, zmniejsza wartość o 1, ale w przypadku wartości
     * `duration` nie schodzi poniżej `0:00`.
     */
    minusFunc() {
        // If program is running or not selected - do nothing
        if (this.#started || this.#program == null) {
            return
        }
        // Program not selected yet - toggle between them
        if (this.#duration === null && this.#end === null) {
            switch (this.#program) {
                case "duration": {
                    this.#program = "both"
                    this.#line1.dataset.value = "durat."
                    this.#line2.dataset.value = "+end at"
                    return
                }
                case "end": {
                    this.#program = "duration"
                    this.#line1.dataset.value = "durat."
                    this.#line2.dataset.value = ""
                    return
                }
                case "both": {
                    this.#program = "end"
                    this.#line1.dataset.value = "end at"
                    this.#line2.dataset.value = ""
                    return
                }
            }
        }

        if ((this.#program == "duration" && this.#duration)
            || (this.#program == "both" && this.#duration && !this.#end)) {
            let { hour: h, minute: m } = this.#duration

            if (h == 0 && m == 0) {
                clearTimeout(this.#interval)
                clearInterval(this.#interval)
                return
            }

            m -= 1
            if (m < 0) {
                m = 59
                h -= 1
            }

            this.#duration.hour = h
            this.#duration.minute = m

            this.displayTime(h, m)

            return
        }

        if ((this.#program == "end" && this.#end)
            || (this.#program == "both" && this.#end)) {
            let { hour: h, minute: m } = this.#end

            if (h == 0 && m == 0) {
                clearTimeout(this.#interval)
                clearInterval(this.#interval)
            }

            m -= 1
            if (m < 0) {
                m = 59
                h -= 1
            }
            if (h < 0) {
                h = 23
            }

            this.#end.hour = h
            this.#end.minute = m

            this.displayTime(h, m)

            return
        }

        if (this.#program == "both" && this.#duration && !this.#end) {
            let { hour: h, minute: m } = this.#duration

            if (h == 0 && m == 0) {
                clearTimeout(this.#interval)
                clearInterval(this.#interval)
                return
            }

            m -= 1
            if (m < 0) {
                m = 59
                h -= 1
            }

            this.#duration.hour = h
            this.#duration.minute = m

            this.displayTime(h, m)

            return
        }
    }

    /**
     * Obsługa *Event*'u wciśnięcia lewego klawisza myszy na przycisku `+`.
     * 
     * Uruchamia obsługę wciśnięcia przycisku raz, po czym odczekuje 0.5s - jeśli po upływie tego
     * czasu przycisk nadal jest trzymany, wtedy zaczyna wykonywać obsługę wciśnięcia przycisku 20x
     * na sekundę.
     * 
     * Szczegóły implementacji opisane są w dokumentacji funkcji `minusHandler`.
     * 
     * @param {MouseEvent} e 
     * 
     * @see minusHandler
     * @see minusFunc
     * @see #interval
     * @see minusReleaseHandler
     */
    plusHandler(e) {
        if (!this.#started && this.#program != null) {
            beep.pause()
            beep.currentTime = 0
            beep.play()
        }
        this.plusFunc()

        this.#interval = setTimeout(() => {
            clearTimeout(this.#interval)
            this.#interval = setInterval(() => {
                this.plusFunc()
            }, 50)
        }, 500)

        document.addEventListener("mouseup", this.plusReleaseHandler)
    }

    /**
     * Obsługa *Event*'u puszczenia lewego klawisza myszy poprzednim wciśnięciu na przycisku `+`.
     * 
     * Przerywa pętle interwałowe realizujące obsługę trzymania przycisku oraz usuwa globalną
     * obsługę *Event*'ów.
     */
    plusReleaseHandler() {
        clearTimeout(this.#interval)
        clearInterval(this.#interval)
        document.removeEventListener("mouseup", this.plusReleaseHandler)
    }

    /**
     * Realizuje obsługę wciśnięcia klawisza `+`.
     * 
     * W przypadku menu wyboru programu, przechodzi w przód między dostępnymi programami.\
     * W przypadku menu wprowadzania wartości, zwiększa wartość o 1, ale w przypadku wartości
     * `duration` nie wchodzi powyżej `11:59`.
     */
    plusFunc() {
        // If program is running or not selected - do nothing
        if (this.#started || this.#program == null) {
            return
        }
        // Program not selected yet - toggle between them
        if (this.#duration === null && this.#end === null) {
            switch (this.#program) {
                case "duration": {
                    this.#program = "end"
                    this.#line1.dataset.value = "end at"
                    this.#line2.dataset.value = ""
                    return
                }
                case "end": {
                    this.#program = "both"
                    this.#line1.dataset.value = "durat."
                    this.#line2.dataset.value = "+end at"
                    return
                }
                case "both": {
                    this.#program = "duration"
                    this.#line1.dataset.value = "durat."
                    this.#line2.dataset.value = ""
                    return
                }
            }
        }

        if ((this.#program == "duration" && this.#duration)
            || (this.#program == "both" && this.#duration && !this.#end)) {
            let { hour: h, minute: m } = this.#duration

            if (h == 11 && m == 59) {
                clearTimeout(this.#interval)
                clearInterval(this.#interval)
                return
            }

            m += 1
            if (m > 59) {
                m = 0
                h += 1
            }

            this.#duration.hour = h
            this.#duration.minute = m

            this.displayTime(h, m)

            return
        }

        if ((this.#program == "end" && this.#end)
            || (this.#program == "both" && this.#end)) {
            let { hour: h, minute: m } = this.#end

            if (h == 0 && m == 0) {
                clearTimeout(this.#interval)
                clearInterval(this.#interval)
            }

            m += 1
            if (m > 59) {
                m = 0
                h += 1
            }
            if (h > 23) {
                h = 0
            }

            this.#end.hour = h
            this.#end.minute = m

            this.displayTime(h, m)

            return
        }
    }

    /**
     * Realizuje obsługę wciskania przycisku `f`.
     * 
     * W przypadku wciśnięcia prawym przyciskiem myszy (symulacja głębokiego wciśnięcia),
     * natychmiast anulowany jest aktualnie wybrany program, wybór programu, lub jego zakończenie,
     * a piekarnik wraca do trybu pracy bez programowania; również wysyłany jest *Event*
     * `PanelStartOvenEvent`.
     * 
     * W przypadku wciśnięcia lewym przyciskiem myszy (symulacja płytkiego wciśnięcia):
     * - gdy panel nie jest zaprogramowany, uruchamia menu wyboru programu, wysyłając *Event*
     *   `PanelPauseOvenEvent` wstrzymujący pracę piekarnika,
     * - w menu wyboru programu, wybiera program aktualnie wyświetlany na ekranie,
     * - w menu wprowadzania czasu programu:
     *   - w programie `duration` oraz `end` zatwierdza i rozpoczyna program, przy czym nie możliwe
     *     jest zatwierdzenie czasu duration `0:00`; wysyłany również jest *Event*
     *     `PanelStartOvenEvent`,
     *   - w programie `both`, wprowadzane i zatwierdzane są 2 wartości - `duration` **oraz** `end`,
     *     zatwierdzanie pierw przechodzi z wprowadzania jednej wartości do drugiej (ale nie przy
     *     podaniu wartości pierwszej `0:00`), a po wprowadzeniu drugiej rozpoczyna program. Co
     *     ważne, uruchomienie programu `both` nie wysyła *Event*'u `PanelStartOvenEvent`, jako że
     *     rozpoczęcie pracy piekarnika jest odłożone w czasie, tak aby praca o wprowadzonej
     *     długości czasu, zakończyła się o wprowadzonej godzinie.
     * 
     * @param {MouseEvent} e Stan zdarzenia
     */
    functionHandler(e) {

        if (this.#duration
            && this.#duration.hour != 0
            && this.#duration.minute != 0
            || this.duration == null) {

            beep.pause()
            beep.currentTime = 0
            beep.play()
        }

        // Cancel any program on right press
        if (e.button == 2) {
            if (this.#started) {
                this.dispatchEvent(new PanelStartOvenEvent())
            } else if (this.#program != null
                && (this.#duration || this.#end)) {
                this.dispatchEvent(new PanelStartOvenEvent())
            }

            this.#started = false
            this.#duration = null
            this.#end = null
            this.#program = null
            this.#line1.className = ""
            this.#line2.className = ""
            this.#time.className = ""
            this.#line1.dataset.value = ""
            this.#line2.dataset.value = ""
            this.attributeChangedCallback("heating")
            this.attributeChangedCallback("temperature")
            this.displayTime("--", "--")
            this.dispatchEvent(new PanelStartOvenEvent())
            return
        }

        // Don't configure running program
        if (this.#started) { return }

        // Program not selected yet
        if (this.#duration === null && this.#end === null) {
            // Begin program selection
            // If program is selected, begin input
            switch (this.#program) {
                case null:
                case undefined: {
                    this.#program = "duration"
                    this.#line1.dataset.value = "durat."
                    this.#line2.dataset.value = ""

                    this.#line1.className = "blink"
                    this.#line2.className = "blink"

                    this.dispatchEvent(new PanelPauseOvenEvent())

                    return
                }
                case "duration": {
                    this.#duration = { hour: 0, minute: 0 }
                    this.displayTime(0, 0)
                    this.#line1.className = ""
                    this.#line2.className = ""
                    this.#time.className = "blink"
                    return
                }
                case "end": {
                    const time = new Date()
                    const hour = (time.getHours() * 60 + time.getMinutes()) % 24
                    const minute = time.getSeconds()
                    this.#end = { hour: hour, minute: minute }
                    this.displayTime(hour, minute)
                    this.#line1.className = ""
                    this.#line2.className = ""
                    this.#time.className = "blink"
                    return
                }
                case "both": {
                    this.#duration = { hour: 0, minute: 0 }
                    this.displayTime(0, 0)
                    this.#line2.dataset.value = ""
                    this.#line1.className = ""
                    this.#line2.className = ""
                    this.#time.className = "blink"
                    return
                }
            }
        }

        // Program "both" selected and ready to proceed to second part
        if (this.#program == "both"
            && this.#end === null
            && !(this.#duration.hour == 0 && this.#duration.minute == 0)) {
            const time = new Date()
            const hour = (time.getHours() * 60 + time.getMinutes()) % 24
            const minute = time.getSeconds()
            this.#end = { hour: hour, minute: minute }
            this.displayTime(hour, minute)
            this.#line1.dataset.value = "end at"
            return
        }

        // Program is set up - begin it (duh)
        if (
            (
                this.#program === "duration"
                && this.#duration
                && !(this.#duration.hour == 0 && this.#duration.minute == 0)
            ) || (
                this.#program == "end"
                && this.#end
            ) || (
                this.#program == "both"
                && this.#end
            )
        ) {

            this.#started = true
            this.#line1.className = ""
            this.#line2.className = ""
            this.#line1.dataset.value = ""
            this.#line2.dataset.value = ""
            this.#time.className = ""
            this.attributeChangedCallback("heating")
            this.temperature = this.temperature ?? 20

            // For program "both", cache start time into #duration
            if (this.#program == "both") {
                let h = this.#end.hour - this.#duration.hour
                let m = this.#end.minute - this.#duration.minute

                if (m < 0) {
                    h -= 1
                    m += 60
                } else if (m > 59) {
                    h += 1
                    m -= 60
                }

                h = MathX.mod(h, 24)

                this.#duration.hour = h
                this.#duration.minute = m
            }
            // Other programs start immediately
            else {
                this.dispatchEvent(new PanelStartOvenEvent())
            }
            return
        }
    }

    /**
     * Wyświetla podane wartości czasu na wyświetlaczu głównym.
     * @param {number|string} hour 
     * @param {number|string} minute 
     */
    displayTime(hour, minute) {
        this.#hour.innerText = `${hour}`.padStart(2, " ")
        this.#minute.innerText = `${minute}`.padStart(2, "0")
    }
}
customElements.define("x-panel", ComponentPanel)

/**
 * *Event* reprezentujący zakończenie zaprogramowanej pracy piekarnika.
 */
class PanelStopOvenEvent extends Event {
    /**
     * Tworzy *Event*, inicjalizując go z identyfikatorem `"panelStopOven"`.
     */
    constructor() {
        super("panelStopOven", { bubbles: true })
    }
}

/**
 * *Event* reprezentujący rozpoczęcie pracy piekarnika, na skutek anulowania programu, odrzucenia
 * zakończonego programu, lub rozpoczęcia zaprogramowanej pracy.
 */
class PanelStartOvenEvent extends Event {

    constructor() {
        super("panelStartOven", { bubbles: true })
    }
}

/**
 * *Event* reprezentujący zatrzymanie pracy piekarnika na czas programowania panelu.
 */
class PanelPauseOvenEvent extends Event {

    constructor() {
        super("panelPauseOven", { bubbles: true })
    }
}

/**
 * Klasa reprezentująca godzinę lub czas.
 */
class Time {
    /** @type {number} */ hour
    /** @type {number} */ minute
}

/**
 * Tablica klatek animacji oczekiwania na rozpoczęcie pracy zgodnie z zaprogramowanym czasem. 
 */
const waitingTicks = [ "[", "O", "]", "|" ]

/**
 * Tablica klatek animacji pracy do zakończenia zaprogramowanego czasu. 
 */
const runningTicks = [ "\\", "|", "/", "-" ]

export default ComponentPanel
export {
    PanelStopOvenEvent,
    PanelStartOvenEvent,
    PanelPauseOvenEvent
}
