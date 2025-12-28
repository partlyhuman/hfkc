import {HandsFreeKnitCounter} from "./HandsFreeKnitCounter";

const $ = (str: string) => document.querySelector(str)!!;
const server = new HandsFreeKnitCounter();

// @ts-ignore
window['hfkc'] = server;

$('#pair').addEventListener('click', async () => {
    await server.request();
    console.log('requested');
});

$('#connect').addEventListener('click', async () => {
    server.addEventListener('update', (e) => {
        const {rowCount, stitchCount} = (e as CustomEvent).detail;
        $('#knit-count').innerHTML = stitchCount.toString();
        $('#row-count').innerHTML = rowCount.toString();
    });
    await server.connect();
    console.log('connected');
});