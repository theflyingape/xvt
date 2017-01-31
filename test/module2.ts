import xvt = require('../xvt')

module module2
{

function start2() {
	xvt.out('modem = ', xvt.modem, '\n')
	xvt.app.focus = 'email'
}

function email() {
	if (xvt.validator.isEmail(xvt.entry)) {
		xvt.out('\nThat email address looks OK by me.')
		xvt.app.focus = 2
	}
	else
		xvt.app.refocus()
}

function fight() {
	switch(xvt.entry.toUpperCase()) {
		case 'A':
			xvt.out('ttack!')
			break
		case 'C':
			xvt.out(' -- you think you\'re Harry Potter?')
			break
		case 'R':
			xvt.out('un away')
			xvt.app.focus = 3
			return
	}
	xvt.app.refocus()
}

function logoff() {
	let yn = xvt.entry[0].toLowerCase()
	if (yn === 'y')
		xvt.hangup()
	else {
		xvt.out(' ... and why not?')
		xvt.app.refocus()
	}
}

xvt.app.form = {
	1: { cb:start2, pause:true },
	'email': { cb:email, prompt:'E-mail: ' },
	2: { cb:fight, prompt:'<A>ttack, <C>ast a spell, or <R>etreat: ', enter:'a', eol:false, match:/A|C|R/i },
	3: { cb:logoff, prompt:'Logoff (Yes/No)? ', match:/Y|N/i, eol:false, max:3 }
}
xvt.app.focus = 1

}