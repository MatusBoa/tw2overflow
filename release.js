let git

try {
    git = require('git-promise')
} catch (e) {
    console.log('You need to install the package "git-promise".')
    process.exit(1)
}

const projectRoot = __dirname.replace(/\\/g, '/')
const fs = require('fs')
const package = JSON.parse(fs.readFileSync(`${projectRoot}/package.json`, 'utf8'))
const argv = require('yargs').argv

const cdnPath = `${projectRoot}/share/cdn`
const releasesPath = `${cdnPath}/public/releases`
const testingPath = `${releasesPath}/testing`

const gitOptions = {
    cwd: `${cdnPath}/`
}

function run () {
    if (argv.testing) {
        deployTesting()
    } else if (argv.production) {
        deployProduction()
    }
}

function copyFiles (files, ignoreSame) {
    if (!ignoreSame) {
        for (let original in files) {
            const destination = files[original]

            if (fs.existsSync(destination)) {
                const originalBuffer = fs.readFileSync(original)
                const destinationBuffer = fs.readFileSync(destination)

                return !originalBuffer.equals(destinationBuffer)
            }
        }
    }

    for (let original in files) {
        const destination = files[original]
        console.log(`Copying ${original} to ${destination}`)
        fs.copyFileSync(original, destination)
    }

    return true
}

function gitAdd () {
    console.log('Running git add')

    return git('add --all', gitOptions)
        .fail(function () {
            console.log('git add failed.')
        })
}

function gitCommit () {
    console.log('Running git commit')

    return git(`commit --message "Update testing version"`, gitOptions)
        .fail(function (error) {
            console.log('git commit failed.')
            console.log(error.stdout)
        })
}

function gitPush () {
    console.log('Running git push')
    
    return git('push', gitOptions)
        .fail(function (error) {
            console.log('git push fail')
            console.log(error.stdout)
        })
}

function gitDeploy () {
    console.log('')

    gitAdd()
    .then(gitCommit)
    .then(gitPush)
    .then(function () {
        console.log('')
        console.log('Done')
    })
}

function deployTesting () {
    let files = {}
    files[`${projectRoot}/dist/tw2overflow.js`] = `${testingPath}/tw2overflow.js`
    files[`${projectRoot}/dist/tw2overflow.min.js`] = `${testingPath}/tw2overflow.min.js`

    const copied = copyFiles(files, true)

    if (copied) {
        gitDeploy()
    } else {
        console.log('Testing version is already the last build.')
    }
}

function deployProduction () {
    if (fs.existsSync(`${releasesPath}/${package.version}`)) {
        console.log(`v${package.version} is already in the repository.`)
        return false
    }

    console.log(`Creating directory ${releasesPath}/${package.version}`)

    fs.mkdirSync(`${releasesPath}/${package.version}`, {
        recursive: true
    })

    copyFiles({
        'dist/tw2overflow.js': `${releasesPath}/${package.version}/tw2overflow.js`,
        'dist/tw2overflow.min.js': `${releasesPath}/${package.version}/tw2overflow.min.js`
    }, true)

    copyFiles({
        'dist/tw2overflow.js': `${releasesPath}/latest/tw2overflow.js`,
        'dist/tw2overflow.min.js': `${releasesPath}/latest/tw2overflow.min.js`
    }, true)

    gitDeploy(`v${package.version} release`)
}

run()
