#!/usr/bin/env node

// Node
import os from "os";
import fs from 'fs';

// Third Party
import {Command} from "commander";
import fse from 'fs-extra';

let registryName = '.endemism_registry';
let globalRegistry = os.homedir() + '/' + registryName
let projectRegistry = './' + registryName;
let program = new Command();


// General CLI
program.version('0.0.1');


// List
program
	.command('list')
	.description("Lists the name and versions of the package in registry")
	.option('-g, --global', "Lists the packages in the global registry", true)
	.option('-p, --project', "Lists the packages in the project registry", false)	
	.action((options: {global: boolean, project: boolean}) => {
		let mode : "global" | "project" = options.project ? "project" : "global";
		let data: {[key: string]: RegsitryEntry};
		
		// Getting the appropriate registry based on the given option
		data = readRegistry(mode);

		// Inform the user that the registry is empty
		if (data == null || data == {} || Object.keys(data).length == 0) {
			console.log(`\n${mode} registry is empty\n`);
			return;
		}

		// Displaying the list of packages with their version
		console.log(`\nPackages registered in the ${mode} registry:`);
		Object.keys(data).sort().map((packageName: string) => {
			console.log(`${packageName}=${mode == "global" ? data[packageName].version: data[packageName]}`);
		});
		console.log('\n');
	});




// Register
program
	.command('register')
	.description("Registers the current node project into the global registry")
	.action(() => {		
		let projectDetail = getProjectDetail();

		if (projectDetail == null) {
			printError("The 'package.json' file could not be found.");
			console.log("Make sure to call the 'register' command only in your node project folder");
		}else {
			registerPackage(projectDetail.name, process.cwd(), projectDetail.version);
		}		
	});





// Deregister
program
	.command('deregister [name]')
	.description("Deregisters the current node project (or project with the give name) and removes it from the global registry")
	.action((name: string) => {
		let data = readRegistry("global");

		if (data == null) {
			printError("The target package is not registered");
			return;
		}
		
		if (!name) {
			let projectDetail = getProjectDetail();
			if (projectDetail == null) {
				printError("The 'package.json' file could not be found.");
				console.log("Make sure to call the 'deregister' command only in your node project folder");
				return;
			}else {
				name = projectDetail.name;
			}			
		}

		if (name in data) {
			delete data[name];
			let success = writeRegistry(data, "global");
			if (success) printSuccess(`${name} is removed from the global registry`);
			else printError(`There has been an error in removing ${name} from the global registry`);
		}else {
			printError("The target package is not registered");
		}

	});





// install
program
	.command('install <name>')
	.description("Installs a package from the global registry into the current project")
	.action((name: string) => {
		let data = readRegistry("global");

		if (data == null || name in data == false) {
			printError("The target package is not registered");
			return;
		}

		let projectDetail = getProjectDetail();
		if (projectDetail == null) {
			printError("The current folder is not a node project!");
			console.log("Make sure to call the 'install' command only on your project folder");
			return;
		}

		let projectRegistry = readRegistry("project");
		if (projectRegistry == null) {
			let madeProjectRegistry = writeRegistry({}, "project");
			if (madeProjectRegistry) projectRegistry = readRegistry("project");
			else {
				printError("There was an error while reading the project's registry!");
				return;
			}			
		}

		if (data[name] in projectRegistry) {
			printError("The target package is already installed in the project!");
			return;
		}

		let hasNodeModules = fs.existsSync('./node_modules');
		if (!hasNodeModules) {
			let madeNodeModules = fs.mkdirSync('./node_modules');
		}else {
			let alreadyExistsinNodeModules = fs.existsSync('./node_modules/' + name);
			if (alreadyExistsinNodeModules) {
				printError(`A directory called ${name} already exists among node modules!`);
				return;
			}
		}

		fs.readdir(data[name].path, {withFileTypes: true}, (err: NodeJS.ErrnoException | null, files: fs.Dirent[]) => {
			if (err != null) {
				printError(`There is an error while reading files!`);
				return;
			}

			try {
				fs.mkdirSync('./node_modules/' + name);	
			} catch (error) {
				printError(`There is an error while Installing ${name}`);
				return;
			}
			

			files.map((file:fs.Dirent) => {				
				if (file.name != '.git' && file.name != '.gitignore') {
					fse.copySync(data[name].path + "/" + file.name, `./node_modules/${name}/${file.name}`);
				}
			});

			projectRegistry[name] = data[name].version;
			writeRegistry(projectRegistry, "project");

			printSuccess(`${name}=${data[name].version} is successfully installed!`);
		});

	});





// Uninstall
program
	.command('uninstall <name>')
	.description("Uninstalls a package from the current project")
	.action((name: string) => {
		
		// Getting the content of the project's registry
		let data = readRegistry("project");

		// Checking if the target package is in the project's registry
		if (data == null || name in data == false) {
			printError("The target package is either not installed at all or not installed via endemism!");
			return;
		}

		// Deleting the package folder from node_modules
		let hasPackage = fs.existsSync(`./node_modules/${name}`);
		if (hasPackage) {
			try {
				fse.removeSync(`./node_modules/${name}`);
			} catch (error) {				
				printError(`There was an error while uninstalling ${name}`);
				return;
			}			
		}

		// Removing the package from the project's entry
		delete data[name];
		writeRegistry(data, "project");

		
		printSuccess(`${name} is successfully uninstalled!`);

	});




// Update
program
	.command('update <name>]')
	.description("Updating a package installed in the project!")
	.action((name: string) => {
		
		// Getting the content of the project's registry
		let projectRegistry = readRegistry("project");
		let globalRegistry = readRegistry("global");

		// Checking if the target package is in the project's registry
		if (projectRegistry == null || name in projectRegistry == false) {
			printError("The target package is either not installed at all or not installed via endemism!");
			return;
		}
		
		if (name in globalRegistry == false) {
			printError(`${name} is not registered in the global registry!`);
			return;
		}else {
			if (projectRegistry[name] == globalRegistry[name].version) {
				printSuccess(`${name} is already up to date!`);
				return;
			}
		}

		// Checking if the package exists in the node_modules
		let hasPackage = fs.existsSync(`./node_modules/${name}`);
		if (!hasPackage) {
			printError(`There is a discrepancy between the local registry and contents of node_modules. Run 'install ${name}' or 'uninstall ${name}'`);
			return;
		}
		
		
		try {
			fse.removeSync(`./node_modules/${name}`);
		} catch (error) {				
			printError(`There was an error while updating ${name}`);
			return;
		}

		let isCopied =  copyPackageToProject(name, globalRegistry);
		if (!isCopied) {
			printError(`There was an error while updating ${name}`);
			return;
		}

		// Removing the package from the project's entry
		projectRegistry[name] = globalRegistry[name].version;
		writeRegistry(projectRegistry, "project");

		
		printSuccess(`${name} is successfully updated to ${globalRegistry[name].version}!`);

	});






program.parse(process.argv);





// Types
type RegsitryEntry = {
	path: string,
	version: string
}





// Common Functions ******************************************************


/**
 * Reads and parses the content of the global registry
 */
function readRegistry(mode: "global" | "project") {
	try {
		let rawData = fs.readFileSync(mode == "global" ? globalRegistry : projectRegistry);
		return JSON.parse(rawData.toString());
	} catch (error) {
		return null;
	}	
}


/**
 * Reads and parses the content of the current project's registry
 */
function writeRegistry(data: {[key: string] : string} | string, mode: "global" | "project") : boolean {
	try {		
		fs.writeFileSync(mode == "global" ? globalRegistry : projectRegistry, typeof data == 'string' ? data : JSON.stringify(data));
		return true;
	} catch (error) {
		return false;
	}
}


/**
 * Registers a package into the global registry
 * @param name The name of package to be registered in the registry
 * @param path The absolute path of package
 * @param version The version of the package
 */
function registerPackage(name: string, path: string, version: string) {
	// Get the existing data from the registry
	let data: {[key: string]: RegsitryEntry} = readRegistry("global");
	
	// Create a registry if it cannot be found
	if (data == null) {
		fs.writeFileSync(globalRegistry, JSON.stringify({}));
		data = readRegistry("global");
	}

	// Checking if the package is already registered or not
	if (name in data) {

		// Check if the package has the same version number or not.
		if (data[name].version == version) {
			printSuccess("The package is already registered!");
			return;
		}
		else data[name].version = version;
	}else {
		// Adding the package to the registry for the first time
		data[name] = {
			path: path,
			version: version
		}
	}
	
	fs.writeFile(globalRegistry, JSON.stringify(data), () => {
		printSuccess(`'${name}=${version}' is successfully registered to the registry!`);		
	});
}


/**
 * Tries and gets the detail of the current node package from its `package.json` file
 * If the `package.json` file does not exist or can't be read, the returned value will be null
 */
function getProjectDetail() : {name: string, version: string} | null {
	try {
		let files = fs.readdirSync('./');
		if (files.includes('package.json')) {
			
			let data = fs.readFileSync('./package.json');
			let packageDetails = JSON.parse(data.toString());
			return {name: packageDetails.name, version: packageDetails.version};
			
		}else {				
			return null;
		}

	} catch (error) {		
		return null;
	}
		
}



/**
 * Copies a package from the global registry into the project's node_modules
 * @param name The name of the target package
 * @param data The content of the global registry
 */
function copyPackageToProject(name: string, data: {[key: string]: RegsitryEntry}): boolean {

	try {
		let files: fs.Dirent[] = fs.readdirSync(data[name].path, {withFileTypes: true});
		fs.mkdirSync('./node_modules/' + name);	

		files.map((file:fs.Dirent) => {				
			if (file.name != '.git' && file.name != '.gitignore') {
				fse.copySync(data[name].path + "/" + file.name, `./node_modules/${name}/${file.name}`);
			}
		});

		return true;
	} catch (error) {
		return false;
	}
}






// Debuging Functions

/**
 * Prints an error message to the console with the red font color
 * @param error The error message to be printed in the console
 */
function printError(error: string) {
	// Follows this: https://stackoverflow.com/a/27111061/6026516
	console.error('\x1b[31m', error ,'\x1b[0m');
}


/**
 * Prints an success message to the console with the green font color
 * @param success The success message to be printed in the console
 */
function printSuccess(success: string) {
	// Follows this: https://stackoverflow.com/a/27111061/6026516
	console.error('\x1b[32m', success ,'\x1b[0m');
}
