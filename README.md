# xvt
an event-driven terminal session handler from the app's shell


## Example
```
import xvt = require('xvt')

xvt.app.form = {
	'username': { cb:login, prompt:'Username: ', min:3, max:10 },
	'password': { cb:password, echo:false, min:6, timeout:300 }
	'email': { cb:email, prompt:'E-mail: ' },
	1: { cb:fight, prompt:'<A>ttack, <C>ast a spell, or <R>etreat: ', enter:'a', eol:false, match:/A|C|R/i },
	2: { cb:pause1, pause:true },
}

xvt.app.focus = 'username'
```

**class-validator** is loaded to assist with user input validation functions:
```
function email() {
	if (xvt.validator.isEmail(tty.entry)) {
		xvt.out('\nThat email address looks OK by me.')
		xvt.app.focus = 1
	}
	else
		xvt.app.refocus()
}
```
