import { html } from "./utils.js"
import {
    FaceGraph,
    FaceNode,
    Faces
} from "./definitions.js"
import ComponentKnob, {
    KnobValueChangeEvent
} from "../components/knob.js"
import ComponentFlame from "../components/flame.js"
import ComponentPanel, {
    PanelStartOvenEvent,
    PanelPauseOvenEvent,
    PanelStopOvenEvent
} from "../components/panel.js"
import AudioInterface from "./audio.js"

/** @module mainScript */

export default {}

window[ "--html--" ] = html

/**
 * Lista ścian urządzenia.
 * @type {Faces}
 */
const faces = {
    up: document.getElementById("up"),
    down: document.getElementById("down"),
    left: document.getElementById("left"),
    right: document.getElementById("right"),
    front: document.getElementById("front"),
    back: document.getElementById("back"),
}

/**
 * Graf przejść między ścianami urządzenia.
 * @type {FaceGraph}
 */
const faceGraph = {
    up: { face: faces.up },
    down: { face: faces.down },
    left: { face: faces.left },
    right: { face: faces.right },
    front: { face: faces.front },
    back: { face: faces.back },
}

faceGraph.up.up = faceGraph.back
faceGraph.up.right = faceGraph.right
faceGraph.up.down = faceGraph.front
faceGraph.up.left = faceGraph.left

faceGraph.down.up = faceGraph.front
faceGraph.down.right = faceGraph.right
faceGraph.down.down = faceGraph.back
faceGraph.down.left = faceGraph.left

faceGraph.left.up = faceGraph.up
faceGraph.left.right = faceGraph.front
faceGraph.left.down = faceGraph.down
faceGraph.left.left = faceGraph.back

faceGraph.right.up = faceGraph.up
faceGraph.right.right = faceGraph.back
faceGraph.right.down = faceGraph.down
faceGraph.right.left = faceGraph.front

faceGraph.front.up = faceGraph.up
faceGraph.front.right = faceGraph.right
faceGraph.front.down = faceGraph.down
faceGraph.front.left = faceGraph.left

faceGraph.back.up = faceGraph.up
faceGraph.back.right = faceGraph.left
faceGraph.back.down = faceGraph.down
faceGraph.back.left = faceGraph.right

/**
 * Obsługuje klawisze `wsad` służące do przechodzenia między ścianami.
 * 
 * Przejścia zdefiniowane są w grafie przejść, zgodnie z konwencją przyjętą w wymaganiach wstępnych.
 * 
 * @param {KeyboardEvent} e Stan zdarzenia
 * 
 * @see faceGraph
 */
function graphWalkHandler(e) {
    const currentFaceNode = Object.values(faceGraph)
        .filter(fn => fn.face.dataset.hidden == undefined)[ 0 ]
    switch (e.key) {
        case "w": {
            currentFaceNode.up.face.removeAttribute("data-hidden")
            break
        }
        case "d": {
            currentFaceNode.right.face.removeAttribute("data-hidden")
            break
        }
        case "s": {
            currentFaceNode.down.face.removeAttribute("data-hidden")
            break
        }
        case "a": {
            currentFaceNode.left.face.removeAttribute("data-hidden")
            break
        }
        default: return
    }
    currentFaceNode.face.dataset.hidden = ""
}
document.addEventListener("keypress", graphWalkHandler)

/**
 * Obsługuje klawisze `qzec`, służące do manipulowania drzwiczkami piekarnika.
 * 
 * Klawisze `q` i `e` służą do podnoszenia drzwi, podczas gdy `z` i `c` służą do ich opuszczania.
 * 
 * Klawisze `q` i `z` manipulują drzwiami w małych przyrostach, podczas gdy `e` i `c` przechodzą od
 * razu do skrajnych pozycji.
 * 
 * Manipulacje drzwiami nie są możliwe, jeśli aktualnie wysunięta jest któraś z tacek piekarnika.
 * 
 * @param {KeyboardEvent} e Stan zdarzenia
 * @see shelfMovementHandler
 */
function doorPositionHandler(e) {

    // Cannot take out while doors are closed
    if (document.body.style.getPropertyValue("--door-position") !== "0") { return }

    const positions = {
        deepTray: document.body.dataset.deepTrayPosition,
        shallowTray: document.body.dataset.shallowTrayPosition,
        rack: document.body.dataset.rackPosition,
    }

    const shelfOutside = document.body.dataset.shelfOutside ?? ""

    if (![ "1", "2", "3", "4", "5" ].includes(e.key)) { return }

    // Try taking shelf outside if on selected position
    if (shelfOutside == "") {
        if (positions.deepTray == e.key) {
            document.body.dataset.shelfOutside = "deepTray"
        }
        if (positions.shallowTray == e.key) {
            document.body.dataset.shelfOutside = "shallowTray"
        }
        if (positions.rack == e.key) {
            document.body.dataset.shelfOutside = "rack"
        }
    }

    // Or try placing one on outside
    else {
        // Check if there is something below
        const shelfBelow = Object.entries(positions)
            .filter(v => v[ 1 ] == e.key)

        // Only current shelf is below - place it here
        if (shelfBelow.length <= 1 && shelfBelow.at(0)?.at(0) == shelfOutside) {
            document.body.dataset.shelfOutside = ""
        }

        // Change position
        else {
            // document.body.dataset.shelfOutside = ""
            document.body.dataset[ `${shelfOutside}Position` ] = e.key
        }

    }
}
document.addEventListener("keypress", doorPositionHandler)

/**
 * Obsługuje klawisze `12345`, służące do manipulowania tackami piekarnika.
 * 
 * Numery klawiszy reprezentują pozycje szyn na tacki, przyjmując że pierwsza jest górna szyna.
 * 
 * Wciśnięcie klawisza który reprezentuje pozycję na której wsunięta jest tacka, wysunie tą tackę
 * na wierzch.
 * 
 * Wciśnięcie klawisza innej pozycji niż ta na której znajduje się wysunięta tacka, przesunie ją
 * nad tą pozycję.
 * 
 * Wciśnięcie klawisza pozycji na której znajduje się wysunięta tacka, wsunie ją na tą pozycję,
 * jeżeli pozycja ta jest wolna.
 * 
 * Próba wsunięcia tacki na zajętą pozycję, lub wysunięcia tacki z pustej pozycji jest ignorowana.
 * 
 * Manipulacje tackami nie są możliwe, jeśli drzwiczki piekarnika nie są całkowicie otwarte.
 * 
 * @param {KeyboardEvent} e Stan zdarzenia
 * @see doorPositionHandler
 */
function shelfMovementHandler(e) {
    // Cannot close if shelf is out
    if (document.body.dataset.shelfOutside) { return }

    const currentPosition = Math.round(
        document.body.style.getPropertyValue("--door-position") * 20
    )

    switch (e.key) {
        case "z": {
            let newPosition = (currentPosition - 1) / 20
            newPosition = Math.max(0, newPosition)
            document.body.style.setProperty("--door-position", newPosition)
            break
        }
        case "q": {
            let newPosition = (currentPosition + 1) / 20
            newPosition = Math.min(1, newPosition)
            document.body.style.setProperty("--door-position", newPosition)
            break
        }

        case "c": {
            document.body.style.setProperty("--door-position", 0)
            break
        }
        case "e": {
            document.body.style.setProperty("--door-position", 1)
            break
        }
        default: return
    }

    const v = +document.body.style.getPropertyValue("--door-position")

    AudioInterface.rotorLPF = 1 - v
}
document.addEventListener("keypress", shelfMovementHandler)

/**
 * Klucz indeksu do wartości na obiekcie globalnym `window`, którym można pobrać listę stref
 * temperaturowych piekarnika.
 */
const OZ = "--oven-zones--"
window[ OZ ] = [
    20,
    20,
    20
]

/**
 * Pomocniczy getter.
 * @returns Wartość zmiennej CSS `--door-position` przypisanej do elementu `body`
 */
function getDoorPosition() {
    return +document.body.style.getPropertyValue("--door-position")
}

/**
 * Pomocniczy getter.
 * 
 * Wartość atrybutu, reprezentuje czy piekarnik jest aktualnie uruchomiony.
 * @returns {boolean} Wartość atrybutu `data-oven` przypisanego do elementu `body`
 * 
 * @see setOvenOn
*/
function isOvenOn() {
    return document.body.dataset.oven == "on"
}

/** @type {ComponentKnob} */
const programKnob = document.getElementById("program")
/** @type {ComponentKnob} */
const temperatureKnob = document.getElementById("temperature")
/** @type {ComponentPanel} */
const panel = document.querySelector("x-panel")


/**
 * Pomocniczy setter.
 * 
 * Ustawia wartość atrybutu `data-oven` przypisanego do elementu `body` na "on" lub "off"
 * @param {boolean} value `true => "on"`, `false => "off"`
 *
 * @see getOvenOn
*/
function setOvenOn(value) {
    document.body.dataset.oven = value ? "on" : "off"
}

/**
 * Flaga oznaczająca blokadę przed uruchomieniem piekarnika.
 * 
 * Źródłem tej blokady są *Event*'y wstrzymujące / zatrzymujące pracę piekarnika.
 */
let ovenPanelLock = false

/**
 * Obsługuje *Event*'y `PanelStopOvenEvent` oraz `PanelPauseOvenEvent`.
 * 
 * Na jakiekolwiek żądanie przerwania pracy piekarnika, reaguje załozeniem blokady uruchomienia
 * piekarnika.
 * @param {PanelPauseOvenEvent|PanelStopOvenEvent} e Stan zdarzenia
 */
function placeOvenPanelLock(e) {
    ovenPanelLock = true
    setOvenOn(false)
    document.getElementById("rotor")
        .removeAttribute("data-spin")
    AudioInterface.rotor.pause()
}
panel.addEventListener("panelStopOven", placeOvenPanelLock)
panel.addEventListener("panelPauseOven", placeOvenPanelLock)


/**
 * Obsługuje *Event* `PanelStartOvenEvent`.
 * 
 * Na żądanie kontynuowania pracy piekarnika, reaguje zdjęciem blokady uruchomienia piekarnika.
 * Dodatkowo synchronizowany jest stan termoobiegu.
 * @param {PanelStartOvenEvent} e Stan zdarzenia
 */
function removeOvenPanelLock(e) {
    ovenPanelLock = false
    if (programKnob.value != 0) {
        setOvenOn(true)
    }
    const rotor = document.getElementById("rotor")
    if ([ 1, 2, 3, 4 ].includes(programKnob.value)) {
        rotor.dataset.spin = ""
        AudioInterface.rotor.play()
    } else {
        rotor.removeAttribute("data-spin")
        AudioInterface.rotor.pause()
    }
}
panel.addEventListener("panelStartOven", removeOvenPanelLock)


/**
 * Przeprowadza takt pętli symulacji piekarnika.
 * 
 * Symulacja piekarnika implementuje kilka podstawowych zjawisk:
 * 
 * - mieszanie się powietrza między uproszczoną liczbą stref przestrzeni,
 * - konwekcja temperatury pomiędzy strefami,
 * - wprowadzanie ciepła to stref przez grzałki,
 * - utratę ciepła przez niedoskonałość izolacji,
 * - gwałtowną utratę ciepła przez otwarte drzwi piekarnika,
 * 
 * oraz ewentualnie:
 * 
 * - przyśpieszone mieszanie temperatury wewnątrz i na zewnątrz piekarnika przy włączonym
 * termoobiegu.
 * 
 * W ramach symulacji aktualizowana jest również wartość czujnika temperatury, oraz symulowany jest
 * termostat sterujący grzałkami.
 * 
 * Dokładny opis algorytmu znajduje się poniżej:
 * 
 * 1. Sprawdzany jest stan grzałek oraz termoobiegu, w szczególności:
 *    - Dana grzałka lub termoobieg musi być częścią obecnego programu piekarnika (lewe pokrętło),
 *    - Atrybut `data-oven` musi przyjmować wartość `"on"` (piekarnik włączony),
 *    - Blokada `ovenPanelLock` musi być nieaktywna,
 *    - W przypadku grzałek, termostat panelu musi być aktywny (`panel.heating == true`),
 * 2. Pobierana jest poprzednia wartość stref ciepła; założone są 3 strefy:
 *    - `[0]`: Strefa przy dolnej grzałce,
 *    - `[1]`: Strefa po środku piekarnika,
 *    - `[1]`: Strefa przy górnej grzałce,
 * 3. Algorytm rozgałęzia się na 2 alternatywy:
 *    - termoobieg aktywny: temperatura każdej strefy ustawiana jest na średnią wszystkich stref,
 *    - termoobieg nieaktywny: wyliczane są przesunięcia stref, jako:
 *      - strefa dolna: 45% średniej strefy dolnej i środkowej,
 *      - strefa środkowa: średnia z 55% średniej strefy dolnej i środkowej oraz 45% średniej strefy
 *        górnej i środkowej,
 *      - strefa górna: 55% średniej strefy górnej i środkowej,
 *      
 *      następnie wyliczane jest wyrównanie jako różnica sumy poprzednich temperatur stref i sumy
 *      nowych temperatur - wyrównanie jest dodawane do nowych temperatur stref,
 * 4. Od wszystkich temperatur odejmowana jest pasywna utrata ciepła; jeśli w danej strefie grzałka
 *    jest aktywna, to dodawana jest wprowadzona temperatura,
 * 5. Obliczana jest aktywna utrata ciepła, jako:
 *    - suma utraty dla otwartych drzwi,
 *    - dodatkowo jeśli przy otwartych drzwiach aktywny jest termoobieg, to utrata ciepła jest
 *      powiększona,
 * 
 *    tak obliczona wartość mnożona jest przez stopień otwarcia drzwiczek. Nowa wartość straty jest
 *    odejmowana od stref:
 *    - strefa dolna traci 25% wartości straty aktywnej,
 *    - strefa środkowa traci 50% wartości straty aktywnej,
 *    - strefa górna traci 100% wartości straty aktywnej.
 * 6. Wartość nowych temperatur z założenia nie może spaść poniżej temperatury pokojowej 
 *    20°C - wartości niższe są podmieniane na wartość domyślną.
 * 
 * Na tym etapie kończy się symulacja piekarnika. Dodatkowo w pętli wykonywane jest:
 * 
 * 1. Średnia dwóch najcieplejszych stref przyjmowana jest jako wartość czujnika temperatury;
 *    wartość przekazywana jest do wyświetlacza panela,
 * 2. Przeprowadzany jest prosty warunek termostatu:
 *    - jeśli wyliczona temperatura czujnika spadła poniżej 95% temperatury nastawy (prawa gałka),
 *      to grzałki są włączane / termostat jest aktywowany,
 *    - jeśli temperatura wzrośnie ponad 105% temperatury nastawy to grzałki są
 *      wyłączane / termostat jest dezaktywowany.
 * 
 */
function ovenSimulation() {

    const upCoil = [ 2, 3, 5, 6 ].includes(programKnob.value)
        && isOvenOn()
        && panel.heating
        && !ovenPanelLock
    const downCoil = [ 1, 3, 5, 7 ].includes(programKnob.value)
        && isOvenOn()
        && panel.heating
        && !ovenPanelLock
    const rotor = [ 1, 2, 3, 4 ].includes(programKnob.value)
        && isOvenOn()
        && !ovenPanelLock


    /** @type {number[]} */
    const zones = window[ OZ ]

    let newZones = zones

    if (rotor) {
        const zoneAvg = zones
            .reduce((s_c, v) => [ s_c[ 0 ] + v, s_c[ 1 ] + 1 ], [ 0, 0 ])
            .reduce((s, c) => s / c)

        newZones = [ zoneAvg, zoneAvg, zoneAvg ]
    } else {
        const zoneSum = zones.reduce((a, b) => a + b)

        const upAvg = (zones[ 2 ] + zones[ 1 ]) / 2
        const downAvg = (zones[ 1 ] + zones[ 0 ]) / 2

        newZones = [
            downAvg * 0.45,
            (upAvg * 0.45 + downAvg * 0.55) / 2,
            upAvg * 0.55,
        ]
        const newSum = newZones.reduce((a, b) => a + b)

        const diff = (zoneSum - newSum) / 3

        newZones[ 0 ] += diff
        newZones[ 1 ] += diff
        newZones[ 2 ] += diff

    }

    newZones[ 0 ] += downCoil * 10 - 1
    newZones[ 1 ] += -1
    newZones[ 2 ] += upCoil * 10 - 1

    const doorLoss = (50 + rotor * 20) * (1 - getDoorPosition())
    newZones[ 0 ] -= doorLoss * 0.25
    newZones[ 1 ] -= doorLoss * 0.5
    newZones[ 2 ] -= doorLoss * 1


    newZones[ 0 ] = Math.max(20, newZones[ 0 ])
    newZones[ 1 ] = Math.max(20, newZones[ 1 ])
    newZones[ 2 ] = Math.max(20, newZones[ 2 ])
    window[ OZ ] = newZones

    const temps = [ ...newZones ].sort((a, b) => b - a)
    const temp = (temps[ 0 ] + temps[ 1 ]) / 2

    panel.temperature = temp

    if (temp < temperatureKnob.value * 0.95) {
        panel.heating = true
    }

    if (temp > temperatureKnob.value * 1.05) {
        panel.heating = false
    }
}
setInterval(ovenSimulation, 1000)

/**
 * Obsługuje zmiany położenia pokręteł płyty gazowej.
 * 
 * Pokrętła posiadają 4 strefy:
 * 
 * - od pozycji "max" do pozycji "min" płomienia - strefa stabilnej pracy; w tej strefie płomień
 *   nigdy nie jest zdmuchnięty. Wartość "max" płomienia oznacza maksymalną moc płomienia, wartość
 *   "min" oznacza z kolei ok. połowy mocy płomienia,
 * - od pozycji "max", do ok. 80% drogi do pozycji "0", znajduje się drugi zakres pracy, w którym
 *   "max" ponownie oznacza maksymalną moc płomienia, a dolna granica zakresu oznacza już ocięcie
 *   dopływu gazu. Zakres ten dzieli się na 2 strefy:
 *   - połowa zakresu bliżej pozycji "max" jest względnie stabilna - płomień w niej nie gaśnie, ale
 *     nie zalecane jest zostawianie pokręteł w tej pozycji,
 *   - druga połowa zakresu jest strefą pracy niestabilnej - istnieje ryzyko że przy zmianie mocy
 *     w tej strefie, palnik mimowolnie zgaśnie,
 * - pozostały zakres przed pozycją "0" jest strefą odłączonego zasilania gazu.
 * 
 * Nowa wartość mocy palnika jest do niego przypisywana w jednym z dwóch przypadków:
 * - jest obecnie aktywny iskrownik - oznacza to że próbujemy zapalić palnik,
 * - lub poprzednia wartość mocy jest większa od 0 - palnik już był zapalony.
 * 
 * W Przeciwnym wypadku, wartość jest ignorowana, a dopływ gazu jest ustawiany na 0.
 * 
 * @param {KnobValueChangeEvent} e Stan zdarzenia
 */
function knobValueChangeHandler(e) {
    let val

    if (e.value <= 100) {
        val = (e.value + 100) / 200
    } else if (e.value < 140) {
        val = (80 - (e.value - 100)) / 80
    } else {
        val = (80 - (e.value - 100)) / 80
        if (Math.random() > 0.8) {
            val = 0
        }
    }

    const num = this.id.slice(2, 3)

    const burner = document.getElementById(`burn-${num}`)

    const prevValue = parseFloat(burner.style.getPropertyValue("--show") || 0)

    const a = AudioInterface.hobs[ num - 1 ]
    if (val > 0
        && (
            this.dataset.spark
            || prevValue > 0
        )
    ) {
        burner.style.setProperty("--show", val)
        a.volume = val * 0.5
        a.play()
    } else {
        burner.style.setProperty("--show", 0)
        a.pause()
    }

    if (this.dataset.spark) {
        AudioInterface.spark.play()
    } else {
        AudioInterface.spark.pause()
    }
}

/**
 * Obsługuje uruchomienie iskrownika.
 * 
 * Iskrownik uruchamiany jest przez wciśnięcie gałki (prawym przyciskiem myszy).
 * 
 * Dodatkowo, rejestrowana jest globalna obsługa *Event*'u puszczenia PPM.
 * 
 * @param {MouseEvent} e Stan zdarzenia
 */
function knobSparkHandler(e) {

    if (e.button != 2) { return }
    e.preventDefault()

    this.dataset.spark = true
    this.dispatchEvent(new KnobValueChangeEvent(this.value))

    document.addEventListener("mouseup", documentSparkLetGoHandler)
}

/**
 * Obsługuje puszczenie prawego przycisku myszy, poprzednio wciśniętego na iskrowniku.
 * 
 * W ramach zakończenia, funkcja usuwa samą siebie z globalnej obsługi *Event*'ów.
 * 
 * @param {MouseEvent} e Stan zdarzenia
 */
function documentSparkLetGoHandler(e) {
    document.removeEventListener("mouseup", documentSparkLetGoHandler)
    document.querySelector("x-knob[data-spark='true']").dataset.spark = ""
}

document.querySelectorAll("#knobs x-knob")
    .forEach(knob => {
        knob.addEventListener("knobValueChange", knobValueChangeHandler)
        knob.addEventListener("mousedown", knobSparkHandler)
        knob.oncontextmenu = () => false
    }
    )

/**
 * Obsługuje zmianę programu piekarnika.
 * 
 * W pierwszej kolejności przełącza termoobieg, w zależności od tego czy obecny program go używa.
 * 
 * Jeśli wyprany jest program "0", wyłącza piekarnik.
 * 
 * @param {KnobValueChangeEvent} e Stan zdarzenia
 */
function rotorProgramHandler(e) {
    const rotor = document.getElementById("rotor")
    if ([ 1, 2, 3, 4 ].includes(e.value) && !ovenPanelLock) {
        rotor.dataset.spin = ""
        AudioInterface.rotor.play()
    } else {
        rotor.removeAttribute("data-spin")
        AudioInterface.rotor.pause()
    }

    if (e.value != 0) {
        if (!ovenPanelLock) {
            setOvenOn(true)
        }
    } else {
        setOvenOn(false)
    }
}
document.getElementById("program").addEventListener("knobValueChange", rotorProgramHandler)


