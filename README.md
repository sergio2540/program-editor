# It makes writting CrowdProcess Programs faster ;)

It's not an editor, it's supposed to be used to test how CrowdProcess Programs behave in the worker environment. Assertions work, its good to test data units, it reloads when stuff changes.

Tomorrow I'll add buttons to test a Data Unit as soon as the `Run` function changes, and a `Benchmark` button.

## Instructions

Will add proper instructions tomorrow, but it should be used like this:

1. Clone this repository;
2. `npm install`;
3. Edit `src/program.js`. Better yet, do some `npm link` magic and require a program that you're developing elsewhere, probably started with [program-boilerplate](https://github.com/CrowdProcess/program-boilerplate);
4. Run `grunt watch --force` (needs --force because the worker does not pass jshint (and really can't));
5. Run `npm run-script live` for the live-server;
6. Edit `program.js` normally, watch for the results in the window;

### Gotchas
1. Actually `npm link`ing some other program and requiring it in `src/program.js` won't work with `live-server`, since that file is not the one changing. Maybe a real symlink ? Maybe scaffolding `program-boilerplate` inside `live/program` ?

2. I was planning on using the regular node assert library, and it works, but I wish it gave prettier output...

3. source maps don't work inside Web Workers :'(
