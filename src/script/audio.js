/** @module audio */

import { MathX } from "./utils.js"

/** Węzeł Audio dla palnika 1 */
const hob1mp3 = new Audio("./resources/Palnik.mp3")
/** Kontekst Audio dla palnika 1 */
const hob1ctx = new AudioContext()
/** Graf Ścieżki Audio dla palnika 1 */
const hob1trc = hob1ctx.createMediaElementSource(hob1mp3)
/** Dostrajanie Stereo Audio dla palnika 1 */
const hob1spn = new StereoPannerNode(hob1ctx, { pan: 0 })

hob1mp3.loop = true
hob1spn.pan.value = -1
hob1trc.connect(hob1spn)
    .connect(hob1ctx.destination)

/** Węzeł Audio dla palnika 2 */
const hob2mp3 = new Audio("./resources/Palnik.mp3")
/** Kontekst Audio dla palnika 2 */
const hob2ctx = new AudioContext()
/** Graf Ścieżki Audio dla palnika 2 */
const hob2trc = hob2ctx.createMediaElementSource(hob2mp3)
/** Dostrajanie Stereo Audio dla palnika 2 */
const hob2spn = new StereoPannerNode(hob2ctx, { pan: 0 })

hob2mp3.loop = true
hob2spn.pan.value = -0.4
hob2trc.connect(hob2spn)
    .connect(hob2ctx.destination)

/** Węzeł Audio dla palnika 3 */
const hob3mp3 = new Audio("./resources/Palnik.mp3")
/** Kontekst Audio dla palnika 3 */
const hob3ctx = new AudioContext()
/** Graf Ścieżki Audio dla palnika 3 */
const hob3trc = hob3ctx.createMediaElementSource(hob3mp3)
/** Dostrajanie Stereo Audio dla palnika 3 */
const hob3spn = new StereoPannerNode(hob3ctx, { pan: 0 })

hob3mp3.loop = true
hob3spn.pan.value = 0.4
hob3trc.connect(hob3spn)
    .connect(hob3ctx.destination)

/** Węzeł Audio dla palnika 4 */
const hob4mp3 = new Audio("./resources/Palnik.mp3")
/** Kontekst Audio dla palnika 4 */
const hob4ctx = new AudioContext()
/** Graf Ścieżki Audio dla palnika 4 */
const hob4trc = hob4ctx.createMediaElementSource(hob4mp3)
/** Dostrajanie Stereo Audio dla palnika 4 */
const hob4spn = new StereoPannerNode(hob4ctx, { pan: 0 })

hob4mp3.loop = true
hob4spn.pan.value = 1
hob4trc.connect(hob4spn)
    .connect(hob4ctx.destination)

/** Węzeł Audio dla iskrownika */
const sparkmp3 = new Audio("./resources/Iskrownik.mp3")

sparkmp3.volume = 0.5


/** Węzeł Audio dla termoobiegu */
const rotormp3 = new Audio("./resources/Termoobieg-11.mp3")
/** Kontekst Audio dla termoobiegu */
const rotorctx = new AudioContext()
/** Graf Ścieżki Audio dla termoobiegu */
const rotortrc = rotorctx.createMediaElementSource(rotormp3)
/** Filtr dolnoprzepustowy Audio dla termoobiegu */
const rotorbqf = rotorctx.createBiquadFilter()

rotormp3.loop = true
rotorbqf.type = "lowpass"
rotorbqf.frequency.value = 1500
rotortrc.connect(rotorbqf)
    .connect(rotorctx.destination)

/**
 * Interfejs dostępu do najważniejszych obiektów do sterowania efektami dźwiękowymi
 */
class AudioInterface {

    /**
     * Lista ścieżek audio dla palników gazowych
     */
    static get hobs() {
        return [ hob1mp3, hob2mp3, hob3mp3, hob4mp3 ]
    }

    /**
     * Ścieżka audio iskrownika
     */
    static get spark() {
        return sparkmp3
    }

    /**
     * Ścieżka audio termoobiegu
     */
    static get rotor() {
        return rotormp3
    }

    /**
     * Ustawia wartość filtra dolnoprzepustowego audio termoobiegu
     * @param {number} value Wartość mocy filtra (0-1)
     */
    static set rotorLPF(value) {
        let v = MathX.clip(0, value, 1)
        rotorbqf.frequency.value = 1500 + 16500 * value
    }

    /**
     * Przywraca uprawnienia do startu wszystkim aktualnie zablokowanym kontekstom
     */
    static resumeCTX() {
        if (hob1ctx.state === "suspended") { hob1ctx.resume() }
        if (hob2ctx.state === "suspended") { hob2ctx.resume() }
        if (hob3ctx.state === "suspended") { hob3ctx.resume() }
        if (hob4ctx.state === "suspended") { hob4ctx.resume() }
        if (rotorctx.state === "suspended") { rotorctx.resume() }
    }
}

export default AudioInterface

window[ "--audio--" ] = AudioInterface
