# Endemism 0.1.0

Endemism is a CLI meant to install internal and private utility node packages into any number of projects that you wish. <br>
The package is meant to facilitate you create a private package and use that package in multiple projects without uploading it to NPM or manually copy it.

## Installation
Endemism is meant to be installed globally.
```bash
npm install -g endemism
```


## Usuage
Once endemism is installed, you need to register your re-usable packages with endemism and then install the registered package into your project.

### Registering packages
in order to register a package, run the following command in the folder containing the `package.json` file.
```bash
endemism register
```

### Deregistering packages
If you want to remove a package from registry, run the following command. You need to pass the name of the package as an argument
```bash
endemism deregister foo
```

### List packages
After a while, you would be registering a bunch of packages and installing them on multiple locations. Obviouly, you would want to see a list of registered/installed packages.<br>
In order to view the list of registered packages globally, run the following command from anywhere.
```bash
endemism list
```

If you want to view the list of installed packages in a project, move to the target project and run the following command in the folder containing `package.json` file.
```bash
endemism list -p
```
As the result of `list` command, you will get a list of registered/installed packages with their respective versions.

### Installing packages
The purpose of registering a package is to install them on as many projects as we like.<br>
To install a package, move to your project and run the following command in the folder containing the `package.json` file. You need to pass the name of desired package as an argument.
```bash
endemism install foo
```
Please note that if the desired package, here as an example `foo`, should be registered and a package with the same name should not be already istalled in the `node_modules` filder.

### Uninstall Packages
To uninstall a package from your project, run the following command in the folder containing `package.json`. You need to pass the name of the package that you want to uninstall as an argument.
```bash
endemism uninstall foo
```
Please note that the target package, here as an example `foo`, has to be installed via endemism. Endemism will not uninstall any package from your project that has been installed via NPM or yarn.

### update
After working on your projects, you will have to update the re-usable packages to remove bugs or add new features.<br>

This update has to be pushed to Endemism and then the installed package inside the project has to be updated.<br>

So first, we will focus on pushing the update to endemism and then will focus on bringing the update into the project.<br>

To push the changes to Endemism, you have to increment the version of your package and run the following command from anywhere.
```bash
endemism update -g foo
```
The `-g` or `--global` flag will have Endemism to update the `foo` package in the global registry. The name of the package is optional and if you ommit it, all registered packages will be checked and updated.<br><br>

Then, to bring these updates into your project, move to your project's directory, and run the following command in the folder containing `package.json`.
```bash
endemism update foo
```
The package name is optional and if you ommit it, all installed packages in your projects will be checked and updated. There is no need to use any flags inside your project's directory.<br>
Please note that endemism will only update packages that were installed by endemism in the first place.<br><br>

To make the update process easier, you can also use the `-a` or `--all` flag in your project's directory, in the same folder as `package.json` file.
```bash
endemism update -a
```
the `-a` flag will first update all register packages and then update all installed packages in your current project.