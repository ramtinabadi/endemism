#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Node
var os_1 = __importDefault(require("os"));
var fs_1 = __importDefault(require("fs"));
// Third Party
var commander_1 = require("commander");
var fs_extra_1 = __importDefault(require("fs-extra"));
var registryName = '.endemism_registry';
var globalRegistry = os_1.default.homedir() + '/' + registryName;
var projectRegistry = './' + registryName;
var program = new commander_1.Command();
// General CLI
program.version('0.0.1');
// List
program
    .command('list')
    .description("Lists the name and versions of the package in registry")
    .option('-g, --global', "Lists the packages in the global registry", true)
    .option('-p, --project', "Lists the packages in the project registry", false)
    .action(function (options) {
    var mode = options.project ? "project" : "global";
    var data;
    // Getting the appropriate registry based on the given option
    data = readRegistry(mode);
    // Inform the user that the registry is empty
    if (data == null || data == {} || Object.keys(data).length == 0) {
        console.log("\n" + mode + " registry is empty\n");
        return;
    }
    // Displaying the list of packages with their version
    console.log("\nPackages registered in the " + mode + " registry:");
    Object.keys(data).sort().map(function (packageName) {
        console.log(packageName + "=" + (mode == "global" ? data[packageName].version : data[packageName]));
    });
    console.log('\n');
});
// Register
program
    .command('register')
    .description("Registers the current node project into the global registry")
    .action(function () {
    var projectDetail = getProjectDetail();
    if (projectDetail == null) {
        printError("The 'package.json' file could not be found.");
        console.log("Make sure to call the 'register' command only in your node project folder");
    }
    else {
        registerPackage(projectDetail.name, process.cwd(), projectDetail.version);
    }
});
// Deregister
program
    .command('deregister [name]')
    .description("Deregisters the current node project (or project with the give name) and removes it from the global registry")
    .action(function (name) {
    var data = readRegistry("global");
    if (data == null) {
        printError("The target package is not registered");
        return;
    }
    if (!name) {
        var projectDetail = getProjectDetail();
        if (projectDetail == null) {
            printError("The 'package.json' file could not be found.");
            console.log("Make sure to call the 'deregister' command only in your node project folder");
            return;
        }
        else {
            name = projectDetail.name;
        }
    }
    if (name in data) {
        delete data[name];
        var success = writeRegistry(data, "global");
        if (success)
            printSuccess(name + " is removed from the global registry");
        else
            printError("There has been an error in removing " + name + " from the global registry");
    }
    else {
        printError("The target package is not registered");
    }
});
// install
program
    .command('install [name]')
    .description("Installs a package from the global registry into the current project")
    .action(function (name) {
    function _installPackage(n, gr, pr) {
        var hasNodeModules = fs_1.default.existsSync('./node_modules');
        if (!hasNodeModules) {
            var madeNodeModules = fs_1.default.mkdirSync('./node_modules');
        }
        else {
            var alreadyExistsinNodeModules = fs_1.default.existsSync('./node_modules/' + n);
            if (alreadyExistsinNodeModules) {
                printError("A directory called " + n + " already exists among node modules!");
                return;
            }
        }
        // Copying the package from the global registry to the project's node_modules
        var isCopied = copyPackageToProject(n, gr);
        if (!isCopied) {
            printError("There was an error while updating " + n);
            return;
        }
        // Updating the package's version in the project's registry
        pr[n] = gr[n].version;
        printSuccess(n + "=" + gr[n].version + " is successfully installed!");
        return pr;
    }
    // Reading the global registry
    var data = readRegistry("global");
    if (data == null) {
        printError("There was a problem reading the global registry!");
        return;
    }
    // Reading the current project
    var projectDetail = getProjectDetail();
    if (projectDetail == null) {
        printError("The current folder is not a node project!");
        console.log("Make sure to call the 'install' command only on your project folder");
        return;
    }
    // Reading the local registry of the project
    var projectRegistry = readRegistry("project");
    if (projectRegistry == null) {
        var madeProjectRegistry = writeRegistry({}, "project");
        if (madeProjectRegistry)
            projectRegistry = readRegistry("project");
        else {
            printError("There was an error while reading the project's registry!");
            return;
        }
    }
    var toBeInstalled = [];
    if (name) {
        if (name in data == false) {
            printError("The target package is not registered");
            return;
        }
        toBeInstalled = [name];
    }
    else {
        toBeInstalled = Object.keys(projectRegistry);
    }
    toBeInstalled.forEach(function (p) {
        projectRegistry = _installPackage(p, data, projectRegistry);
    });
    writeRegistry(projectRegistry, "project");
});
// Uninstall
program
    .command('uninstall <name>')
    .description("Uninstalls a package from the current project")
    .action(function (name) {
    // Getting the content of the project's registry
    var data = readRegistry("project");
    // Checking if the target package is in the project's registry
    if (data == null || name in data == false) {
        printError("The target package is either not installed at all or not installed via endemism!");
        return;
    }
    // Deleting the package folder from node_modules
    var hasPackage = fs_1.default.existsSync("./node_modules/" + name);
    if (hasPackage) {
        try {
            fs_extra_1.default.removeSync("./node_modules/" + name);
        }
        catch (error) {
            printError("There was an error while uninstalling " + name);
            return;
        }
    }
    // Removing the package from the project's entry
    delete data[name];
    writeRegistry(data, "project");
    printSuccess(name + " is successfully uninstalled!");
});
// Update
program
    .command('update [name]')
    .description("Updating a package installed in the project! Pass a name to update a single package.")
    .option('-g, --global', "Passing this flag will update the versions of packages in the global registry.", false)
    .option('-a, --all', "Passing this flag will update global registry first and then the project registry. Passing this flag will cause endemism to ignore the name", false)
    .action(function (name, options) {
    function _updateProject(n, projectRegistry) {
        // Getting the content of the global's registry			
        var globalRegistry = readRegistry("global");
        // Checking if the target package is in the project's registry
        if (projectRegistry == null || n in projectRegistry == false) {
            printError(n + " is either not installed at all or not installed via endemism!");
            return;
        }
        // Checking if the package is up to date
        if (n in globalRegistry == false) {
            printError(n + " is not registered in the global registry!");
            return;
        }
        else {
            if (projectRegistry[n] == globalRegistry[n].version) {
                console.log(n + " is already up to date!");
                return;
            }
        }
        // Checking if the package exists in the node_modules
        var hasPackage = fs_1.default.existsSync("./node_modules/" + n);
        if (!hasPackage) {
            printError("There is a discrepancy between the local registry and contents of node_modules. Run 'install " + n + "' or 'uninstall " + n + "'");
            return;
        }
        // Removing the old folder
        try {
            fs_extra_1.default.removeSync("./node_modules/" + n);
        }
        catch (error) {
            printError("There was an error while updating " + n);
            return;
        }
        // Copying the package from the global registry to the project's node_modules
        var isCopied = copyPackageToProject(n, globalRegistry);
        if (!isCopied) {
            printError("There was an error while updating " + n);
            return;
        }
        // Updating the package's version in the project's registry
        projectRegistry[n] = globalRegistry[n].version;
        writeRegistry(projectRegistry, "project");
        printSuccess(n + " is successfully updated to " + globalRegistry[n].version + "!");
    }
    function _updateGlobal(n, globalRegistry) {
        var pd = getProjectDetail(globalRegistry[n].path);
        if (globalRegistry[n].version == (pd === null || pd === void 0 ? void 0 : pd.version)) {
            console.log(n + " is already up to date in the global registry!");
            return;
        }
        globalRegistry[n].version = pd == null ? globalRegistry[n].version : pd.version;
        writeRegistry(globalRegistry, "global");
        printSuccess(n + " is successfully updated in the global registry!");
    }
    var target = name || 'all';
    var global = (options.all || options.global) ? true : false;
    var project = (options.all || !options.global) ? true : false;
    if (options.all)
        target = 'all';
    if (global) {
        console.log("\nUpdating global registry...");
        var gr_1 = readRegistry("global");
        if (gr_1 == null) {
            console.log("Global's registry is empty");
        }
        else {
            if (target != "all")
                _updateGlobal(target, gr_1);
            else {
                Object.keys(gr_1).map(function (p) { return _updateGlobal(p, gr_1); });
            }
        }
    }
    if (project) {
        console.log("\nUpdating project registry...");
        var pr_1 = readRegistry("project");
        if (pr_1 == null) {
            console.log("Project's registry is empty");
        }
        else {
            if (target != 'all')
                _updateProject(target, pr_1);
            else {
                Object.keys(pr_1).map(function (p) { return _updateProject(p, pr_1); });
            }
        }
    }
    console.log('\n');
});
program.parse(process.argv);
// Common Functions ******************************************************
/**
 * Reads and parses the content of the global registry
 */
function readRegistry(mode) {
    try {
        var rawData = fs_1.default.readFileSync(mode == "global" ? globalRegistry : projectRegistry);
        return JSON.parse(rawData.toString());
    }
    catch (error) {
        return null;
    }
}
/**
 * Reads and parses the content of the current project's registry
 */
function writeRegistry(data, mode) {
    try {
        fs_1.default.writeFileSync(mode == "global" ? globalRegistry : projectRegistry, typeof data == 'string' ? data : JSON.stringify(data));
        return true;
    }
    catch (error) {
        return false;
    }
}
/**
 * Registers a package into the global registry
 * @param name The name of package to be registered in the registry
 * @param path The absolute path of package
 * @param version The version of the package
 */
function registerPackage(name, path, version) {
    // Get the existing data from the registry
    var data = readRegistry("global");
    // Create a registry if it cannot be found
    if (data == null) {
        fs_1.default.writeFileSync(globalRegistry, JSON.stringify({}));
        data = readRegistry("global");
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
    fs_1.default.writeFile(globalRegistry, JSON.stringify(data), function () {
        printSuccess("'" + name + "=" + version + "' is successfully registered to the registry!");
    });
}
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
/**
 * Copies a package from the global registry into the project's node_modules
 * @param name The name of the target package
 * @param data The content of the global registry
 */
function copyPackageToProject(name, data) {
    try {
        var files = fs_1.default.readdirSync(data[name].path, { withFileTypes: true });
        fs_1.default.mkdirSync('./node_modules/' + name);
        files.map(function (file) {
            if (file.name != '.git' && file.name != '.gitignore') {
                fs_extra_1.default.copySync(data[name].path + "/" + file.name, "./node_modules/" + name + "/" + file.name);
            }
        });
        return true;
    }
    catch (error) {
        return false;
    }
}
// Debuging Functions
/**
 * Prints an error message to the console with the red font color
 * @param error The error message to be printed in the console
 */
function printError(error) {
    // Follows this: https://stackoverflow.com/a/27111061/6026516
    console.error('\x1b[31m', error, '\x1b[0m');
}
/**
 * Prints an success message to the console with the green font color
 * @param success The success message to be printed in the console
 */
function printSuccess(success) {
    // Follows this: https://stackoverflow.com/a/27111061/6026516
    console.error('\x1b[32m', success, '\x1b[0m');
}
