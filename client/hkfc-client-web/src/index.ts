import {HandsFreeKnitCounter} from "./HandsFreeKnitCounter";

const $ = (str: string) => document.querySelector(str)!!;
const server = new HandsFreeKnitCounter();

// @ts-ignore Provide console access
window['hfkc'] = server;

// These elements can be relocated to another window
// where the document query is referring to the wrong document, so cache them
const $rowCount = $('#row-count');
const $stitchCount = $('#stitch-count');
const $controls = $('#controls');
let pip: Window | undefined;

$('#connect').addEventListener('click', async () => {
    await server.pair();
    server.addEventListener('update', (e) => {
        const {rowCount, stitchCount} = (e as CustomEvent).detail;
        // or server.rowCount; server.stitchCount;
        $rowCount.innerHTML = rowCount.toString();
        $stitchCount.innerHTML = stitchCount.toString();
    });
    await server.connect();
});
$('#reset').addEventListener('click', () => server.resetCount());
$('#undo').addEventListener('click', () => server.undo());
$('#reset-row').addEventListener('click', () => server.resetRow());

function handleKeyEvent({code}: KeyboardEvent) {
    switch (code) {
        case 'Backspace':
        case 'Delete':
        case 'KeyZ':
            server.undo().then();
            break;
        case 'Escape':
            pip?.close();
            break;
    }
}

window.addEventListener('keyup', (e) => handleKeyEvent(e as KeyboardEvent))

async function popout() {
    if (pip) return;
    const originalParent = $controls.parentElement!;
    // @ts-ignore I don't see a typing for this
    pip = await window.documentPictureInPicture.requestWindow({
        width: $controls.clientWidth,
        height: $controls.clientHeight,
    });
    // Move controls element to pip
    pip?.document.body.append($controls);
    // Clone stylesheets to pip
    document.querySelectorAll('style,link[rel="stylesheet"]').forEach(n => {
        pip?.document.head.appendChild(n.cloneNode(true));
    });
    // On pip close, return controls element
    pip?.addEventListener('pagehide', () => {
        originalParent.append($controls);
        pip = undefined;
    });
    // Add same key handlers to pip
    pip?.document.addEventListener('keyup', (e) => handleKeyEvent(e as KeyboardEvent));
}

if ('documentPictureInPicture' in window) {
    let $popout = $('#popout');
    $popout.classList.remove('hidden');
    $popout.addEventListener('click', popout);
    $controls.addEventListener('dblclick', popout);
}