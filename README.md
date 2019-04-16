# xvt

an asynchronous terminal session handler from the app's shell

## Example

```javascript
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

`class-validator` is loaded to assist with user input validation functions:

```javascript
function email() {
    if (xvt.validator.isEmail(xvt.entry)) {
        xvt.out('\nThat email address looks OK by me.')
        xvt.app.focus = 1
    }
    else
        xvt.app.refocus()
}
```

Terminal emulator conveniences:

* `dumb` - plain ASCII
* `VT` - VT220 monochrome 7-bit controls
* `PC` - ANSI color typically used with IBM CP850 encoding
* `XT` - ANSI color used with UTF-8 encoding

```javascript
const emulation = [ 'dumb', 'VT', 'PC', 'XT' ]
for (let e in emulation) {
    xvt.app.emulation = emulation[e]
    xvt.outln(xvt.magenta, xvt.app.LGradient, xvt.reverse, emulation[e], ' BANNER', xvt.noreverse, xvt.app.RGradient)
    xvt.out(xvt.red,'R', xvt.green,'G', xvt.blue,'B')
    xvt.outln(xvt.reset,' - ',xvt.bright,'bold ',xvt.normal,'normal',xvt.faint,' dim')
}
```