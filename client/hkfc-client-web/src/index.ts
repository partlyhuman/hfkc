import {HandsFreeKnitCounter} from "./HandsFreeKnitCounter";

const $ = (str: string) => document.querySelector(str)!!;
const server = new HandsFreeKnitCounter();

// @ts-ignore
window['hfkc'] = server;

$('#connect').addEventListener('click', async () => {
    await server.pair();
    server.addEventListener('update', (e) => {
        const {rowCount, stitchCount} = (e as CustomEvent).detail;
        // or server.rowCount; server.stitchCount;
        $('#row-count').innerHTML = rowCount.toString();
        $('#stitch-count').innerHTML = stitchCount.toString();
    });
    await server.connect();
});

$('#reset').addEventListener('click', async () => {
    await server.resetCount();
});