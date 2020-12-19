// Node
import fs from 'fs';

// Third Party
import fse from 'fs-extra';


// Types
export type RegsitryEntry = {
	path: string,
	version: string
}


/**
 * Reads and parses the content of the global registry
 */
export function readRegistry(mode: "global" | "project", globalRegistryURL: string, projectRegistryURL: string) {
	try {
		let rawData = fs.readFileSync(mode == "global" ? globalRegistryURL : projectRegistryURL);
		return JSON.parse(rawData.toString());
	} catch (error) {
		return null;
	}	
}


/**
 * Reads and parses the content of the current project's registry
 */
export function writeRegistry(data: {[key: string] : string} | string, mode: "global" | "project", globalRegistryURL: string, projectRegistryURL: string) : boolean {
	try {		
		fs.writeFileSync(mode == "global" ? globalRegistryURL : projectRegistryURL, typeof data == 'string' ? data : JSON.stringify(data));
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
export function registerPackage(name: string, path: string, version: string, globalRegistryURL: string, projectRegistryURL: string) {
	// Get the existing data from the registry
	let data: {[key: string]: RegsitryEntry} = readRegistry("global", globalRegistryURL, projectRegistryURL);
	
	// Create a registry if it cannot be found
	if (data == null) {
		fs.writeFileSync(globalRegistryURL, JSON.stringify({}));
		data = readRegistry("global", globalRegistryURL, projectRegistryURL);
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
	
	fs.writeFile(globalRegistryURL, JSON.stringify(data), () => {
		printSuccess(`'${name}=${version}' is successfully registered to the registry!`);		
	});
}


/**
 * Tries and gets the detail of the current node package from its `package.json` file
 * If the `package.json` file does not exist or can't be read, the returned value will be null
 */
export function getProjectDetail(path: string = './') : {name: string, version: string} | null {
	try {
		let files = fs.readdirSync(path);
		if (files.includes('package.json')) {
			let packageJSONPath = path[path.length - 1] == '/' ? `${path}package.json` : `${path}/package.json`;
			let data = fs.readFileSync(packageJSONPath);
			let packageDetails = JSON.parse(data.toString());
			return {name: packageDetails.name, version: packageDetails.version};
			
		}else {				
			return null;
		}

	} catch (error) {		
		return null;
	}
		
}



export function doesPackageExists(name: string, makeNodeModules: boolean) {
    let hasNodeModules = fs.existsSync('./node_modules');
	if (!hasNodeModules) {
        if (makeNodeModules) fs.mkdirSync('./node_modules');
        return false;
	}else {
		let alreadyExistsinNodeModules = fs.existsSync(getProjectPackagePath(name));
		if (alreadyExistsinNodeModules) {			
			return true;
        }
        return false;
	}
}



export function removeProjectPackage(name: string) {
    let path = getProjectPackagePath(name);
	let hasPackage = fs.existsSync(path);
	if (hasPackage) {
		try {
            fse.removeSync(path);
            return true;
		} catch (error) {				
			printError(`There was an error while uninstalling ${name}`);
			return false;
		}			
    }
    return false;
}



export function getProjectPackagePath(name: string) {
    return './node_modules/' + name[0] == "@" ? `${name.split('/')[0]}/${name}` : name;
}



/**
 * Copies a package from the global registry into the project's node_modules
 * @param name The name of the target package
 * @param data The content of the global registry
 */
export function copyPackageToProject(name: string, data: {[key: string]: RegsitryEntry}): boolean {

	try {
		let files: fs.Dirent[] = fs.readdirSync(data[name].path, {withFileTypes: true});
		fs.mkdirSync(getProjectPackagePath(name));	

		files.map((file:fs.Dirent) => {				
			if (file.name != '.git' && file.name != '.gitignore') {
				fse.copySync(data[name].path + "/" + file.name, `${getProjectPackagePath(name)}/${file.name}`);
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
export function printError(error: string) {
	// Follows this: https://stackoverflow.com/a/27111061/6026516
	console.error('\x1b[31m', error ,'\x1b[0m');
}


/**
 * Prints an success message to the console with the green font color
 * @param success The success message to be printed in the console
 */
export function printSuccess(success: string) {
	// Follows this: https://stackoverflow.com/a/27111061/6026516
	console.error('\x1b[32m', success ,'\x1b[0m');
}
