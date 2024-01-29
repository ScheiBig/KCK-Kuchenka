/** @module definitions */

/**
 * Reprezentuje zestaw uchwytów do elementów `<div>`, zawierających wszystkie 6 ścian urządzenia.
 */
class Faces {
    /** 
     * Górna ściana urządzenia
     * @type {HTMLDivElement}
     */
    up
    /** 
     * Dolna ściana urządzenia
     * @type {HTMLDivElement}
     */
    down
    /** 
     * Lewa ściana urządzenia
     * @type {HTMLDivElement}
     */
    left
    /** 
     * Prawa ściana urządzenia
     * @type {HTMLDivElement}
     */
    right
    /** 
     * Przednia ściana urządzenia
     * @type {HTMLDivElement}
     */
    front
    /** 
     * Tylna ściana urządzenia
     * @type {HTMLDivElement}
     */
    back
}

/**
 * Reprezentuje zestaw uchwytów do elementów `<div>`, zawierających ściany sąsiadujące z daną
 * ścianą. Nazwy ścian reprezentują kierunek przejścia między nimi.
 */
class FaceNode {
    /**
     * Bieżąca ściana
     * @type {HTMLDivElement}
     */
    face
    /** 
     * Ściana w górę
     * @type {FaceNode}
     */
    up
    /** 
     * Ściana w dół
     * @type {FaceNode}
     */
    down
    /** 
     * Ściana w lewo
     * @type {FaceNode}
     */
    left
    /** 
     * Ściana w prawo
     * @type {FaceNode}
     */
    right
}

/**
 * Reprezentuje graf przejść między kolejnymi ścianami urządzenia.
 */
class FaceGraph {
    /** 
     * Górny węzeł urządzenia
     * @type {FaceNode} 
     */
    up
    /** 
     * Dolny węzeł urządzenia
     * @type {FaceNode} 
     */
    down
    /** 
     * Lewy węzeł urządzenia
     * @type {FaceNode} 
     */
    left
    /** 
     * Prawy węzeł urządzenia
     * @type {FaceNode} 
     */
    right
    /** 
     * Przedni węzeł urządzenia
     * @type {FaceNode} 
     */
    front
    /** 
     * Tylny węzeł urządzenia
     * @type {FaceNode} 
     */
    back
}

export {
    Faces,
    FaceNode,
    FaceGraph
}
