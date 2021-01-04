import { xvt } from '../xvt'
import { io } from './io'

module module2 {

	function start2() {
		io.outln('modem = ', io.modem)
		io.focus = 'email'
	}

	function email() {
		io.focus = 'message'
	}

	function message() {
		io.out(io.entry)
		io.focus = 2
	}

	function fight() {
		switch (io.entry.toUpperCase()) {
			case 'A':
				io.out('ttack!')
				break
			case 'C':
				io.out(io.magenta, io.bright, ` -- you think `, -250
					, io.normal, `you're Harry `, -250
					, io.faint, `Potter?`, -250)
				io.drain()
				break
			case 'R':
				io.outln('un away')
				io.focus = 3
				return
		}
		io.refocus()
	}

	function logoff() {
		io.outln()

		let yn = io.entry[0].toLowerCase()
		if (yn === 'y') {
			io.reason = 'logged off'
			io.hangup()
		}
		else {
			io.outln(' ... and why not?')
			io.focus = 2
		}
	}

	io.form = {
		1: { cb: start2, pause: true },
		'email': { cb: email, prompt: 'E-mail: ' },
		'message': { cb: message, lines: 5, prompt: 'Send a message', timeout: 60 },
		2: { cb: fight, prompt: '<A>ttack, <C>ast a spell, or <R>etreat: ', cancel: 'r', enter: 'a', eol: false, match: /A|C|R/i, timeout: 8 },
		3: { cb: logoff, prompt: 'Logoff (Yes/No)? ', cancel: 'y', enter: 'n', match: /Y|N/i, max: 3, timeout: 10 }
	}

	io.focus = 1

}

export = module2
