process.title = 'demo'

process.on('uncaughtException', (err, origin) => {
	console.error(`${origin} ${err}`)
})

import { io } from './io'
io.defaultTimeout = 20
io.modem = true
io.sessionAllowed = 120
io.ondrop = () => {
	console.error(`\ndropped: ${io.reason || 'unknown'}\n`)
}

const npm = require('../package.json')

io.outln()
io.outln(io.black, io.bright, process.title, io.reset
	, ' running on ', io.green, 'Node.js ', io.normal, process.version
	, io.cyan, io.faint, ' (', io.normal, process.platform, io.faint, ')')
io.outln(io.red, npm.name, ` v${npm.version}`, io.reset, ` - ${npm.description}`)
io.outln(`(C) 2017-2022 ${npm.author}`)
io.outln(`${npm.license} licensed`)
io.outln()
io.outln('Testing xvt outputs:')
io.outln()
io.outln(io.magenta, io.LGradient, io.reverse, 'BANNER', io.noreverse, io.RGradient)
io.out(io.red, 'R', -200, io.green, 'G', -200, io.blue, 'B', -200, io.reset, ' - ')
io.outln(io.bright, 'bold ', -200, io.normal, 'normal ', -200, io.blink, 'flash ', io.noblink, -200, io.faint, 'dim', -200)

io.form = {
	'enq': {
		cb: () => {
			io.outln('ENQ response = ', io.entry.split('').map((c) => { return c.charCodeAt(0) }))

			io.emulation = 'PC'
			io.outln(`\nPC: ${io.Empty} `, io.Draw)

			io.emulation = 'VT'
			io.outln(`\nVT: ${io.Empty} `, io.Draw)

			io.emulation = 'PI'
			io.outln(`\nPI: ${io.Empty} `, io.Draw)

			io.emulation = 'XT'
			io.outln(`\nXT: ${io.Empty} `, io.Draw)

			io.pause('cook', 5, () => {
				io.outln('Press any key including function and control keys.')
				io.outln('Ctrl-D (soft) or Ctrl-Z (hard) disconnect, anytime')
				io.outln('RETURN ("DEFAULT") or ESCape ("CANCEL") when done.')
			})
		}, cancel: '\x05', prompt: '\x1B[5n', enq: true
	},
	'cook': {
		cb: () => {
			io.out(`You pressed '${io.terminator == '\r' ? '[CR]' : io.terminator}' = `
				, io.entry.split('').map((c) => { return c.charCodeAt(0) }))
			io.focus = io.terminator == '\r' || io.terminator == '[ESC]' ? 'username' : 'cook'
		}, cancel: 'CANCEL', enter: 'DEFAULT', echo: false, eol: false, timeout: 20
	},
	'username': { cb: login, prompt: 'Username: ', min: 3, max: 10 },
	'password': { cb: password, echo: false, min: 4, timeout: 15 }
}

io.out('Request terminal device status ')
io.focus = 'enq'

function login() {
	let username = io.entry.toUpperCase()
	io.form['password'].prompt = `Enter ${username} password: `
	io.focus = 'password'
}

function password() {
	io.out('\nPassword entered was "', io.entry, '"\n')
	require('./module2')
}
