import xvt = require('../xvt')

module main
{

function login() {
	let username = xvt.entry.toUpperCase()
	xvt.app.form['password'].prompt = `Enter ${username} password: `
	xvt.app.focus = 'password'
}

function password() {
	xvt.out('\nPassword entered was "', xvt.entry, '"\n')
	require('./module2')
}

xvt.modem = true
xvt.pollingMS = 200
xvt.sessionAllowed = 60

xvt.app.form = {
	'enq': { cb:() => { 
		console.log('ENQ response =', xvt.entry.split('').map((c) => { return c.charCodeAt(0) }))
		xvt.app.focus = 'pause'
	}, prompt:'\x1B[6n', enq:true },
	'pause': { cb:() => { xvt.app.focus = 'username'}, pause:true },
	'username': { cb:login, prompt:'Username: ', min:3, max:10 },
	'password': { cb:password, echo:false, min:4, timeout:15 }
}
process.nextTick(() => { xvt.app.focus = 'enq' })

}
