# It makes writting CrowdProcess Programs faster ;)

It's not an editor, it's supposed to be used to test how CrowdProcess Programs behave in the worker environment. Assertions work, its good to test data units, it reloads when stuff changes.

## Instructions

1. Install it globally

    `npm install -g git+https://github.com/CrowdProcess/program-editor.git`

2. Run it

    `program-editor -p path/to/your/program.js`

3. Open your browser on `https://localhost:8081`

4. Put something on the input field.

5. Change your `program.js`, and the web page will reload and run your
program with the data unit you supplied in step 4 right away. If should
also report errors and timings.

### Gotchas

* The line numbers of the error reports are not ok, I cannot provide a proper view-source link, or get source maps to work on web workers. So yes the error reporting is sad.

* If this is not a browserified bundle, your Run function must be at the top
of your `program.js`, because of the messed up way it's concatenated when the
Web Worker is built. This will be fixed in the next versions. So your `program.js` file should really start with `function Run (dataUnit) {....}`.
