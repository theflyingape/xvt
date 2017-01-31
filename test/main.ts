import xvt = require('../xvt')

module main
{

function start() {
	xvt.app.focus = 'username'
}

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
xvt.app.form = {
	'pause': { callback:start, pause:true },
	'username': { prompt:'Username: ', callback:login, min:3, max:10 },
	'password': { callback:password, echo:false, min:4, timeout:150 }
}
xvt.app.focus = 'pause'

}
