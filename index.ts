#!/usr/bin/env node

// Node
import os from "os";
import fs from 'fs';

// Third Party
import {Command} from "commander";
import fse from 'fs-extra';



// Internal
import {
	copyPackageToProject,
	getProjectDetail,
	printError,
	printSuccess,
	readRegistry,
	registerPackage,
	RegsitryEntry,
	writeRegistry,
	doesPackageExists
} from './utils';




let registryName = '.endemism_registry';
let globalRegistryURL = os.homedir() + '/' + registryName
let projectRegistryURL = './' + registryName;
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
		data = readRegistry(mode, globalRegistryURL, projectRegistryURL);

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
			registerPackage(projectDetail.name, process.cwd(), projectDetail.version, globalRegistryURL, projectRegistryURL);
		}		
	});





// Deregister
program
	.command('deregister [name]')
	.description("Deregisters the current node project (or project with the give name) and removes it from the global registry")
	.action((name: string) => {
		let data = readRegistry("global", globalRegistryURL, projectRegistryURL);

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
			let success = writeRegistry(data, "global", globalRegistryURL, projectRegistryURL);
			if (success) printSuccess(`${name} is removed from the global registry`);
			else printError(`There has been an error in removing ${name} from the global registry`);
		}else {
			printError("The target package is not registered");
		}

	});





// install
program
	.command('install [name]')
	.description("Installs a package from the global registry into the current project")
	.action((name: string) => {


		function _installPackage(n: string, gr: any, pr: any) {

			let exists = doesPackageExists(n, true);
			
			if (exists) {
				printError(`A directory called ${n} already exists among node modules!`);
				return pr;
			}

			// Copying the package from the global registry to the project's node_modules
			let isCopied = copyPackageToProject(n, gr);
			if (!isCopied) {
				printError(`There was an error while updating ${n}`);
				return pr;
			}

			// Updating the package's version in the project's registry
			pr[n] = gr[n].version;
			printSuccess(`${n}=${gr[n].version} is successfully installed!`);
			return pr;
		
			
		}


		// Reading the global registry
		let data = readRegistry("global", globalRegistryURL, projectRegistryURL);

		if (data == null) {
			printError("There was a problem reading the global registry!");
			return;
		}

		// Reading the current project
		let projectDetail = getProjectDetail();
		if (projectDetail == null) {
			printError("The current folder is not a node project!");
			console.log("Make sure to call the 'install' command only on your project folder");
			return;
		}


		// Reading the local registry of the project
		let projectRegistry = readRegistry("project", globalRegistryURL, projectRegistryURL);
		if (projectRegistry == null) {
			let madeProjectRegistry = writeRegistry({}, "project", globalRegistryURL, projectRegistryURL);
			if (madeProjectRegistry) projectRegistry = readRegistry("project", globalRegistryURL, projectRegistryURL);
			else {
				printError("There was an error while reading the project's registry!");
				return;
			}			
		}

		let toBeInstalled: string[] = [];

		if (name) {
			if (name in data == false) {
				printError("The target package is not registered");
				return;
			}
			toBeInstalled = [name];
		}else {
			toBeInstalled = Object.keys(projectRegistry);
		}


		toBeInstalled.forEach(p => {
			projectRegistry = _installPackage(p, data, projectRegistry);
		})

		writeRegistry(projectRegistry, "project", globalRegistryURL, projectRegistryURL);


	});





// Uninstall
program
	.command('uninstall <name>')
	.description("Uninstalls a package from the current project")
	.action((name: string) => {
		
		// Getting the content of the project's registry
		let data = readRegistry("project", globalRegistryURL, projectRegistryURL);

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
		writeRegistry(data, "project", globalRegistryURL, projectRegistryURL);

		
		printSuccess(`${name} is successfully uninstalled!`);

	});




// Update
program
	.command('update [name]')
	.description("Updating a package installed in the project! Pass a name to update a single package.")
	.option('-g, --global', "Passing this flag will update the versions of packages in the global registry.", false)
	.option('-a, --all', "Passing this flag will update global registry first and then the project registry. Passing this flag will cause endemism to ignore the name", false)
	.action((name: string, options: {global: boolean, all: boolean}) => {

		function _updateProject(n: string, projectRegistry: any) {
			
			// Getting the content of the global's registry			
			let globalRegistry = readRegistry("global", globalRegistryURL, projectRegistryURL);

			// Checking if the target package is in the project's registry
			if (projectRegistry == null || n in projectRegistry == false) {
				printError(`${n} is either not installed at all or not installed via endemism!`);
				return;				
			}
		
			// Checking if the package is up to date
			if (n in globalRegistry == false) {
				printError(`${n} is not registered in the global registry!`);
				return;
			}else {
				if (projectRegistry[n] == globalRegistry[n].version) {
					console.log(`${n} is already up to date!`);					
					return;
				}
			}

			// Checking if the package exists in the node_modules
			let hasPackage = fs.existsSync(`./node_modules/${n}`);
			if (!hasPackage) {
				printError(`There is a discrepancy between the local registry and contents of node_modules. Run 'install ${n}' or 'uninstall ${n}'`);
				return;
			}
		
			// Removing the old folder
			try {
				fse.removeSync(`./node_modules/${n}`);
			} catch (error) {				
				printError(`There was an error while updating ${n}`);
				return;
			}

			// Copying the package from the global registry to the project's node_modules
			let isCopied = copyPackageToProject(n, globalRegistry);
			if (!isCopied) {
				printError(`There was an error while updating ${n}`);
				return;
			}

			// Updating the package's version in the project's registry
			projectRegistry[n] = globalRegistry[n].version;
			writeRegistry(projectRegistry, "project", globalRegistryURL, projectRegistryURL);

		
			printSuccess(`${n} is successfully updated to ${globalRegistry[n].version}!`);
		}


		function _updateGlobal(n: string, globalRegistry: any) {			
			
			let pd = getProjectDetail(globalRegistry[n].path);
			if (globalRegistry[n].version == pd?.version) {
				console.log(`${n} is already up to date in the global registry!`);
				return
			}
			globalRegistry[n].version = pd == null ? globalRegistry[n].version : pd.version;
			writeRegistry(globalRegistry, "global", globalRegistryURL, projectRegistryURL);

			printSuccess(`${n} is successfully updated in the global registry!`);
		}

		
		let target = name || 'all';
		let global = (options.all || options.global) ? true : false;
		let project = (options.all || !options.global) ? true : false;	
		
		if (options.all) target = 'all';

		if (global) {
			console.log("\nUpdating global registry...");
			let gr = readRegistry("global", globalRegistryURL, projectRegistryURL);
			
			if (gr == null) {
				console.log("Global's registry is empty");				
			}else {
				if (target != "all") _updateGlobal(target, gr);
				else {				
					Object.keys(gr).map((p: string) => _updateGlobal(p, gr));
				}
			}			
		}
		
		if (project) {
			console.log("\nUpdating project registry...");
			let pr = readRegistry("project", globalRegistryURL, projectRegistryURL);
			
			if (pr == null) {
				console.log("Project's registry is empty");
			}else {
				if (target != 'all') _updateProject(target, pr);
				else {				
					Object.keys(pr).map((p: string) => _updateProject(p, pr));
				}
			}		
		}
		
		console.log('\n');

	});






program.parse(process.argv);




