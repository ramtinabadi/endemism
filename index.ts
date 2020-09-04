#!/usr/bin/env node

// Node
import os from "os";
import fs from 'fs';

// Third Party
import {Command} from "commander";

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
			console.log(`${packageName}=${data[packageName].version}`);
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





// Unregister
program
	.command('deregister [name]')
	.description("Deregisters the current node project and removes it from the global registry")
	.action((name: string) => {
		let data = readRegistry("global");
		
		if (name) {
			if (name in data) {}
		}

		let projectDetail = getProjectDetail();

		if (projectDetail == null) {
			printError("The 'package.json' file could not be found.");
			console.log("Make sure to call the 'register' command only in your node project folder");
		}else {
			registerPackage(projectDetail.name, process.cwd(), projectDetail.version);
		}		
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
