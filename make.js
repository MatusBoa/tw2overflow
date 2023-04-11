const fs = require('fs');
const glob = require('glob');
const path = require('path');
const archiver = require('archiver');
const pkg = require('./package.json');
const argv = require('yargs').argv;
const LANG_ID_SOURCE = 'en_us';
const SUCCESS = 0;
const LINT_ERROR = 1;
const LESS_ERROR = 2;
const MINIFY_ERROR = 3;
const timeStart = Date.now();
let makeTime;

const moduleOnly = argv.only ? argv.only.split(/,\s?/g) : [];
const modulesIgnore = argv.ignore ? argv.ignore.split(/,\s?/g) : [];

const overflow = generateOverflowModule();

// optional packages
let notifySend;

try {
    notifySend = require('node-notifier');
} catch (e) {}

function init () {
    fs.mkdirSync(path.join(__dirname, 'dist'), {
        recursive: true
    });

    let exitCode;

    lintCode()
        .then(concatCode)
        .then(compileLess)
        .then(minifyHTML)
        .then(generateLanguageFile)
        .then(replaceInFile(['dist', 'tw2overflow.js']))
        .then(minifyCode)
        .then(buildExtension)
        .then(buildUserscript)
        .then(function () {
            makeTime = Date.now() - timeStart;
            exitCode = SUCCESS;
            notifySuccess();
        })
        .catch(function (error) {
            makeTime = Date.now() - timeStart;
            console.log(error);
            exitCode = 1;
            notifyFail();
        })
        .finally(function () {
            fs.rmdirSync(path.join(__dirname, 'tmp'), {
                recursive: true
            });

            process.exit(exitCode);
        });
}

function lintCode () {
    return new Promise(function (resolve, reject) {
        if (!argv.lint) {
            return resolve();
        }

        console.log('Running lint');

        const eslint = require('eslint');
        const CLIEngine = eslint.CLIEngine;
        const cli = new CLIEngine;
        const lint = cli.executeOnFiles(path.join(__dirname, 'src'));

        if (lint.errorCount || lint.warningCount) {
            const formatter = cli.getFormatter();
            console.log(formatter(lint.results));
        }

        if (lint.errorCount) {
            reject(LINT_ERROR);
        } else {
            resolve();
        }
    });
}

function concatCode () {
    return new Promise(function (resolve) {
        console.log('Concatenating scripts');

        const code = overflow.js.map(function (file) {
            return fs.readFileSync(path.join(__dirname, file), 'utf8');
        });

        fs.writeFileSync(path.join(__dirname, 'dist', 'tw2overflow.js'), code.join('\n'), 'utf8');

        resolve();
    });
}

function compileLess () {
    return new Promise(function (resolve, reject) {
        console.log('Compiling styles');

        const lessPromises = [];

        for (const destination in overflow.css) {
            const sourceLocation = overflow.css[destination];
            const source = fs.readFileSync(path.join(__dirname, sourceLocation), 'utf8');
            const fileName = path.basename(destination);
            const destinationDir = path.join(__dirname, path.dirname(destination));

            fs.mkdirSync(destinationDir, {
                recursive: true
            });

            const promise = require('less').render(source, {
                compress: true
            }).then(function (output) {
                fs.writeFileSync(`${destinationDir}/${fileName}`, output.css, 'utf8');
            }).catch(function (error) {
                console.log(`\nError in ${sourceLocation} on line ${error.line} column ${error.column}:`);
                console.log(`${error.line-1} ${error.extract[0]}`);
                console.log(`${error.line} ${error.extract[1]}`);
                console.log(`${error.line+1} ${error.extract[2]}`);

                reject(LESS_ERROR);
            });

            lessPromises.push(promise);
        }

        Promise.all(lessPromises).then(function () {
            resolve();
        });
    });
}

function minifyHTML () {
    return new Promise(function (resolve) {
        console.log('Minifying templates');

        for (const destination in overflow.html) {
            const sourceLocation = overflow.html[destination];
            const source = fs.readFileSync(path.join(__dirname, sourceLocation), 'utf8');

            let output = require('html-minifier').minify(source, {
                removeRedundantAttributes: true,
                removeOptionalTags: true,
                collapseWhitespace: true,
                removeComments: true,
                removeTagWhitespace: false,
                quoteCharacter: '"'
            });

            // workaround! waiting https://github.com/terser/terser/issues/518
            output = output.replace(/"/g, '\\"');

            fs.writeFileSync(path.join(__dirname, destination), output, 'utf8');
        }

        resolve();
    });
}

function generateLanguageFile () {
    console.log('Merging i18n files');

    return new Promise(function (resolve, reject) {
        const languages = fs.readdirSync(path.join(__dirname, 'src', 'i18n'));
        const modules = [...getFilteredModules(), 'twoverflow'];
        const sources = getTranslationSources(modules);
        const translations = {};

        for (const languageId of languages) {
            translations[languageId] = {};

            for (const moduleId of modules) {
                const source = sources[moduleId];
                const translatedPath = path.join(__dirname, 'src', 'i18n', languageId, moduleId + '.json');

                if (fs.existsSync(translatedPath)) {
                    const translated = require(translatedPath);

                    translations[languageId] = {
                        ...translations[languageId],
                        ...mergeTranslationIntoSource(source, translated)
                    };
                } else {
                    translations[languageId] = {
                        ...translations[languageId],
                        ...source
                    };
                }
            }
        }

        const destination = path.join(__dirname, 'tmp', 'i18n.json');
        const stringifiedTranslations = JSON.stringify(translations, null, 4);
        fs.writeFileSync(destination, stringifiedTranslations, 'utf8');
        resolve();
    });
}

function replaceInFile (targetPath) {
    targetPath = path.join(__dirname, ...targetPath);

    return async function () {
        return new Promise(function (resolve) {
            console.log('Replacing values in %s', targetPath);

            const delimiters = ['___', ''];
            let target = fs.readFileSync(targetPath, 'utf8');
            let search;
            let replace;
            const ordered = {
                file: {},
                text: {}
            };

            for (search in overflow.replaces) {
                replace = overflow.replaces[search];

                if (replace.slice(0, 11) === '~read-file:') {
                    ordered.file[search] = fs.readFileSync(path.join(__dirname, replace.slice(11)), 'utf8');
                } else {
                    ordered.text[search] = replace;
                }
            }

            for (search in ordered.file) {
                replace = ordered.file[search];
                search = `${delimiters[0]}${search}${delimiters[1]}`;

                target = replaceText(target, search, replace);
            }

            for (search in ordered.text) {
                replace = ordered.text[search];
                search = `${delimiters[0]}${search}${delimiters[1]}`;

                target = replaceText(target, search, replace);
            }

            fs.writeFileSync(targetPath, target, 'utf8');

            resolve();
        });
    };
}

function minifyCode () {
    return new Promise(function (resolve, reject) {
        if (!argv.minify) {
            return resolve();
        }

        console.log('Compressing script');

        const minified = require('terser').minify({
            'tw2overflow.js': fs.readFileSync(path.join(__dirname, 'dist', 'tw2overflow.js'), 'utf8')
        }, {
            output: {
                quote_style: 3, // note: it's not working
                max_line_len: 1000
            }
        });
        
        if (minified.error) {
            const error = minified.error;

            console.log('\n' + error.filename);
            console.log(`${error.line}:${error.col}  ${error.name}  ${error.message}\n`);

            return reject(MINIFY_ERROR);
        }

        fs.writeFileSync(path.join(__dirname, 'dist', 'tw2overflow.min.js'), minified.code, 'utf8');
        resolve();
    });
}

// function getTranslationEntries (translation) {
//     let entries = 0

//     for (let category in translation) {
//         for (let key in translation[category]) {
//             if (translation[category][key]) {
//                 entries++
//             }
//         }
//     }

//     return entries
// }

function mergeTranslationIntoSource (source, translation) {
    const merged = {};

    for (const [category, strings] of Object.entries(source)) {
        merged[category] = {};

        for (const [key, string] of Object.entries(strings)) {
            merged[category][key] = translation[category][key]
                ? translation[category][key]
                : string;
        }
    }

    return merged;
}

// function getTranslationStatus (moduleId, translationId, source, translation) {
//     let status = {
//         valid: true,
//         msg: 'Valid translation'
//     }

//     for (let category in source) {
//         if (!hasOwn.call(translation, category)) {
//             status.valid = false
//             status.msg = `Translation "${translationId}" from module "${moduleId}" missing category: ${category}`
//         }

//         for (let key in source[category]) {
//             if (!hasOwn.call(translation[category], key)) {
//                 status.valid = false
//                 status.msg = `Translation "${translationId}" from module "${moduleId}" missing key: ${category}:${key}`
//             }
//         }
//     }

//     return status
// }

function generateModule (moduleId, moduleDir) {
    console.log(`Generating module "${moduleId}"`);

    const modulePath = `/src/modules/${moduleDir}`;
    const data = {
        id: moduleId,
        dir: moduleDir,
        js: [],
        css: [],
        html: [],
        replaces: {},
        lang: false
    };

    // Load module info file
    if (fs.existsSync(path.join(__dirname, modulePath, 'module.json'))) {
        const modulePackage = JSON.parse(fs.readFileSync(path.join(__dirname, modulePath, 'module.json'), 'utf8'));

        for (const key in modulePackage) {
            data.replaces[`${moduleId}_${key}`] = modulePackage[key];
        }
    } else {
        return console.error(`Module "${moduleId}" is missing "module.json"`);
    }

    // Load the main js source
    if (fs.existsSync(path.join(__dirname, modulePath, 'src', 'core.js'))) {
        data.js.push(`${modulePath}/src/core.js`);
    } else {
        return console.error(`Module "${moduleId}" is missing "core.js"`);
    }

    // Load all complementaty js sources
    const source = glob.sync(path.join(__dirname, modulePath, 'src', '*.js'), {
        ignore: [
            path.join(__dirname, modulePath, 'src', 'core.js'),
            path.join(__dirname, modulePath, 'src', 'init.js')
        ]
    });

    source.forEach(function (filePath) {
        data.js.push(filePath.replace(__dirname, ''));
    });

    // Load the initialization source
    if (fs.existsSync(path.join(__dirname, modulePath, 'src', 'init.js'))) {
        data.js.push(path.join(modulePath, 'src', 'init.js'));
    } else {
        return console.error(`Module "${moduleId}" is missing "init.js"`);
    }

    // Load assets, if exists
    if (fs.existsSync(path.join(__dirname, modulePath, 'assets'))) {
        data.html = glob.sync(path.join(__dirname, modulePath, 'assets', '*.html')).map(function (htmlPath) {
            return htmlPath.replace(__dirname, '');
        });
        data.css = glob.sync(path.join(__dirname, modulePath, 'assets', '*.less')).map(function (cssPath) {
            return cssPath.replace(__dirname, '');
        });

        data.html.forEach(function (htmlPath) {
            htmlPath = htmlPath.replace(__dirname, '');

            const filename = path.basename(htmlPath, '.html');
            data.replaces[`${moduleId}_html_${filename}`] = htmlPath;
        });

        data.css.forEach(function (cssPath) {
            cssPath = cssPath.replace(__dirname, '');
            const filename = path.basename(cssPath, '.less');
            data.replaces[`${moduleId}_css_${filename}`] = cssPath;
        });
    }

    return data;
}

/**
 * Parse all modules inside /src/modules and generate info objects
 * from each with generateModule().
 */
function generateModules () {
    const modules = [];

    fs.readdirSync(path.join(__dirname, 'src', 'modules')).forEach(function (moduleDir) {
        if (!fs.existsSync(path.join(__dirname, 'src', 'modules', moduleDir, 'module.json'))) {
            return false;
        }

        const {id} = JSON.parse(fs.readFileSync(path.join(__dirname, 'src', 'modules', moduleDir, 'module.json'), 'utf8'));

        if (id !== 'interface') {
            if (moduleOnly.length && !moduleOnly.includes(id)) {
                return false;
            } else if (modulesIgnore && modulesIgnore.includes(id)) {
                return false;
            }
        }

        modules.push(generateModule(id, moduleDir));
    });

    return modules;
}

function generateOverflowModule () {
    const modules = generateModules();

    // Store information from all modules as a single module to be build.
    const overflow = {
        js: [],
        html: {},
        css: {},
        replaces: {},
        lang: {}
    };

    overflow.js = overflow.js.concat([
        `/src/header.js`,
        `/src/event-scope.js`,
        `/src/debug.js`,
        `/src/utils.js`,
        `/src/ready.js`,
        `/src/language.js`,
        `/src/settings.js`,
        `/src/map-data.js`,
        `/src/ui.js`,
        `/src/init.js`,
        `/src/libs/lockr.js`,
        `/src/libs/numbered.js`,
        `/src/libs/human-interval.js`
    ]);

    // Generate the common replaces
    overflow.replaces['overflow_name'] = pkg.name;
    overflow.replaces['overflow_description'] = pkg.description;
    overflow.replaces['overflow_version'] = pkg.version + (argv.dev ? '-dev' : '');
    overflow.replaces['overflow_author_name'] = pkg.author.name;
    overflow.replaces['overflow_author_url'] = pkg.author.url;
    overflow.replaces['overflow_author_email'] = pkg.author.email;
    overflow.replaces['overflow_author'] = JSON.stringify(pkg.author);
    overflow.replaces['overflow_date'] = new Date().toUTCString();
    overflow.replaces['overflow_lang'] = `~read-file:/tmp/i18n.json`;

    // Move all modules information to a single module (overflow)
    modules.forEach(function (module) {
        // js
        overflow.js = overflow.js.concat(module.js);

        // html
        module.html.forEach(function (htmlPath) {
            overflow.html[`/tmp${htmlPath}`] = htmlPath;
        });

        // css
        module.css.forEach(function (lessPath) {
            const cssPath = lessPath.replace(/\.less$/, '.css');
            overflow.css[`/tmp${cssPath}`] = lessPath;
        });

        // lang
        if (module.lang) {
            overflow.replaces[`${module.id}_lang`] = `~read-file:/tmp/src/modules/${module.dir}/lang/lang.json`;
        }

        // replaces
        for (const id in module.replaces) {
            const value = module.replaces[id];

            // If the replace value is a file, create a template to
            // grunt replace later.
            if (fs.existsSync(path.join(__dirname, value))) {
                let filePath = value;
                const ext = path.extname(value);

                if (ext === '.less') {
                    filePath = filePath.replace(/\.less$/, '.css');
                }

                // lang replaces already have the temporary path included.
                if (id !== `${module.id}_lang`) {
                    filePath = `/tmp${filePath}`;
                }

                overflow.replaces[id] = `~read-file:${filePath}`;
            } else {
                overflow.replaces[id] = value;
            }   
        }
    });

    overflow.js.push(`/src/footer.js`);

    // Load core assets, if exists
    if (fs.existsSync(path.join(__dirname, 'src', 'assets'))) {
        fs.mkdirSync(path.join(__dirname, 'tmp', 'src', 'assets'), {
            recursive: true
        });

        glob.sync(path.join(__dirname, 'src', 'assets', '*.html')).forEach(function (htmlPath) {
            htmlPath = htmlPath.replace(__dirname, '');

            const filename = path.basename(htmlPath, '.html');

            overflow.replaces[`overflow_html_${filename}`] = `~read-file:/tmp${htmlPath}`;
            overflow.html[path.join(__dirname, 'tmp', htmlPath)] = path.join(__dirname, htmlPath);
        });

        glob.sync(path.join(__dirname, 'src', 'assets', '*.less')).forEach(function (lessPath) {
            lessPath = lessPath.replace(__dirname, '');

            const filename = path.basename(lessPath, '.less');

            overflow.replaces[`overflow_css_${filename}`] = `~read-file:/tmp${lessPath}`;
            overflow.css[`/tmp${lessPath}`] = `${lessPath}`;
        });
    }

    return overflow;
}

function replaceText (source, token, replace) {
    let index = 0;

    do {
        source = source.replace(token, replace);
    } while((index = source.indexOf(token, index + 1)) > -1);

    return source;
}

function notifySuccess () {
    console.log('\nBuild finished in', makeTime, 'ms');

    notifySend && notifySend.notify({
        title: 'TWOverflow',
        message: 'Build complete',
        timeout: 1000
    });
}

function notifyFail () {
    console.log('\nBuild failed in', makeTime, 'ms');

    notifySend && notifySend.notify({
        title: 'TWOverflow',
        message: 'Build failed',
        timeout: 2000
    });
}

function buildExtension () {
    return new Promise(function (resolve) {
        if (!argv.extension) {
            return resolve();
        }

        console.log('Building extension');

        const manifest = fs.readFileSync(path.join(__dirname, 'share', 'extension', 'manifest.json'), 'utf8')
            .replace('${name}', pkg.title)
            .replace('${version}', pkg.version)
            .replace('${description}', pkg.description)
            .replace('${author.name}', pkg.author.name)
            .replace('${author.email}', pkg.author.email)
            .replace('${homepage}', pkg.repository.url);

        fs.mkdirSync(path.join(__dirname, 'dist', 'extension'), {recursive: true});
        fs.writeFileSync(path.join(__dirname, 'dist', 'extension', 'manifest.json'), manifest);
        fs.copyFileSync(
            path.join(__dirname, 'share', 'extension', 'loader.js'),
            path.join(__dirname, 'dist', 'extension', 'loader.js')
        );
        fs.copyFileSync(
            path.join(__dirname, 'share', 'logo', 'logo.png'),
            path.join(__dirname, 'dist', 'extension', 'overflow.png')
        );
        fs.copyFileSync(
            path.join(__dirname, 'share', 'logo', 'logo-128.png'),
            path.join(__dirname, 'dist', 'extension', 'overflow-128.png')
        );
        fs.copyFileSync(
            path.join(__dirname, 'dist', 'tw2overflow.js'),
            path.join(__dirname, 'dist', 'extension', 'tw2overflow.js')
        );

        const output = fs.createWriteStream(path.join(__dirname, 'dist', 'extension.zip'));
        const archive = archiver('zip');

        output.on('end', resolve);
        output.on('finish', resolve);
        output.on('close', resolve);

        archive.on('warning', function (err) {
            throw err;
        });

        archive.pipe(output);
        archive.directory(path.join(__dirname, 'dist', 'extension'), false);
        archive.finalize();
    });
}

function buildUserscript () {
    return new Promise(async function (resolve) {
        if (!argv.userscript) {
            return resolve();
        }

        console.log('Building userscript');

        const metaTarget = path.join(__dirname, 'share', 'userscript', 'meta.js');
        const metaDest = path.join(__dirname, 'dist', 'tw2overflow.meta.js');
        const overflowBase = path.join(__dirname, 'dist', 'tw2overflow.js');

        fs.mkdirSync(path.join(__dirname, 'tmp', 'userscript'), {recursive: true});
        fs.copyFileSync(metaTarget, metaDest);

        await replaceInFile(['dist', 'tw2overflow.meta.js'])();

        const meta = fs.readFileSync(metaDest, 'utf8');
        const userscript = [metaDest, overflowBase].map(file => fs.readFileSync(file, 'utf8')).join('\n');

        fs.writeFileSync(path.join(__dirname, 'dist', 'tw2overflow.user.js'), userscript, 'utf8');
        fs.writeFileSync(path.join(__dirname, 'dist', 'tw2overflow.meta.js'), meta, 'utf8');

        resolve();
    });
}

function onlyModulesFilter (id) {
    if (moduleOnly.length) {
        return moduleOnly.includes(id);
    } else {
        return true;
    }
}

function ignoreModulesFilter (id) {
    return !modulesIgnore.includes(id);
}

function getFilteredModules () {
    return fs.readdirSync(path.join(__dirname, 'src', 'modules'))
        .filter(ignoreModulesFilter)
        .filter(onlyModulesFilter);
}

function getTranslationSources (modules) {
    const sources = {};

    for (const moduleId of modules) {
        const filePath = path.join(__dirname, 'src', 'i18n', LANG_ID_SOURCE, moduleId + '.json');

        if (fs.existsSync(filePath)) {
            sources[moduleId] = require(filePath);
        }
    }

    return sources;
}

init();
