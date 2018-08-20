const promisify = require('util').promisify;
const fs = require('fs');
const os = require('os');
const realPath = promisify(fs.realpath);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);


let args;
let realPaths;

const FileType = {
    "MUSTACHE": "MUSTACHE",
    "DATA": "DATA"
}

const init = function () {
    try {
        args = process.argv.slice(2);

    } catch (error) {
        console.log(error);
    }
}

const getRealPaths = async function (arg) {
    try {
        const realPathPromises = [];

        args.forEach(async (value) => {
            if (!value.startsWith("-")) {
                realPathPromises.push(realPath(value));
            }
        });

        realPaths = await Promise.all(realPathPromises);

        return realPaths
    } catch (error) {
        Console.log("Wrong arguments");
    }
}

const getContents = async function (paths) {
    try {

        const contentPromises = [];

        paths.forEach(async path => contentPromises.push(readFile(path)));

        const buffers = await Promise.all(contentPromises);

        return buffers.map(buffer => buffer.toString());
    } catch (e) {
        console.log(e);
    };
}

const toFile = async function (datas, type) {
    try {
        const toFilePromises = [];

        datas.forEach((data, index) => {

            let futureFileName;
            switch (type) {
                case FileType.MUSTACHE:
                    futureFileName = realPaths[index].replace(/.xml$/, "_template.xml");
                    break;
                case FileType.DATA:
                    futureFileName = realPaths[index].replace(/.xml$/, "_data.json");
                    break;
            }

            console.log(futureFileName)

            toFilePromises.push(writeFile(futureFileName, data));
        })

        await Promise.all(toFilePromises);
    } catch (error) {
        console.log(error);
    }
};

const toMustache = function (contents) {
    try {
        const resultContents = [];

        contents.forEach(content => {

            content = content.replace(/<(.*)>([^<>]*)(<\/\1>)/gm, '{{#$1}}<$1>{{$1}}$3{{/$1}}');
            content = content.replace(/^(\s*)<(?!!--)([^<>/]*)>[^<]*$/gm, `$1{{#$2}}${os.EOL}$1<$2>`);
            content = content.replace(/^(\s*)<\/([^<>/]*)>[^<\n]*$/gm, `$1</$2>${os.EOL}$1{{/$2}}`);

            resultContents.push(content);
        })

        return resultContents;
    } catch (error) {
        console.log(error);
    }
}

const toObject = function (xmlContent) {
    const resultObject = {};

    xmlContent.replace(/<(.*)>([^]*)<\/\1>/gm, async (match, p1, p2) => {
        try {
            if (p2.match(/<(.*)>([^]*)<\/\1>/gm)) {
                const child = toObject(p2);
                resultObject[p1] = child;
            } else {
                resultObject[p1] = p2;
            }

        } catch (error) {
            console.error(error);
        }
    });

    return resultObject;
}

const toData = async function (contents) {
    try {
        const dataArrayPromise = [];

        contents.forEach(content => {
            const dataPromise = toObject(content);
            dataArrayPromise.push(dataPromise);
        })

        const objectArray = await Promise.all(dataArrayPromise);
        return objectArray.map(value => JSON.stringify(value, undefined, 2))
    } catch (error) {
        console.error(error);
    }
}

init();

if (!args.includes("-d") && !args.includes("-m")) {
    console.log("Hey, what do you want from me ?");
}

if (args.includes("-d")) {
    getRealPaths(args)
        .then(getContents)
        .then(toData)
        .then(result => {
            toFile(result, FileType.DATA);
        })
        .catch(console.error);
}

if (args.includes("-m")) {
    getRealPaths(args)
        .then(getContents)
        .then(toMustache)
        .then(result => {
            toFile(result, FileType.MUSTACHE);
        })
        .catch(console.error);
}

