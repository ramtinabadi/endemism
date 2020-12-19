"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.printSuccess = exports.printError = exports.copyPackageToProject = exports.getProjectPackagePath = exports.removeProjectPackage = exports.doesPackageExists = exports.getProjectDetail = exports.registerPackage = exports.writeRegistry = exports.readRegistry = void 0;
// Node
var fs_1 = __importDefault(require("fs"));
// Third Party
var fs_extra_1 = __importDefault(require("fs-extra"));
/**
 * Reads and parses the content of the global registry
 */
function readRegistry(mode, globalRegistryURL, projectRegistryURL) {
    try {
        var rawData = fs_1.default.readFileSync(mode == "global" ? globalRegistryURL : projectRegistryURL);
        return JSON.parse(rawData.toString());
    }
    catch (error) {
        return null;
    }
}
exports.readRegistry = readRegistry;
/**
 * Reads and parses the content of the current project's registry
 */
function writeRegistry(data, mode, globalRegistryURL, projectRegistryURL) {
    try {
        fs_1.default.writeFileSync(mode == "global" ? globalRegistryURL : projectRegistryURL, typeof data == 'string' ? data : JSON.stringify(data));
        return true;
    }
    catch (error) {
        return false;
    }
}
exports.writeRegistry = writeRegistry;
/**
 * Registers a package into the global registry
 * @param name The name of package to be registered in the registry
 * @param path The absolute path of package
 * @param version The version of the package
 */
function registerPackage(name, path, version, globalRegistryURL, projectRegistryURL) {
    // Get the existing data from the registry
    var data = readRegistry("global", globalRegistryURL, projectRegistryURL);
    // Create a registry if it cannot be found
    if (data == null) {
        fs_1.default.writeFileSync(globalRegistryURL, JSON.stringify({}));
        data = readRegistry("global", globalRegistryURL, projectRegistryURL);
    }
    // Checking if the package is already registered or not
    if (name in data) {
        // Check if the package has the same version number or not.
        if (data[name].version == version) {
            printSuccess("The package is already registered!");
            return;
        }
        else
            data[name].version = version;
    }
    else {
        // Adding the package to the registry for the first time
        data[name] = {
            path: path,
            version: version
        };
    }
    fs_1.default.writeFile(globalRegistryURL, JSON.stringify(data), function () {
        printSuccess("'" + name + "=" + version + "' is successfully registered to the registry!");
    });
}
exports.registerPackage = registerPackage;
/**
 * Tries and gets the detail of the current node package from its `package.json` file
 * If the `package.json` file does not exist or can't be read, the returned value will be null
 */
function getProjectDetail(path) {
    if (path === void 0) { path = './'; }
    try {
        var files = fs_1.default.readdirSync(path);
        if (files.includes('package.json')) {
            var packageJSONPath = path[path.length - 1] == '/' ? path + "package.json" : path + "/package.json";
            var data = fs_1.default.readFileSync(packageJSONPath);
            var packageDetails = JSON.parse(data.toString());
            return { name: packageDetails.name, version: packageDetails.version };
        }
        else {
            return null;
        }
    }
    catch (error) {
        return null;
    }
}
exports.getProjectDetail = getProjectDetail;
function doesPackageExists(name, makeNodeModules) {
    var hasNodeModules = fs_1.default.existsSync('./node_modules');
    if (!hasNodeModules) {
        if (makeNodeModules)
            fs_1.default.mkdirSync('./node_modules');
        return false;
    }
    else {
        var alreadyExistsinNodeModules = fs_1.default.existsSync(getProjectPackagePath(name));
        if (alreadyExistsinNodeModules) {
            return true;
        }
        return false;
    }
}
exports.doesPackageExists = doesPackageExists;
function removeProjectPackage(name) {
    var path = getProjectPackagePath(name);
    var hasPackage = fs_1.default.existsSync(path);
    if (hasPackage) {
        try {
            fs_extra_1.default.removeSync(path);
            return true;
        }
        catch (error) {
            return false;
        }
    }
    else {
        printError("No package name " + name + " was found");
    }
    return false;
}
exports.removeProjectPackage = removeProjectPackage;
function getProjectPackagePath(name) {
    return './node_modules/' + (name[0] == "@" ? name.split('/')[0] + "/" + name : name);
}
exports.getProjectPackagePath = getProjectPackagePath;
/**
 * Copies a package from the global registry into the project's node_modules
 * @param name The name of the target package
 * @param data The content of the global registry
 */
function copyPackageToProject(name, data) {
    try {
        var files = fs_1.default.readdirSync(data[name].path, { withFileTypes: true });
        fs_1.default.mkdirSync(getProjectPackagePath(name));
        files.map(function (file) {
            if (file.name != '.git' && file.name != '.gitignore') {
                fs_extra_1.default.copySync(data[name].path + "/" + file.name, getProjectPackagePath(name) + "/" + file.name);
            }
        });
        return true;
    }
    catch (error) {
        return false;
    }
}
exports.copyPackageToProject = copyPackageToProject;
// Debuging Functions
/**
 * Prints an error message to the console with the red font color
 * @param error The error message to be printed in the console
 */
function printError(error) {
    // Follows this: https://stackoverflow.com/a/27111061/6026516
    console.error('\x1b[31m', error, '\x1b[0m');
}
exports.printError = printError;
/**
 * Prints an success message to the console with the green font color
 * @param success The success message to be printed in the console
 */
function printSuccess(success) {
    // Follows this: https://stackoverflow.com/a/27111061/6026516
    console.error('\x1b[32m', success, '\x1b[0m');
}
exports.printSuccess = printSuccess;
