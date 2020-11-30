import xvt = require('../xvt')

process.on('uncaughtException', (err, origin) => {
    xvt.outln(`${origin} ${err}`)
})

module main {

	function login() {
		let username = xvt.entry.toUpperCase()
		xvt.app.form['password'].prompt = `Enter ${username} password: `
		xvt.app.focus = 'password'
	}

	function password() {
		xvt.out('\nPassword entered was "', xvt.entry, '"\n')
		require('./module2')
	}

	xvt.ondrop = () => {
		console.log('\nNice ... \n')
	}

	xvt.defaultTimeout = 30
	xvt.modem = true
	xvt.sessionAllowed = 200

	xvt.app.form = {
		'enq': {
			cb: () => {
				console.log('ENQ response =', xvt.entry.split('').map((c) => { return c.charCodeAt(0) }))

				xvt.app.emulation = 'PC'
				xvt.outln('\nPC: ', xvt.app.Empty, xvt.app.Draw)

				xvt.app.emulation = 'VT'
				xvt.outln('\nVT: ', xvt.app.Empty, '\x1B(0', xvt.app.Draw, '\x1B(B')

				xvt.app.emulation = 'XT'
				xvt.outln('\nXT: ', xvt.app.Empty, xvt.app.Draw)

				xvt.app.focus = 'pause'
			}, cancel:'\x05', prompt: '\x1B[6n', enq: true
		},
		'pause': {
			cb: () => {
				xvt.outln('\nPress any key including function and control keys.  RETURN or ESCape when done.')
				xvt.app.focus = 'cook'
			}, pause: true, timeout: 10
		},
		'cook': {
			cb: () => {
				xvt.out(`You pressed '${xvt.terminator == '\r' ? '[CR]' : xvt.terminator}' = `
					, xvt.entry.split('').map((c) => { return c.charCodeAt(0) }))
				xvt.app.focus = xvt.terminator == '\r' || xvt.terminator == '[ESC]' ? 'username' : 'cook'
			}, cancel:' ', echo: false,  eol: false, timeout: 20
		},
		'username': { cb: login, prompt: 'Username: ', min: 3, max: 10 },
		'password': { cb: password, echo: false, min: 4, timeout: 15 }
	}

	xvt.outln('Testing xvt outputs:\n')
	xvt.outln(xvt.magenta, xvt.app.LGradient, xvt.reverse, ' BANNER', xvt.noreverse, xvt.app.RGradient, -500)
	xvt.out(xvt.red, 'R', -100, xvt.green, 'G', -100, xvt.blue, 'B', -100)
	xvt.outln(xvt.reset, ' - ', -100, xvt.bright, 'bold ', -100, xvt.normal, 'normal ', -100, xvt.blink, 'flash ', xvt.noblink, -100, xvt.faint, 'dim', -500)

	xvt.outln(-1000)
	xvt.out('Request terminal device status ')
	xvt.app.focus = 'enq'
}
