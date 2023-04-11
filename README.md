<div align="center">
  <h1>Tribal Wars 2 Overflow - Automating the boring stuff.</h1>
  <h3>Fork of <a href="https://gitlab.com/relaxeaza/twoverflow">TW2Overflow</a></h3>
  <img src="share/logo/banner.png" alt="tw2overflow-banner" />
</div>

## Current modules

<dl>
  <dt>FarmOverflow</dt>
  <dd>Highly configurable automatic farmer.</dd>

  <dt>CommandQueue</dt>
  <dd>Automatic command sender with options to specify the date it should arrive or leave village.</dd>

  <dt>AutoCollector</dt>
  <dd>Automatically collect deposit and build the initial second village.</dd>

  <dt>Minimap</dt>
  <dd>Better world map visibility.</dd>

  <dt>BuilderQueue</dt>
  <dd>Automatically build villages using custom sequences of buildings.</dd>

  <dt>AttackView</dt>
  <dd>Better overview of incoming commands.</dd>

  <dt>AutoMinter</dt>
  <dd>Automatically mint coins periodically.</dd>

  <dt>AutoSpyRecruiter</dt>
  <dd>Automatically recruit spies periodically.</dd>
</dl>

## Installation

WIP

## Contributing

### Code Quality

TW2Overflow uses [ESLint](https://eslint.org/) to keep the code consistent. Please use it before making pull requests.<br/>
You can check the rules enforced [here](.eslint).

### Build

You'll need to install [nodejs](https://nodejs.org/en/download/) to build the script from source.

Clone the repository and install the dependencies.

```bash
git clone https://gitlab.com/relaxeaza/twoverflow.git
cd twoverflow
npm install
```

To compile run `node make.js`. The script will be compiled inside `dist/`

### Build Flags

You can use some flags to customize the resulting file.

- `--minify` to generate a minified file.
- `--ignore` to ignore specific modules by ID (check _module.json_ for ID).
- `--only` compile only a specific module by ID (check _module.json_ for ID).
- `--lint` check source for errors.
- `--extension` generate a WebExtension package.
- `--userscript` generate a userscript file.

Example: `node make.js --ignore=farm_overflow,minimap --minify` ignores both modules farm_overflow and minimap and will generate a minified file.