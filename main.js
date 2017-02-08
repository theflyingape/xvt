"use strict";
const xvt = require("../xvt");
var main;
(function (main) {
    function start() {
        xvt.app.focus = 'username';
    }
    function login() {
        let username = xvt.entry.toUpperCase();
        xvt.app.form['password'].prompt = `Enter ${username} password: `;
        xvt.app.focus = 'password';
    }
    function password() {
        xvt.out('\nPassword entered was "', xvt.entry, '"\n');
        require('./module2');
    }
    xvt.modem = true;
    xvt.app.form = {
        'pause': { cb: start, pause: true },
        'username': { cb: login, prompt: 'Username: ', min: 3, max: 10 },
        'password': { cb: password, echo: false, min: 4, timeout: 150 }
    };
    xvt.app.focus = 'pause';
})(main || (main = {}));
