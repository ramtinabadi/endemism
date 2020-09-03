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

		if (mode == "global") {
			console.log(readGlobalRegistry());
		}else {
			console.log(readProjectRegistry());
		}
	});


program.parse(process.argv);






// Common Functions
function readGlobalRegistry() {
	try {
		let rawData = fs.readFileSync(globalRegistry);
		return JSON.parse(rawData.toString());
	} catch (error) {
		return {};
	}	
}


function readProjectRegistry() {
	try {
		let rawData = fs.readFileSync(projectRegistry);
		return JSON.parse(rawData.toString());
	} catch (error) {
		return {};
	}
}