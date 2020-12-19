export declare type RegsitryEntry = {
    path: string;
    version: string;
};
/**
 * Reads and parses the content of the global registry
 */
export declare function readRegistry(mode: "global" | "project", globalRegistryURL: string, projectRegistryURL: string): any;
/**
 * Reads and parses the content of the current project's registry
 */
export declare function writeRegistry(data: {
    [key: string]: string;
} | string, mode: "global" | "project", globalRegistryURL: string, projectRegistryURL: string): boolean;
/**
 * Registers a package into the global registry
 * @param name The name of package to be registered in the registry
 * @param path The absolute path of package
 * @param version The version of the package
 */
export declare function registerPackage(name: string, path: string, version: string, globalRegistryURL: string, projectRegistryURL: string): void;
/**
 * Tries and gets the detail of the current node package from its `package.json` file
 * If the `package.json` file does not exist or can't be read, the returned value will be null
 */
export declare function getProjectDetail(path?: string): {
    name: string;
    version: string;
} | null;
export declare function doesPackageExists(name: string, makeNodeModules: boolean): boolean;
export declare function removeProjectPackage(name: string): boolean;
export declare function getProjectPackagePath(name: string): string;
/**
 * Copies a package from the global registry into the project's node_modules
 * @param name The name of the target package
 * @param data The content of the global registry
 */
export declare function copyPackageToProject(name: string, data: {
    [key: string]: RegsitryEntry;
}): boolean;
/**
 * Prints an error message to the console with the red font color
 * @param error The error message to be printed in the console
 */
export declare function printError(error: string): void;
/**
 * Prints an success message to the console with the green font color
 * @param success The success message to be printed in the console
 */
export declare function printSuccess(success: string): void;
