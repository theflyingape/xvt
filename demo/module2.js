"use strict";
const io_1 = require("./io");
var module2;
(function (module2) {
    function start2() {
        io_1.io.outln('modem = ', io_1.io.modem);
        io_1.io.focus = 'email';
    }
    function email() {
        io_1.io.focus = 'message';
    }
    function message() {
        io_1.io.out(io_1.io.entry);
        io_1.io.focus = 2;
    }
    function fight() {
        switch (io_1.io.entry.toUpperCase()) {
            case 'A':
                io_1.io.out('ttack!');
                break;
            case 'C':
                io_1.io.out(io_1.io.magenta, io_1.io.bright, ` -- you think `, -250, io_1.io.normal, `you're Harry `, -250, io_1.io.faint, `Potter?`, -250);
                io_1.io.drain();
                break;
            case 'R':
                io_1.io.outln('un away');
                io_1.io.focus = 3;
                return;
        }
        io_1.io.refocus();
    }
    function logoff() {
        io_1.io.outln();
        let yn = io_1.io.entry[0].toLowerCase();
        if (yn === 'y') {
            io_1.io.reason = 'logged off';
            io_1.io.hangup();
        }
        else {
            io_1.io.outln(' ... and why not?');
            io_1.io.focus = 2;
        }
    }
    io_1.io.form = {
        1: { cb: start2, pause: true },
        'email': { cb: email, prompt: 'E-mail: ' },
        'message': { cb: message, lines: 5, prompt: 'Send a message', timeout: 60 },
        2: { cb: fight, prompt: '<A>ttack, <C>ast a spell, or <R>etreat: ', cancel: 'r', enter: 'a', eol: false, match: /A|C|R/i, timeout: 8 },
        3: { cb: logoff, prompt: 'Logoff (Yes/No)? ', cancel: 'y', enter: 'n', match: /Y|N/i, max: 3, timeout: 10 }
    };
    io_1.io.focus = 1;
})(module2 || (module2 = {}));
module.exports = module2;
//# sourceMappingURL=module2.js.map