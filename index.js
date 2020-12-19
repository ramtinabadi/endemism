#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Node
var os_1 = __importDefault(require("os"));
// Third Party
var commander_1 = require("commander");
// Internal
var utils_1 = require("./utils");
var registryName = '.endemism_registry';
var globalRegistryURL = os_1.default.homedir() + '/' + registryName;
var projectRegistryURL = './' + registryName;
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
    data = utils_1.readRegistry(mode, globalRegistryURL, projectRegistryURL);
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
    var projectDetail = utils_1.getProjectDetail();
    if (projectDetail == null) {
        utils_1.printError("The 'package.json' file could not be found.");
        console.log("Make sure to call the 'register' command only in your node project folder");
    }
    else {
        utils_1.registerPackage(projectDetail.name, process.cwd(), projectDetail.version, globalRegistryURL, projectRegistryURL);
    }
});
// Deregister
program
    .command('deregister [name]')
    .description("Deregisters the current node project (or project with the give name) and removes it from the global registry")
    .action(function (name) {
    var data = utils_1.readRegistry("global", globalRegistryURL, projectRegistryURL);
    if (data == null) {
        utils_1.printError("The target package is not registered");
        return;
    }
    if (!name) {
        var projectDetail = utils_1.getProjectDetail();
        if (projectDetail == null) {
            utils_1.printError("The 'package.json' file could not be found.");
            console.log("Make sure to call the 'deregister' command only in your node project folder");
            return;
        }
        else {
            name = projectDetail.name;
        }
    }
    if (name in data) {
        delete data[name];
        var success = utils_1.writeRegistry(data, "global", globalRegistryURL, projectRegistryURL);
        if (success)
            utils_1.printSuccess(name + " is removed from the global registry");
        else
            utils_1.printError("There has been an error in removing " + name + " from the global registry");
    }
    else {
        utils_1.printError("The target package is not registered");
    }
});
// install
program
    .command('install [name]')
    .description("Installs a package from the global registry into the current project")
    .action(function (name) {
    function _installPackage(n, gr, pr) {
        var exists = utils_1.doesPackageExists(n, true);
        if (exists) {
            utils_1.printError("A directory called " + n + " already exists among node modules!");
            return pr;
        }
        // Copying the package from the global registry to the project's node_modules
        var isCopied = utils_1.copyPackageToProject(n, gr);
        if (!isCopied) {
            utils_1.printError("There was an error while installing " + n);
            return pr;
        }
        // Updating the package's version in the project's registry
        pr[n] = gr[n].version;
        utils_1.printSuccess(n + "=" + gr[n].version + " is successfully installed!");
        return pr;
    }
    console.log("Installing...");
    // Reading the global registry
    var data = utils_1.readRegistry("global", globalRegistryURL, projectRegistryURL);
    if (data == null) {
        utils_1.printError("There was a problem reading the global registry!");
        return;
    }
    // Reading the current project
    var projectDetail = utils_1.getProjectDetail();
    if (projectDetail == null) {
        utils_1.printError("The current folder is not a node project!");
        console.log("Make sure to call the 'install' command only on your project folder");
        return;
    }
    // Reading the local registry of the project
    var projectRegistry = utils_1.readRegistry("project", globalRegistryURL, projectRegistryURL);
    if (projectRegistry == null) {
        var madeProjectRegistry = utils_1.writeRegistry({}, "project", globalRegistryURL, projectRegistryURL);
        if (madeProjectRegistry)
            projectRegistry = utils_1.readRegistry("project", globalRegistryURL, projectRegistryURL);
        else {
            utils_1.printError("There was an error while reading the project's registry!");
            return;
        }
    }
    var toBeInstalled = [];
    if (name) {
        if (name in data == false) {
            utils_1.printError("The target package is not registered");
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
    utils_1.writeRegistry(projectRegistry, "project", globalRegistryURL, projectRegistryURL);
});
// Uninstall
program
    .command('uninstall <name>')
    .description("Uninstalls a package from the current project")
    .action(function (name) {
    console.log("Uninstalling...");
    // Getting the content of the project's registry
    var data = utils_1.readRegistry("project", globalRegistryURL, projectRegistryURL);
    // Checking if the target package is in the project's registry
    if (data == null || name in data == false) {
        utils_1.printError("The target package is either not installed at all or not installed via endemism!");
        return;
    }
    var deleted = utils_1.removeProjectPackage(name);
    if (!deleted) {
        utils_1.printError("There was an error uninstalling " + name);
        return;
    }
    // Removing the package from the project's entry
    delete data[name];
    utils_1.writeRegistry(data, "project", globalRegistryURL, projectRegistryURL);
    utils_1.printSuccess(name + " is successfully uninstalled!");
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
        var globalRegistry = utils_1.readRegistry("global", globalRegistryURL, projectRegistryURL);
        // Checking if the target package is in the project's registry
        if (projectRegistry == null || n in projectRegistry == false) {
            utils_1.printError(n + " is either not installed at all or not installed via endemism!");
            return;
        }
        // Checking if the package is up to date
        if (n in globalRegistry == false) {
            utils_1.printError(n + " is not registered in the global registry!");
            return;
        }
        else {
            if (projectRegistry[n] == globalRegistry[n].version) {
                console.log(n + " is already up to date!");
                return;
            }
        }
        // Checking if the package exists in the node_modules
        var hasPackage = utils_1.doesPackageExists(n, false);
        if (!hasPackage) {
            utils_1.printError("There is a discrepancy between the local registry and contents of node_modules. Run 'install " + n + "' or 'uninstall " + n + "'");
            return;
        }
        // Removing the old folder
        var deleted = utils_1.removeProjectPackage(n);
        if (!deleted) {
            utils_1.printError("There was an error while updating " + n);
            return;
        }
        // Copying the package from the global registry to the project's node_modules
        var isCopied = utils_1.copyPackageToProject(n, globalRegistry);
        if (!isCopied) {
            utils_1.printError("There was an error while updating " + n);
            return;
        }
        // Updating the package's version in the project's registry
        projectRegistry[n] = globalRegistry[n].version;
        utils_1.writeRegistry(projectRegistry, "project", globalRegistryURL, projectRegistryURL);
        utils_1.printSuccess(n + " is successfully updated to " + globalRegistry[n].version + "!");
    }
    function _updateGlobal(n, globalRegistry) {
        var pd = utils_1.getProjectDetail(globalRegistry[n].path);
        if (globalRegistry[n].version == (pd === null || pd === void 0 ? void 0 : pd.version)) {
            console.log(n + " is already up to date in the global registry!");
            return;
        }
        globalRegistry[n].version = pd == null ? globalRegistry[n].version : pd.version;
        utils_1.writeRegistry(globalRegistry, "global", globalRegistryURL, projectRegistryURL);
        utils_1.printSuccess(n + " is successfully updated in the global registry!");
    }
    var target = name || 'all';
    var global = (options.all || options.global) ? true : false;
    var project = (options.all || !options.global) ? true : false;
    if (options.all)
        target = 'all';
    if (global) {
        console.log("\nUpdating global registry...");
        var gr_1 = utils_1.readRegistry("global", globalRegistryURL, projectRegistryURL);
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
        var pr_1 = utils_1.readRegistry("project", globalRegistryURL, projectRegistryURL);
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
