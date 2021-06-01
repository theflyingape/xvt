"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
process.title = 'demo';
process.on('uncaughtException', (err, origin) => {
    console.error(`${origin} ${err}`);
});
const io_1 = require("./io");
io_1.io.defaultTimeout = 20;
io_1.io.modem = true;
io_1.io.sessionAllowed = 120;
io_1.io.ondrop = () => {
    console.error(`\ndropped: ${io_1.io.reason || 'unknown'}\n`);
};
const npm = require('../package.json');
io_1.io.outln();
io_1.io.outln(io_1.io.black, io_1.io.bright, process.title, io_1.io.reset, ' running on ', io_1.io.green, 'Node.js ', io_1.io.normal, process.version, io_1.io.cyan, io_1.io.faint, ' (', io_1.io.normal, process.platform, io_1.io.faint, ')');
io_1.io.outln(io_1.io.red, npm.name, ` v${npm.version}`, io_1.io.reset, ` - ${npm.description}`);
io_1.io.outln(`(C) 2017-2021 ${npm.author}`);
io_1.io.outln(`${npm.license} licensed`);
io_1.io.outln();
io_1.io.outln('Testing xvt outputs:');
io_1.io.outln();
io_1.io.outln(io_1.io.magenta, io_1.io.LGradient, io_1.io.reverse, ' BANNER', io_1.io.noreverse, io_1.io.RGradient);
io_1.io.out(io_1.io.red, 'R', -200, io_1.io.green, 'G', -200, io_1.io.blue, 'B', -200, io_1.io.reset, ' - ');
io_1.io.outln(io_1.io.bright, 'bold ', -200, io_1.io.normal, 'normal ', -200, io_1.io.blink, 'flash ', io_1.io.noblink, -200, io_1.io.faint, 'dim', -200);
io_1.io.form = {
    'enq': {
        cb: () => {
            io_1.io.outln('ENQ response = ', io_1.io.entry.split('').map((c) => { return c.charCodeAt(0); }));
            io_1.io.emulation = 'PC';
            io_1.io.outln('\nPC: ', io_1.io.Empty, io_1.io.Draw);
            io_1.io.emulation = 'VT';
            io_1.io.outln('\nVT: ', io_1.io.Empty, '\x1B(0', io_1.io.Draw, '\x1B(B');
            io_1.io.emulation = 'XT';
            io_1.io.outln('\nXT: ', io_1.io.Empty, io_1.io.Draw);
            io_1.io.pause('cook', 5, () => {
                io_1.io.outln('Press any key including function and control keys.');
                io_1.io.outln('Ctrl-D for soft or Ctrl-Z for hard disconnect, anytime');
                io_1.io.outln('RETURN or ESCape when done.');
            });
        }, cancel: '\x05', prompt: '\x1B[6n', enq: true
    },
    'cook': {
        cb: () => {
            io_1.io.out(`You pressed '${io_1.io.terminator == '\r' ? '[CR]' : io_1.io.terminator}' = `, io_1.io.entry.split('').map((c) => { return c.charCodeAt(0); }));
            io_1.io.focus = io_1.io.terminator == '\r' || io_1.io.terminator == '[ESC]' ? 'username' : 'cook';
        }, cancel: ' ', echo: false, eol: false, timeout: 20
    },
    'username': { cb: login, prompt: 'Username: ', min: 3, max: 10 },
    'password': { cb: password, echo: false, min: 4, timeout: 15 }
};
io_1.io.out('Request terminal device status ');
io_1.io.focus = 'enq';
function login() {
    let username = io_1.io.entry.toUpperCase();
    io_1.io.form['password'].prompt = `Enter ${username} password: `;
    io_1.io.focus = 'password';
}
function password() {
    io_1.io.out('\nPassword entered was "', io_1.io.entry, '"\n');
    require('./module2');
}
