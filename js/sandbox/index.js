var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "./typeAcquisition", "./theme", "./compilerOptions", "./vendor/lzstring.min", "./releases", "./getInitialCode", "./twoslashSupport", "./vendor/typescript-vfs"], function (require, exports, typeAcquisition_1, theme_1, compilerOptions_1, lzstring_min_1, releases_1, getInitialCode_1, twoslashSupport_1, tsvfs) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createTypeScriptSandbox = exports.defaultPlaygroundSettings = void 0;
    lzstring_min_1 = __importDefault(lzstring_min_1);
    tsvfs = __importStar(tsvfs);
    const languageType = (config) => (config.useJavaScript ? "javascript" : "typescript");
    /** Default Monaco settings for playground */
    const sharedEditorOptions = {
        automaticLayout: true,
        scrollBeyondLastLine: true,
        scrollBeyondLastColumn: 3,
        minimap: {
            enabled: false,
        },
        lightbulb: {
            enabled: true,
        },
    };
    /** The default settings which we apply a partial over */
    function defaultPlaygroundSettings() {
        const config = {
            text: "",
            domID: "",
            compilerOptions: {},
            acquireTypes: true,
            useJavaScript: false,
            supportTwoslashCompilerOptions: false,
            logger: console,
        };
        return config;
    }
    exports.defaultPlaygroundSettings = defaultPlaygroundSettings;
    function defaultFilePath(config, compilerOptions, monaco) {
        const isJSX = compilerOptions.jsx !== monaco.languages.typescript.JsxEmit.None;
        const fileExt = config.useJavaScript ? "js" : "ts";
        const ext = isJSX ? fileExt + "x" : fileExt;
        return "input." + ext;
    }
    /** Creates a monaco file reference, basically a fancy path */
    function createFileUri(config, compilerOptions, monaco) {
        return monaco.Uri.file(defaultFilePath(config, compilerOptions, monaco));
    }
    /** Creates a sandbox editor, and returns a set of useful functions and the editor */
    exports.createTypeScriptSandbox = (partialConfig, monaco, ts) => {
        const config = Object.assign(Object.assign({}, defaultPlaygroundSettings()), partialConfig);
        if (!("domID" in config) && !("elementToAppend" in config))
            throw new Error("You did not provide a domID or elementToAppend");
        const defaultText = config.suppressAutomaticallyGettingDefaultText
            ? config.text
            : getInitialCode_1.getInitialCode(config.text, document.location);
        // Defaults
        const compilerDefaults = compilerOptions_1.getDefaultSandboxCompilerOptions(config, monaco);
        // Grab the compiler flags via the query params
        let compilerOptions;
        if (!config.suppressAutomaticallyGettingCompilerFlags) {
            const params = new URLSearchParams(location.search);
            let queryParamCompilerOptions = compilerOptions_1.getCompilerOptionsFromParams(compilerDefaults, params);
            if (Object.keys(queryParamCompilerOptions).length)
                config.logger.log("[Compiler] Found compiler options in query params: ", queryParamCompilerOptions);
            compilerOptions = Object.assign(Object.assign({}, compilerDefaults), queryParamCompilerOptions);
        }
        else {
            compilerOptions = compilerDefaults;
        }
        const language = languageType(config);
        const filePath = createFileUri(config, compilerOptions, monaco);
        const element = "domID" in config ? document.getElementById(config.domID) : config.elementToAppend;
        const model = monaco.editor.createModel(defaultText, language, filePath);
        monaco.editor.defineTheme("sandbox", theme_1.sandboxTheme);
        monaco.editor.defineTheme("sandbox-dark", theme_1.sandboxThemeDark);
        monaco.editor.setTheme("sandbox");
        const monacoSettings = Object.assign({ model }, sharedEditorOptions, config.monacoSettings || {});
        const editor = monaco.editor.create(element, monacoSettings);
        const getWorker = config.useJavaScript
            ? monaco.languages.typescript.getJavaScriptWorker
            : monaco.languages.typescript.getTypeScriptWorker;
        const defaults = config.useJavaScript
            ? monaco.languages.typescript.javascriptDefaults
            : monaco.languages.typescript.typescriptDefaults;
        // In the future it'd be good to add support for an 'add many files'
        const addLibraryToRuntime = (code, path) => {
            defaults.addExtraLib(code, path);
            config.logger.log(`[ATA] Adding ${path} to runtime`);
        };
        const getTwoSlashComplierOptions = twoslashSupport_1.extractTwoSlashComplierOptions(ts);
        // Then update it when the model changes, perhaps this could be a debounced plugin instead in the future?
        editor.onDidChangeModelContent(() => {
            const code = editor.getModel().getValue();
            if (config.supportTwoslashCompilerOptions) {
                const configOpts = getTwoSlashComplierOptions(code);
                updateCompilerSettings(configOpts);
            }
            if (config.acquireTypes) {
                typeAcquisition_1.detectNewImportsToAcquireTypeFor(code, addLibraryToRuntime, window.fetch.bind(window), config);
            }
        });
        config.logger.log("[Compiler] Set compiler options: ", compilerOptions);
        defaults.setCompilerOptions(compilerOptions);
        // Grab types last so that it logs in a logical way
        if (config.acquireTypes) {
            // Take the code from the editor right away
            const code = editor.getModel().getValue();
            typeAcquisition_1.detectNewImportsToAcquireTypeFor(code, addLibraryToRuntime, window.fetch.bind(window), config);
        }
        // To let clients plug into compiler settings changes
        let didUpdateCompilerSettings = (opts) => { };
        const updateCompilerSettings = (opts) => {
            config.logger.log("[Compiler] Updating compiler options: ", opts);
            compilerOptions = Object.assign(Object.assign({}, opts), compilerOptions);
            defaults.setCompilerOptions(compilerOptions);
            didUpdateCompilerSettings(compilerOptions);
        };
        const updateCompilerSetting = (key, value) => {
            config.logger.log("[Compiler] Setting compiler options ", key, "to", value);
            compilerOptions[key] = value;
            defaults.setCompilerOptions(compilerOptions);
            didUpdateCompilerSettings(compilerOptions);
        };
        const setCompilerSettings = (opts) => {
            config.logger.log("[Compiler] Setting compiler options: ", opts);
            compilerOptions = opts;
            defaults.setCompilerOptions(compilerOptions);
            didUpdateCompilerSettings(compilerOptions);
        };
        const getCompilerOptions = () => {
            return compilerOptions;
        };
        const setDidUpdateCompilerSettings = (func) => {
            didUpdateCompilerSettings = func;
        };
        /** Gets the results of compiling your editor's code */
        const getEmitResult = () => __awaiter(void 0, void 0, void 0, function* () {
            const model = editor.getModel();
            const client = yield getWorkerProcess();
            return yield client.getEmitOutput(model.uri.toString());
        });
        /** Gets the JS  of compiling your editor's code */
        const getRunnableJS = () => __awaiter(void 0, void 0, void 0, function* () {
            if (config.useJavaScript) {
                return getText();
            }
            const result = yield getEmitResult();
            const firstJS = result.outputFiles.find((o) => o.name.endsWith(".js") || o.name.endsWith(".jsx"));
            return (firstJS && firstJS.text) || "";
        });
        /** Gets the DTS for the JS/TS  of compiling your editor's code */
        const getDTSForCode = () => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield getEmitResult();
            return result.outputFiles.find((o) => o.name.endsWith(".d.ts")).text;
        });
        const getWorkerProcess = () => __awaiter(void 0, void 0, void 0, function* () {
            const worker = yield getWorker();
            // @ts-ignore
            return yield worker(model.uri);
        });
        const getDomNode = () => editor.getDomNode();
        const getModel = () => editor.getModel();
        const getText = () => getModel().getValue();
        const setText = (text) => getModel().setValue(text);
        /**
         * Warning: Runs on the main thread
         */
        const createTSProgram = () => __awaiter(void 0, void 0, void 0, function* () {
            const fsMap = yield tsvfs.createDefaultMapFromCDN(compilerOptions, ts.version, true, ts, lzstring_min_1.default);
            fsMap.set(filePath.path, getText());
            const system = tsvfs.createSystem(fsMap);
            const host = tsvfs.createVirtualCompilerHost(system, compilerOptions, ts);
            const program = ts.createProgram({
                rootNames: [...fsMap.keys()],
                options: compilerOptions,
                host: host.compilerHost,
            });
            return program;
        });
        const getAST = () => __awaiter(void 0, void 0, void 0, function* () {
            const program = yield createTSProgram();
            program.emit();
            return program.getSourceFile(filePath.path);
        });
        // Pass along the supported releases for the playground
        const supportedVersions = releases_1.supportedReleases;
        return {
            /** The same config you passed in */
            config,
            /** A list of TypeScript versions you can use with the TypeScript sandbox */
            supportedVersions,
            /** The monaco editor instance */
            editor,
            /** Either "typescript" or "javascript" depending on your config */
            language,
            /** The outer monaco module, the result of require("monaco-editor")  */
            monaco,
            /** Gets a monaco-typescript worker, this will give you access to a language server. Note: prefer this for language server work because it happens on a webworker . */
            getWorkerProcess,
            /** A copy of require("@typescript/vfs") this can be used to quickly set up an in-memory compiler runs for ASTs, or to get complex language server results (anything above has to be serialized when passed)*/
            tsvfs,
            /** Get all the different emitted files after TypeScript is run */
            getEmitResult,
            /** Gets just the JavaScript for your sandbox, will transpile if in TS only */
            getRunnableJS,
            /** Gets the DTS output of the main code in the editor */
            getDTSForCode,
            /** The monaco-editor dom node, used for showing/hiding the editor */
            getDomNode,
            /** The model is an object which monaco uses to keep track of text in the editor. Use this to directly modify the text in the editor */
            getModel,
            /** Gets the text of the main model, which is the text in the editor */
            getText,
            /** Shortcut for setting the model's text content which would update the editor */
            setText,
            /** Gets the AST of the current text in monaco - uses `createTSProgram`, so the performance caveat applies there too */
            getAST,
            /** The module you get from require("typescript") */
            ts,
            /** Create a new Program, a TypeScript data model which represents the entire project.
             *
             * The first time this is called it has to download all the DTS files which is needed for an exact compiler run. Which
             * at max is about 1.5MB - after that subsequent downloads of dts lib files come from localStorage.
             *
             * Try to use this sparingly as it can be computationally expensive, at the minimum you should be using the debounced setup.
             *
             * TODO: It would be good to create an easy way to have a single program instance which is updated for you
             * when the monaco model changes.
             */
            createTSProgram,
            /** The Sandbox's default compiler options  */
            compilerDefaults,
            /** The Sandbox's current compiler options */
            getCompilerOptions,
            /** Replace the Sandbox's compiler options */
            setCompilerSettings,
            /** Overwrite the Sandbox's compiler options */
            updateCompilerSetting,
            /** Update a single compiler option in the SAndbox */
            updateCompilerSettings,
            /** A way to get callbacks when compiler settings have changed */
            setDidUpdateCompilerSettings,
            /** A copy of lzstring, which is used to archive/unarchive code */
            lzstring: lzstring_min_1.default,
            /** Returns compiler options found in the params of the current page */
            createURLQueryWithCompilerOptions: compilerOptions_1.createURLQueryWithCompilerOptions,
            /** Returns compiler options in the source code using twoslash notation */
            getTwoSlashComplierOptions,
            /** Gets to the current monaco-language, this is how you talk to the background webworkers */
            languageServiceDefaults: defaults,
            /** The path which represents the current file using the current compiler options */
            filepath: filePath.path,
        };
    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zYW5kYm94L3NyYy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBa0RBLE1BQU0sWUFBWSxHQUFHLENBQUMsTUFBd0IsRUFBRSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFBO0lBRXZHLDZDQUE2QztJQUM3QyxNQUFNLG1CQUFtQixHQUFrRDtRQUN6RSxlQUFlLEVBQUUsSUFBSTtRQUNyQixvQkFBb0IsRUFBRSxJQUFJO1FBQzFCLHNCQUFzQixFQUFFLENBQUM7UUFDekIsT0FBTyxFQUFFO1lBQ1AsT0FBTyxFQUFFLEtBQUs7U0FDZjtRQUNELFNBQVMsRUFBRTtZQUNULE9BQU8sRUFBRSxJQUFJO1NBQ2Q7S0FDRixDQUFBO0lBRUQseURBQXlEO0lBQ3pELFNBQWdCLHlCQUF5QjtRQUN2QyxNQUFNLE1BQU0sR0FBcUI7WUFDL0IsSUFBSSxFQUFFLEVBQUU7WUFDUixLQUFLLEVBQUUsRUFBRTtZQUNULGVBQWUsRUFBRSxFQUFFO1lBQ25CLFlBQVksRUFBRSxJQUFJO1lBQ2xCLGFBQWEsRUFBRSxLQUFLO1lBQ3BCLDhCQUE4QixFQUFFLEtBQUs7WUFDckMsTUFBTSxFQUFFLE9BQU87U0FDaEIsQ0FBQTtRQUNELE9BQU8sTUFBTSxDQUFBO0lBQ2YsQ0FBQztJQVhELDhEQVdDO0lBRUQsU0FBUyxlQUFlLENBQUMsTUFBd0IsRUFBRSxlQUFnQyxFQUFFLE1BQWM7UUFDakcsTUFBTSxLQUFLLEdBQUcsZUFBZSxDQUFDLEdBQUcsS0FBSyxNQUFNLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFBO1FBQzlFLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBO1FBQ2xELE1BQU0sR0FBRyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFBO1FBQzNDLE9BQU8sUUFBUSxHQUFHLEdBQUcsQ0FBQTtJQUN2QixDQUFDO0lBRUQsOERBQThEO0lBQzlELFNBQVMsYUFBYSxDQUFDLE1BQXdCLEVBQUUsZUFBZ0MsRUFBRSxNQUFjO1FBQy9GLE9BQU8sTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQTtJQUMxRSxDQUFDO0lBRUQscUZBQXFGO0lBQ3hFLFFBQUEsdUJBQXVCLEdBQUcsQ0FDckMsYUFBd0MsRUFDeEMsTUFBYyxFQUNkLEVBQStCLEVBQy9CLEVBQUU7UUFDRixNQUFNLE1BQU0sbUNBQVEseUJBQXlCLEVBQUUsR0FBSyxhQUFhLENBQUUsQ0FBQTtRQUNuRSxJQUFJLENBQUMsQ0FBQyxPQUFPLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLGlCQUFpQixJQUFJLE1BQU0sQ0FBQztZQUN4RCxNQUFNLElBQUksS0FBSyxDQUFDLGdEQUFnRCxDQUFDLENBQUE7UUFFbkUsTUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLHVDQUF1QztZQUNoRSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUk7WUFDYixDQUFDLENBQUMsK0JBQWMsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUVsRCxXQUFXO1FBQ1gsTUFBTSxnQkFBZ0IsR0FBRyxrREFBZ0MsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFFekUsK0NBQStDO1FBQy9DLElBQUksZUFBZ0MsQ0FBQTtRQUNwQyxJQUFJLENBQUMsTUFBTSxDQUFDLHlDQUF5QyxFQUFFO1lBQ3JELE1BQU0sTUFBTSxHQUFHLElBQUksZUFBZSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUNuRCxJQUFJLHlCQUF5QixHQUFHLDhDQUE0QixDQUFDLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQ3RGLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLE1BQU07Z0JBQy9DLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLHFEQUFxRCxFQUFFLHlCQUF5QixDQUFDLENBQUE7WUFDckcsZUFBZSxtQ0FBUSxnQkFBZ0IsR0FBSyx5QkFBeUIsQ0FBRSxDQUFBO1NBQ3hFO2FBQU07WUFDTCxlQUFlLEdBQUcsZ0JBQWdCLENBQUE7U0FDbkM7UUFFRCxNQUFNLFFBQVEsR0FBRyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDckMsTUFBTSxRQUFRLEdBQUcsYUFBYSxDQUFDLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDL0QsTUFBTSxPQUFPLEdBQUcsT0FBTyxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFFLE1BQWMsQ0FBQyxlQUFlLENBQUE7UUFFM0csTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUN4RSxNQUFNLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsb0JBQVksQ0FBQyxDQUFBO1FBQ2xELE1BQU0sQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLGNBQWMsRUFBRSx3QkFBZ0IsQ0FBQyxDQUFBO1FBQzNELE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBRWpDLE1BQU0sY0FBYyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLENBQUMsY0FBYyxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQ2pHLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUU1RCxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsYUFBYTtZQUNwQyxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsbUJBQW1CO1lBQ2pELENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxtQkFBbUIsQ0FBQTtRQUVuRCxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsYUFBYTtZQUNuQyxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsa0JBQWtCO1lBQ2hELENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQTtRQUVsRCxvRUFBb0U7UUFDcEUsTUFBTSxtQkFBbUIsR0FBRyxDQUFDLElBQVksRUFBRSxJQUFZLEVBQUUsRUFBRTtZQUN6RCxRQUFRLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUNoQyxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsSUFBSSxhQUFhLENBQUMsQ0FBQTtRQUN0RCxDQUFDLENBQUE7UUFFRCxNQUFNLDBCQUEwQixHQUFHLGdEQUE4QixDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBRXJFLHlHQUF5RztRQUN6RyxNQUFNLENBQUMsdUJBQXVCLENBQUMsR0FBRyxFQUFFO1lBQ2xDLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtZQUMxQyxJQUFJLE1BQU0sQ0FBQyw4QkFBOEIsRUFBRTtnQkFDekMsTUFBTSxVQUFVLEdBQUcsMEJBQTBCLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQ25ELHNCQUFzQixDQUFDLFVBQVUsQ0FBQyxDQUFBO2FBQ25DO1lBRUQsSUFBSSxNQUFNLENBQUMsWUFBWSxFQUFFO2dCQUN2QixrREFBZ0MsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUE7YUFDL0Y7UUFDSCxDQUFDLENBQUMsQ0FBQTtRQUVGLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLG1DQUFtQyxFQUFFLGVBQWUsQ0FBQyxDQUFBO1FBQ3ZFLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUU1QyxtREFBbUQ7UUFDbkQsSUFBSSxNQUFNLENBQUMsWUFBWSxFQUFFO1lBQ3ZCLDJDQUEyQztZQUMzQyxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFHLENBQUMsUUFBUSxFQUFFLENBQUE7WUFDMUMsa0RBQWdDLENBQUMsSUFBSSxFQUFFLG1CQUFtQixFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1NBQy9GO1FBRUQscURBQXFEO1FBQ3JELElBQUkseUJBQXlCLEdBQUcsQ0FBQyxJQUFxQixFQUFFLEVBQUUsR0FBRSxDQUFDLENBQUE7UUFFN0QsTUFBTSxzQkFBc0IsR0FBRyxDQUFDLElBQXFCLEVBQUUsRUFBRTtZQUN2RCxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyx3Q0FBd0MsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUNqRSxlQUFlLG1DQUFRLElBQUksR0FBSyxlQUFlLENBQUUsQ0FBQTtZQUNqRCxRQUFRLENBQUMsa0JBQWtCLENBQUMsZUFBZSxDQUFDLENBQUE7WUFDNUMseUJBQXlCLENBQUMsZUFBZSxDQUFDLENBQUE7UUFDNUMsQ0FBQyxDQUFBO1FBRUQsTUFBTSxxQkFBcUIsR0FBRyxDQUFDLEdBQTBCLEVBQUUsS0FBVSxFQUFFLEVBQUU7WUFDdkUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsc0NBQXNDLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUMzRSxlQUFlLENBQUMsR0FBRyxDQUFDLEdBQUcsS0FBSyxDQUFBO1lBQzVCLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxlQUFlLENBQUMsQ0FBQTtZQUM1Qyx5QkFBeUIsQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUM1QyxDQUFDLENBQUE7UUFFRCxNQUFNLG1CQUFtQixHQUFHLENBQUMsSUFBcUIsRUFBRSxFQUFFO1lBQ3BELE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLHVDQUF1QyxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ2hFLGVBQWUsR0FBRyxJQUFJLENBQUE7WUFDdEIsUUFBUSxDQUFDLGtCQUFrQixDQUFDLGVBQWUsQ0FBQyxDQUFBO1lBQzVDLHlCQUF5QixDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBQzVDLENBQUMsQ0FBQTtRQUVELE1BQU0sa0JBQWtCLEdBQUcsR0FBRyxFQUFFO1lBQzlCLE9BQU8sZUFBZSxDQUFBO1FBQ3hCLENBQUMsQ0FBQTtRQUVELE1BQU0sNEJBQTRCLEdBQUcsQ0FBQyxJQUFxQyxFQUFFLEVBQUU7WUFDN0UseUJBQXlCLEdBQUcsSUFBSSxDQUFBO1FBQ2xDLENBQUMsQ0FBQTtRQUVELHVEQUF1RDtRQUN2RCxNQUFNLGFBQWEsR0FBRyxHQUFTLEVBQUU7WUFDL0IsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRyxDQUFBO1lBRWhDLE1BQU0sTUFBTSxHQUFHLE1BQU0sZ0JBQWdCLEVBQUUsQ0FBQTtZQUN2QyxPQUFPLE1BQU0sTUFBTSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7UUFDekQsQ0FBQyxDQUFBLENBQUE7UUFFRCxtREFBbUQ7UUFDbkQsTUFBTSxhQUFhLEdBQUcsR0FBUyxFQUFFO1lBQy9CLElBQUksTUFBTSxDQUFDLGFBQWEsRUFBRTtnQkFDeEIsT0FBTyxPQUFPLEVBQUUsQ0FBQTthQUNqQjtZQUVELE1BQU0sTUFBTSxHQUFHLE1BQU0sYUFBYSxFQUFFLENBQUE7WUFDcEMsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFNLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7WUFDdEcsT0FBTyxDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ3hDLENBQUMsQ0FBQSxDQUFBO1FBRUQsa0VBQWtFO1FBQ2xFLE1BQU0sYUFBYSxHQUFHLEdBQVMsRUFBRTtZQUMvQixNQUFNLE1BQU0sR0FBRyxNQUFNLGFBQWEsRUFBRSxDQUFBO1lBQ3BDLE9BQU8sTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFNLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFFLENBQUMsSUFBSSxDQUFBO1FBQzVFLENBQUMsQ0FBQSxDQUFBO1FBRUQsTUFBTSxnQkFBZ0IsR0FBRyxHQUFvQyxFQUFFO1lBQzdELE1BQU0sTUFBTSxHQUFHLE1BQU0sU0FBUyxFQUFFLENBQUE7WUFDaEMsYUFBYTtZQUNiLE9BQU8sTUFBTSxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ2hDLENBQUMsQ0FBQSxDQUFBO1FBRUQsTUFBTSxVQUFVLEdBQUcsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRyxDQUFBO1FBQzdDLE1BQU0sUUFBUSxHQUFHLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUcsQ0FBQTtRQUN6QyxNQUFNLE9BQU8sR0FBRyxHQUFHLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUMzQyxNQUFNLE9BQU8sR0FBRyxDQUFDLElBQVksRUFBRSxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBRTNEOztXQUVHO1FBQ0gsTUFBTSxlQUFlLEdBQUcsR0FBUyxFQUFFO1lBQ2pDLE1BQU0sS0FBSyxHQUFHLE1BQU0sS0FBSyxDQUFDLHVCQUF1QixDQUFDLGVBQWUsRUFBRSxFQUFFLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsc0JBQVEsQ0FBQyxDQUFBO1lBQ2xHLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFBO1lBRW5DLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDeEMsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLHlCQUF5QixDQUFDLE1BQU0sRUFBRSxlQUFlLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFFekUsTUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDLGFBQWEsQ0FBQztnQkFDL0IsU0FBUyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQzVCLE9BQU8sRUFBRSxlQUFlO2dCQUN4QixJQUFJLEVBQUUsSUFBSSxDQUFDLFlBQVk7YUFDeEIsQ0FBQyxDQUFBO1lBRUYsT0FBTyxPQUFPLENBQUE7UUFDaEIsQ0FBQyxDQUFBLENBQUE7UUFFRCxNQUFNLE1BQU0sR0FBRyxHQUFTLEVBQUU7WUFDeEIsTUFBTSxPQUFPLEdBQUcsTUFBTSxlQUFlLEVBQUUsQ0FBQTtZQUN2QyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUE7WUFDZCxPQUFPLE9BQU8sQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBRSxDQUFBO1FBQzlDLENBQUMsQ0FBQSxDQUFBO1FBRUQsdURBQXVEO1FBQ3ZELE1BQU0saUJBQWlCLEdBQUcsNEJBQWlCLENBQUE7UUFFM0MsT0FBTztZQUNMLG9DQUFvQztZQUNwQyxNQUFNO1lBQ04sNEVBQTRFO1lBQzVFLGlCQUFpQjtZQUNqQixpQ0FBaUM7WUFDakMsTUFBTTtZQUNOLG1FQUFtRTtZQUNuRSxRQUFRO1lBQ1IsdUVBQXVFO1lBQ3ZFLE1BQU07WUFDTixzS0FBc0s7WUFDdEssZ0JBQWdCO1lBQ2hCLDhNQUE4TTtZQUM5TSxLQUFLO1lBQ0wsa0VBQWtFO1lBQ2xFLGFBQWE7WUFDYiw4RUFBOEU7WUFDOUUsYUFBYTtZQUNiLHlEQUF5RDtZQUN6RCxhQUFhO1lBQ2IscUVBQXFFO1lBQ3JFLFVBQVU7WUFDVix1SUFBdUk7WUFDdkksUUFBUTtZQUNSLHVFQUF1RTtZQUN2RSxPQUFPO1lBQ1Asa0ZBQWtGO1lBQ2xGLE9BQU87WUFDUCx1SEFBdUg7WUFDdkgsTUFBTTtZQUNOLG9EQUFvRDtZQUNwRCxFQUFFO1lBQ0Y7Ozs7Ozs7OztlQVNHO1lBQ0gsZUFBZTtZQUNmLDhDQUE4QztZQUM5QyxnQkFBZ0I7WUFDaEIsNkNBQTZDO1lBQzdDLGtCQUFrQjtZQUNsQiw2Q0FBNkM7WUFDN0MsbUJBQW1CO1lBQ25CLCtDQUErQztZQUMvQyxxQkFBcUI7WUFDckIscURBQXFEO1lBQ3JELHNCQUFzQjtZQUN0QixpRUFBaUU7WUFDakUsNEJBQTRCO1lBQzVCLGtFQUFrRTtZQUNsRSxRQUFRLEVBQVIsc0JBQVE7WUFDUix1RUFBdUU7WUFDdkUsaUNBQWlDLEVBQWpDLG1EQUFpQztZQUNqQywwRUFBMEU7WUFDMUUsMEJBQTBCO1lBQzFCLDZGQUE2RjtZQUM3Rix1QkFBdUIsRUFBRSxRQUFRO1lBQ2pDLG9GQUFvRjtZQUNwRixRQUFRLEVBQUUsUUFBUSxDQUFDLElBQUk7U0FDeEIsQ0FBQTtJQUNILENBQUMsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGRldGVjdE5ld0ltcG9ydHNUb0FjcXVpcmVUeXBlRm9yIH0gZnJvbSBcIi4vdHlwZUFjcXVpc2l0aW9uXCJcbmltcG9ydCB7IHNhbmRib3hUaGVtZSwgc2FuZGJveFRoZW1lRGFyayB9IGZyb20gXCIuL3RoZW1lXCJcbmltcG9ydCB7IFR5cGVTY3JpcHRXb3JrZXIgfSBmcm9tIFwiLi90c1dvcmtlclwiXG5pbXBvcnQge1xuICBnZXREZWZhdWx0U2FuZGJveENvbXBpbGVyT3B0aW9ucyxcbiAgZ2V0Q29tcGlsZXJPcHRpb25zRnJvbVBhcmFtcyxcbiAgY3JlYXRlVVJMUXVlcnlXaXRoQ29tcGlsZXJPcHRpb25zLFxufSBmcm9tIFwiLi9jb21waWxlck9wdGlvbnNcIlxuaW1wb3J0IGx6c3RyaW5nIGZyb20gXCIuL3ZlbmRvci9senN0cmluZy5taW5cIlxuaW1wb3J0IHsgc3VwcG9ydGVkUmVsZWFzZXMgfSBmcm9tIFwiLi9yZWxlYXNlc1wiXG5pbXBvcnQgeyBnZXRJbml0aWFsQ29kZSB9IGZyb20gXCIuL2dldEluaXRpYWxDb2RlXCJcbmltcG9ydCB7IGV4dHJhY3RUd29TbGFzaENvbXBsaWVyT3B0aW9ucyB9IGZyb20gXCIuL3R3b3NsYXNoU3VwcG9ydFwiXG5pbXBvcnQgKiBhcyB0c3ZmcyBmcm9tIFwiLi92ZW5kb3IvdHlwZXNjcmlwdC12ZnNcIlxuXG50eXBlIENvbXBpbGVyT3B0aW9ucyA9IGltcG9ydChcIm1vbmFjby1lZGl0b3JcIikubGFuZ3VhZ2VzLnR5cGVzY3JpcHQuQ29tcGlsZXJPcHRpb25zXG50eXBlIE1vbmFjbyA9IHR5cGVvZiBpbXBvcnQoXCJtb25hY28tZWRpdG9yXCIpXG5cbi8qKlxuICogVGhlc2UgYXJlIHNldHRpbmdzIGZvciB0aGUgcGxheWdyb3VuZCB3aGljaCBhcmUgdGhlIGVxdWl2YWxlbnQgdG8gcHJvcHMgaW4gUmVhY3RcbiAqIGFueSBjaGFuZ2VzIHRvIGl0IHNob3VsZCByZXF1aXJlIGEgbmV3IHNldHVwIG9mIHRoZSBwbGF5Z3JvdW5kXG4gKi9cbmV4cG9ydCB0eXBlIFBsYXlncm91bmRDb25maWcgPSB7XG4gIC8qKiBUaGUgZGVmYXVsdCBzb3VyY2UgY29kZSBmb3IgdGhlIHBsYXlncm91bmQgKi9cbiAgdGV4dDogc3RyaW5nXG4gIC8qKiBTaG91bGQgaXQgcnVuIHRoZSB0cyBvciBqcyBJREUgc2VydmljZXMgKi9cbiAgdXNlSmF2YVNjcmlwdDogYm9vbGVhblxuICAvKiogQ29tcGlsZXIgb3B0aW9ucyB3aGljaCBhcmUgYXV0b21hdGljYWxseSBqdXN0IGZvcndhcmRlZCBvbiAqL1xuICBjb21waWxlck9wdGlvbnM6IENvbXBpbGVyT3B0aW9uc1xuICAvKiogT3B0aW9uYWwgbW9uYWNvIHNldHRpbmdzIG92ZXJyaWRlcyAqL1xuICBtb25hY29TZXR0aW5ncz86IGltcG9ydChcIm1vbmFjby1lZGl0b3JcIikuZWRpdG9yLklFZGl0b3JPcHRpb25zXG4gIC8qKiBBY3F1aXJlIHR5cGVzIHZpYSB0eXBlIGFjcXVpc2l0aW9uICovXG4gIGFjcXVpcmVUeXBlczogYm9vbGVhblxuICAvKiogU3VwcG9ydCB0d29zbGFzaCBjb21waWxlciBvcHRpb25zICovXG4gIHN1cHBvcnRUd29zbGFzaENvbXBpbGVyT3B0aW9uczogYm9vbGVhblxuICAvKiogR2V0IHRoZSB0ZXh0IHZpYSBxdWVyeSBwYXJhbXMgYW5kIGxvY2FsIHN0b3JhZ2UsIHVzZWZ1bCB3aGVuIHRoZSBlZGl0b3IgaXMgdGhlIG1haW4gZXhwZXJpZW5jZSAqL1xuICBzdXBwcmVzc0F1dG9tYXRpY2FsbHlHZXR0aW5nRGVmYXVsdFRleHQ/OiB0cnVlXG4gIC8qKiBTdXBwcmVzcyBzZXR0aW5nIGNvbXBpbGVyIG9wdGlvbnMgZnJvbSB0aGUgY29tcGlsZXIgZmxhZ3MgZnJvbSBxdWVyeSBwYXJhbXMgKi9cbiAgc3VwcHJlc3NBdXRvbWF0aWNhbGx5R2V0dGluZ0NvbXBpbGVyRmxhZ3M/OiB0cnVlXG4gIC8qKiBMb2dnaW5nIHN5c3RlbSAqL1xuICBsb2dnZXI6IHtcbiAgICBsb2c6ICguLi5hcmdzOiBhbnlbXSkgPT4gdm9pZFxuICAgIGVycm9yOiAoLi4uYXJnczogYW55W10pID0+IHZvaWRcbiAgICBncm91cENvbGxhcHNlZDogKC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkXG4gICAgZ3JvdXBFbmQ6ICguLi5hcmdzOiBhbnlbXSkgPT4gdm9pZFxuICB9XG59ICYgKFxuICB8IHsgLyoqIHRoZUlEIG9mIGEgZG9tIG5vZGUgdG8gYWRkIG1vbmFjbyB0byAqLyBkb21JRDogc3RyaW5nIH1cbiAgfCB7IC8qKiB0aGVJRCBvZiBhIGRvbSBub2RlIHRvIGFkZCBtb25hY28gdG8gKi8gZWxlbWVudFRvQXBwZW5kOiBIVE1MRWxlbWVudCB9XG4pXG5cbmNvbnN0IGxhbmd1YWdlVHlwZSA9IChjb25maWc6IFBsYXlncm91bmRDb25maWcpID0+IChjb25maWcudXNlSmF2YVNjcmlwdCA/IFwiamF2YXNjcmlwdFwiIDogXCJ0eXBlc2NyaXB0XCIpXG5cbi8qKiBEZWZhdWx0IE1vbmFjbyBzZXR0aW5ncyBmb3IgcGxheWdyb3VuZCAqL1xuY29uc3Qgc2hhcmVkRWRpdG9yT3B0aW9uczogaW1wb3J0KFwibW9uYWNvLWVkaXRvclwiKS5lZGl0b3IuSUVkaXRvck9wdGlvbnMgPSB7XG4gIGF1dG9tYXRpY0xheW91dDogdHJ1ZSxcbiAgc2Nyb2xsQmV5b25kTGFzdExpbmU6IHRydWUsXG4gIHNjcm9sbEJleW9uZExhc3RDb2x1bW46IDMsXG4gIG1pbmltYXA6IHtcbiAgICBlbmFibGVkOiBmYWxzZSxcbiAgfSxcbiAgbGlnaHRidWxiOiB7XG4gICAgZW5hYmxlZDogdHJ1ZSxcbiAgfSxcbn1cblxuLyoqIFRoZSBkZWZhdWx0IHNldHRpbmdzIHdoaWNoIHdlIGFwcGx5IGEgcGFydGlhbCBvdmVyICovXG5leHBvcnQgZnVuY3Rpb24gZGVmYXVsdFBsYXlncm91bmRTZXR0aW5ncygpIHtcbiAgY29uc3QgY29uZmlnOiBQbGF5Z3JvdW5kQ29uZmlnID0ge1xuICAgIHRleHQ6IFwiXCIsXG4gICAgZG9tSUQ6IFwiXCIsXG4gICAgY29tcGlsZXJPcHRpb25zOiB7fSxcbiAgICBhY3F1aXJlVHlwZXM6IHRydWUsXG4gICAgdXNlSmF2YVNjcmlwdDogZmFsc2UsXG4gICAgc3VwcG9ydFR3b3NsYXNoQ29tcGlsZXJPcHRpb25zOiBmYWxzZSxcbiAgICBsb2dnZXI6IGNvbnNvbGUsXG4gIH1cbiAgcmV0dXJuIGNvbmZpZ1xufVxuXG5mdW5jdGlvbiBkZWZhdWx0RmlsZVBhdGgoY29uZmlnOiBQbGF5Z3JvdW5kQ29uZmlnLCBjb21waWxlck9wdGlvbnM6IENvbXBpbGVyT3B0aW9ucywgbW9uYWNvOiBNb25hY28pIHtcbiAgY29uc3QgaXNKU1ggPSBjb21waWxlck9wdGlvbnMuanN4ICE9PSBtb25hY28ubGFuZ3VhZ2VzLnR5cGVzY3JpcHQuSnN4RW1pdC5Ob25lXG4gIGNvbnN0IGZpbGVFeHQgPSBjb25maWcudXNlSmF2YVNjcmlwdCA/IFwianNcIiA6IFwidHNcIlxuICBjb25zdCBleHQgPSBpc0pTWCA/IGZpbGVFeHQgKyBcInhcIiA6IGZpbGVFeHRcbiAgcmV0dXJuIFwiaW5wdXQuXCIgKyBleHRcbn1cblxuLyoqIENyZWF0ZXMgYSBtb25hY28gZmlsZSByZWZlcmVuY2UsIGJhc2ljYWxseSBhIGZhbmN5IHBhdGggKi9cbmZ1bmN0aW9uIGNyZWF0ZUZpbGVVcmkoY29uZmlnOiBQbGF5Z3JvdW5kQ29uZmlnLCBjb21waWxlck9wdGlvbnM6IENvbXBpbGVyT3B0aW9ucywgbW9uYWNvOiBNb25hY28pIHtcbiAgcmV0dXJuIG1vbmFjby5VcmkuZmlsZShkZWZhdWx0RmlsZVBhdGgoY29uZmlnLCBjb21waWxlck9wdGlvbnMsIG1vbmFjbykpXG59XG5cbi8qKiBDcmVhdGVzIGEgc2FuZGJveCBlZGl0b3IsIGFuZCByZXR1cm5zIGEgc2V0IG9mIHVzZWZ1bCBmdW5jdGlvbnMgYW5kIHRoZSBlZGl0b3IgKi9cbmV4cG9ydCBjb25zdCBjcmVhdGVUeXBlU2NyaXB0U2FuZGJveCA9IChcbiAgcGFydGlhbENvbmZpZzogUGFydGlhbDxQbGF5Z3JvdW5kQ29uZmlnPixcbiAgbW9uYWNvOiBNb25hY28sXG4gIHRzOiB0eXBlb2YgaW1wb3J0KFwidHlwZXNjcmlwdFwiKVxuKSA9PiB7XG4gIGNvbnN0IGNvbmZpZyA9IHsgLi4uZGVmYXVsdFBsYXlncm91bmRTZXR0aW5ncygpLCAuLi5wYXJ0aWFsQ29uZmlnIH1cbiAgaWYgKCEoXCJkb21JRFwiIGluIGNvbmZpZykgJiYgIShcImVsZW1lbnRUb0FwcGVuZFwiIGluIGNvbmZpZykpXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiWW91IGRpZCBub3QgcHJvdmlkZSBhIGRvbUlEIG9yIGVsZW1lbnRUb0FwcGVuZFwiKVxuXG4gIGNvbnN0IGRlZmF1bHRUZXh0ID0gY29uZmlnLnN1cHByZXNzQXV0b21hdGljYWxseUdldHRpbmdEZWZhdWx0VGV4dFxuICAgID8gY29uZmlnLnRleHRcbiAgICA6IGdldEluaXRpYWxDb2RlKGNvbmZpZy50ZXh0LCBkb2N1bWVudC5sb2NhdGlvbilcblxuICAvLyBEZWZhdWx0c1xuICBjb25zdCBjb21waWxlckRlZmF1bHRzID0gZ2V0RGVmYXVsdFNhbmRib3hDb21waWxlck9wdGlvbnMoY29uZmlnLCBtb25hY28pXG5cbiAgLy8gR3JhYiB0aGUgY29tcGlsZXIgZmxhZ3MgdmlhIHRoZSBxdWVyeSBwYXJhbXNcbiAgbGV0IGNvbXBpbGVyT3B0aW9uczogQ29tcGlsZXJPcHRpb25zXG4gIGlmICghY29uZmlnLnN1cHByZXNzQXV0b21hdGljYWxseUdldHRpbmdDb21waWxlckZsYWdzKSB7XG4gICAgY29uc3QgcGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyhsb2NhdGlvbi5zZWFyY2gpXG4gICAgbGV0IHF1ZXJ5UGFyYW1Db21waWxlck9wdGlvbnMgPSBnZXRDb21waWxlck9wdGlvbnNGcm9tUGFyYW1zKGNvbXBpbGVyRGVmYXVsdHMsIHBhcmFtcylcbiAgICBpZiAoT2JqZWN0LmtleXMocXVlcnlQYXJhbUNvbXBpbGVyT3B0aW9ucykubGVuZ3RoKVxuICAgICAgY29uZmlnLmxvZ2dlci5sb2coXCJbQ29tcGlsZXJdIEZvdW5kIGNvbXBpbGVyIG9wdGlvbnMgaW4gcXVlcnkgcGFyYW1zOiBcIiwgcXVlcnlQYXJhbUNvbXBpbGVyT3B0aW9ucylcbiAgICBjb21waWxlck9wdGlvbnMgPSB7IC4uLmNvbXBpbGVyRGVmYXVsdHMsIC4uLnF1ZXJ5UGFyYW1Db21waWxlck9wdGlvbnMgfVxuICB9IGVsc2Uge1xuICAgIGNvbXBpbGVyT3B0aW9ucyA9IGNvbXBpbGVyRGVmYXVsdHNcbiAgfVxuXG4gIGNvbnN0IGxhbmd1YWdlID0gbGFuZ3VhZ2VUeXBlKGNvbmZpZylcbiAgY29uc3QgZmlsZVBhdGggPSBjcmVhdGVGaWxlVXJpKGNvbmZpZywgY29tcGlsZXJPcHRpb25zLCBtb25hY28pXG4gIGNvbnN0IGVsZW1lbnQgPSBcImRvbUlEXCIgaW4gY29uZmlnID8gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoY29uZmlnLmRvbUlEKSA6IChjb25maWcgYXMgYW55KS5lbGVtZW50VG9BcHBlbmRcblxuICBjb25zdCBtb2RlbCA9IG1vbmFjby5lZGl0b3IuY3JlYXRlTW9kZWwoZGVmYXVsdFRleHQsIGxhbmd1YWdlLCBmaWxlUGF0aClcbiAgbW9uYWNvLmVkaXRvci5kZWZpbmVUaGVtZShcInNhbmRib3hcIiwgc2FuZGJveFRoZW1lKVxuICBtb25hY28uZWRpdG9yLmRlZmluZVRoZW1lKFwic2FuZGJveC1kYXJrXCIsIHNhbmRib3hUaGVtZURhcmspXG4gIG1vbmFjby5lZGl0b3Iuc2V0VGhlbWUoXCJzYW5kYm94XCIpXG5cbiAgY29uc3QgbW9uYWNvU2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHsgbW9kZWwgfSwgc2hhcmVkRWRpdG9yT3B0aW9ucywgY29uZmlnLm1vbmFjb1NldHRpbmdzIHx8IHt9KVxuICBjb25zdCBlZGl0b3IgPSBtb25hY28uZWRpdG9yLmNyZWF0ZShlbGVtZW50LCBtb25hY29TZXR0aW5ncylcblxuICBjb25zdCBnZXRXb3JrZXIgPSBjb25maWcudXNlSmF2YVNjcmlwdFxuICAgID8gbW9uYWNvLmxhbmd1YWdlcy50eXBlc2NyaXB0LmdldEphdmFTY3JpcHRXb3JrZXJcbiAgICA6IG1vbmFjby5sYW5ndWFnZXMudHlwZXNjcmlwdC5nZXRUeXBlU2NyaXB0V29ya2VyXG5cbiAgY29uc3QgZGVmYXVsdHMgPSBjb25maWcudXNlSmF2YVNjcmlwdFxuICAgID8gbW9uYWNvLmxhbmd1YWdlcy50eXBlc2NyaXB0LmphdmFzY3JpcHREZWZhdWx0c1xuICAgIDogbW9uYWNvLmxhbmd1YWdlcy50eXBlc2NyaXB0LnR5cGVzY3JpcHREZWZhdWx0c1xuXG4gIC8vIEluIHRoZSBmdXR1cmUgaXQnZCBiZSBnb29kIHRvIGFkZCBzdXBwb3J0IGZvciBhbiAnYWRkIG1hbnkgZmlsZXMnXG4gIGNvbnN0IGFkZExpYnJhcnlUb1J1bnRpbWUgPSAoY29kZTogc3RyaW5nLCBwYXRoOiBzdHJpbmcpID0+IHtcbiAgICBkZWZhdWx0cy5hZGRFeHRyYUxpYihjb2RlLCBwYXRoKVxuICAgIGNvbmZpZy5sb2dnZXIubG9nKGBbQVRBXSBBZGRpbmcgJHtwYXRofSB0byBydW50aW1lYClcbiAgfVxuXG4gIGNvbnN0IGdldFR3b1NsYXNoQ29tcGxpZXJPcHRpb25zID0gZXh0cmFjdFR3b1NsYXNoQ29tcGxpZXJPcHRpb25zKHRzKVxuXG4gIC8vIFRoZW4gdXBkYXRlIGl0IHdoZW4gdGhlIG1vZGVsIGNoYW5nZXMsIHBlcmhhcHMgdGhpcyBjb3VsZCBiZSBhIGRlYm91bmNlZCBwbHVnaW4gaW5zdGVhZCBpbiB0aGUgZnV0dXJlP1xuICBlZGl0b3Iub25EaWRDaGFuZ2VNb2RlbENvbnRlbnQoKCkgPT4ge1xuICAgIGNvbnN0IGNvZGUgPSBlZGl0b3IuZ2V0TW9kZWwoKSEuZ2V0VmFsdWUoKVxuICAgIGlmIChjb25maWcuc3VwcG9ydFR3b3NsYXNoQ29tcGlsZXJPcHRpb25zKSB7XG4gICAgICBjb25zdCBjb25maWdPcHRzID0gZ2V0VHdvU2xhc2hDb21wbGllck9wdGlvbnMoY29kZSlcbiAgICAgIHVwZGF0ZUNvbXBpbGVyU2V0dGluZ3MoY29uZmlnT3B0cylcbiAgICB9XG5cbiAgICBpZiAoY29uZmlnLmFjcXVpcmVUeXBlcykge1xuICAgICAgZGV0ZWN0TmV3SW1wb3J0c1RvQWNxdWlyZVR5cGVGb3IoY29kZSwgYWRkTGlicmFyeVRvUnVudGltZSwgd2luZG93LmZldGNoLmJpbmQod2luZG93KSwgY29uZmlnKVxuICAgIH1cbiAgfSlcblxuICBjb25maWcubG9nZ2VyLmxvZyhcIltDb21waWxlcl0gU2V0IGNvbXBpbGVyIG9wdGlvbnM6IFwiLCBjb21waWxlck9wdGlvbnMpXG4gIGRlZmF1bHRzLnNldENvbXBpbGVyT3B0aW9ucyhjb21waWxlck9wdGlvbnMpXG5cbiAgLy8gR3JhYiB0eXBlcyBsYXN0IHNvIHRoYXQgaXQgbG9ncyBpbiBhIGxvZ2ljYWwgd2F5XG4gIGlmIChjb25maWcuYWNxdWlyZVR5cGVzKSB7XG4gICAgLy8gVGFrZSB0aGUgY29kZSBmcm9tIHRoZSBlZGl0b3IgcmlnaHQgYXdheVxuICAgIGNvbnN0IGNvZGUgPSBlZGl0b3IuZ2V0TW9kZWwoKSEuZ2V0VmFsdWUoKVxuICAgIGRldGVjdE5ld0ltcG9ydHNUb0FjcXVpcmVUeXBlRm9yKGNvZGUsIGFkZExpYnJhcnlUb1J1bnRpbWUsIHdpbmRvdy5mZXRjaC5iaW5kKHdpbmRvdyksIGNvbmZpZylcbiAgfVxuXG4gIC8vIFRvIGxldCBjbGllbnRzIHBsdWcgaW50byBjb21waWxlciBzZXR0aW5ncyBjaGFuZ2VzXG4gIGxldCBkaWRVcGRhdGVDb21waWxlclNldHRpbmdzID0gKG9wdHM6IENvbXBpbGVyT3B0aW9ucykgPT4ge31cblxuICBjb25zdCB1cGRhdGVDb21waWxlclNldHRpbmdzID0gKG9wdHM6IENvbXBpbGVyT3B0aW9ucykgPT4ge1xuICAgIGNvbmZpZy5sb2dnZXIubG9nKFwiW0NvbXBpbGVyXSBVcGRhdGluZyBjb21waWxlciBvcHRpb25zOiBcIiwgb3B0cylcbiAgICBjb21waWxlck9wdGlvbnMgPSB7IC4uLm9wdHMsIC4uLmNvbXBpbGVyT3B0aW9ucyB9XG4gICAgZGVmYXVsdHMuc2V0Q29tcGlsZXJPcHRpb25zKGNvbXBpbGVyT3B0aW9ucylcbiAgICBkaWRVcGRhdGVDb21waWxlclNldHRpbmdzKGNvbXBpbGVyT3B0aW9ucylcbiAgfVxuXG4gIGNvbnN0IHVwZGF0ZUNvbXBpbGVyU2V0dGluZyA9IChrZXk6IGtleW9mIENvbXBpbGVyT3B0aW9ucywgdmFsdWU6IGFueSkgPT4ge1xuICAgIGNvbmZpZy5sb2dnZXIubG9nKFwiW0NvbXBpbGVyXSBTZXR0aW5nIGNvbXBpbGVyIG9wdGlvbnMgXCIsIGtleSwgXCJ0b1wiLCB2YWx1ZSlcbiAgICBjb21waWxlck9wdGlvbnNba2V5XSA9IHZhbHVlXG4gICAgZGVmYXVsdHMuc2V0Q29tcGlsZXJPcHRpb25zKGNvbXBpbGVyT3B0aW9ucylcbiAgICBkaWRVcGRhdGVDb21waWxlclNldHRpbmdzKGNvbXBpbGVyT3B0aW9ucylcbiAgfVxuXG4gIGNvbnN0IHNldENvbXBpbGVyU2V0dGluZ3MgPSAob3B0czogQ29tcGlsZXJPcHRpb25zKSA9PiB7XG4gICAgY29uZmlnLmxvZ2dlci5sb2coXCJbQ29tcGlsZXJdIFNldHRpbmcgY29tcGlsZXIgb3B0aW9uczogXCIsIG9wdHMpXG4gICAgY29tcGlsZXJPcHRpb25zID0gb3B0c1xuICAgIGRlZmF1bHRzLnNldENvbXBpbGVyT3B0aW9ucyhjb21waWxlck9wdGlvbnMpXG4gICAgZGlkVXBkYXRlQ29tcGlsZXJTZXR0aW5ncyhjb21waWxlck9wdGlvbnMpXG4gIH1cblxuICBjb25zdCBnZXRDb21waWxlck9wdGlvbnMgPSAoKSA9PiB7XG4gICAgcmV0dXJuIGNvbXBpbGVyT3B0aW9uc1xuICB9XG5cbiAgY29uc3Qgc2V0RGlkVXBkYXRlQ29tcGlsZXJTZXR0aW5ncyA9IChmdW5jOiAob3B0czogQ29tcGlsZXJPcHRpb25zKSA9PiB2b2lkKSA9PiB7XG4gICAgZGlkVXBkYXRlQ29tcGlsZXJTZXR0aW5ncyA9IGZ1bmNcbiAgfVxuXG4gIC8qKiBHZXRzIHRoZSByZXN1bHRzIG9mIGNvbXBpbGluZyB5b3VyIGVkaXRvcidzIGNvZGUgKi9cbiAgY29uc3QgZ2V0RW1pdFJlc3VsdCA9IGFzeW5jICgpID0+IHtcbiAgICBjb25zdCBtb2RlbCA9IGVkaXRvci5nZXRNb2RlbCgpIVxuXG4gICAgY29uc3QgY2xpZW50ID0gYXdhaXQgZ2V0V29ya2VyUHJvY2VzcygpXG4gICAgcmV0dXJuIGF3YWl0IGNsaWVudC5nZXRFbWl0T3V0cHV0KG1vZGVsLnVyaS50b1N0cmluZygpKVxuICB9XG5cbiAgLyoqIEdldHMgdGhlIEpTICBvZiBjb21waWxpbmcgeW91ciBlZGl0b3IncyBjb2RlICovXG4gIGNvbnN0IGdldFJ1bm5hYmxlSlMgPSBhc3luYyAoKSA9PiB7XG4gICAgaWYgKGNvbmZpZy51c2VKYXZhU2NyaXB0KSB7XG4gICAgICByZXR1cm4gZ2V0VGV4dCgpXG4gICAgfVxuXG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZ2V0RW1pdFJlc3VsdCgpXG4gICAgY29uc3QgZmlyc3RKUyA9IHJlc3VsdC5vdXRwdXRGaWxlcy5maW5kKChvOiBhbnkpID0+IG8ubmFtZS5lbmRzV2l0aChcIi5qc1wiKSB8fCBvLm5hbWUuZW5kc1dpdGgoXCIuanN4XCIpKVxuICAgIHJldHVybiAoZmlyc3RKUyAmJiBmaXJzdEpTLnRleHQpIHx8IFwiXCJcbiAgfVxuXG4gIC8qKiBHZXRzIHRoZSBEVFMgZm9yIHRoZSBKUy9UUyAgb2YgY29tcGlsaW5nIHlvdXIgZWRpdG9yJ3MgY29kZSAqL1xuICBjb25zdCBnZXREVFNGb3JDb2RlID0gYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGdldEVtaXRSZXN1bHQoKVxuICAgIHJldHVybiByZXN1bHQub3V0cHV0RmlsZXMuZmluZCgobzogYW55KSA9PiBvLm5hbWUuZW5kc1dpdGgoXCIuZC50c1wiKSkhLnRleHRcbiAgfVxuXG4gIGNvbnN0IGdldFdvcmtlclByb2Nlc3MgPSBhc3luYyAoKTogUHJvbWlzZTxUeXBlU2NyaXB0V29ya2VyPiA9PiB7XG4gICAgY29uc3Qgd29ya2VyID0gYXdhaXQgZ2V0V29ya2VyKClcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgcmV0dXJuIGF3YWl0IHdvcmtlcihtb2RlbC51cmkpXG4gIH1cblxuICBjb25zdCBnZXREb21Ob2RlID0gKCkgPT4gZWRpdG9yLmdldERvbU5vZGUoKSFcbiAgY29uc3QgZ2V0TW9kZWwgPSAoKSA9PiBlZGl0b3IuZ2V0TW9kZWwoKSFcbiAgY29uc3QgZ2V0VGV4dCA9ICgpID0+IGdldE1vZGVsKCkuZ2V0VmFsdWUoKVxuICBjb25zdCBzZXRUZXh0ID0gKHRleHQ6IHN0cmluZykgPT4gZ2V0TW9kZWwoKS5zZXRWYWx1ZSh0ZXh0KVxuXG4gIC8qKlxuICAgKiBXYXJuaW5nOiBSdW5zIG9uIHRoZSBtYWluIHRocmVhZFxuICAgKi9cbiAgY29uc3QgY3JlYXRlVFNQcm9ncmFtID0gYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IGZzTWFwID0gYXdhaXQgdHN2ZnMuY3JlYXRlRGVmYXVsdE1hcEZyb21DRE4oY29tcGlsZXJPcHRpb25zLCB0cy52ZXJzaW9uLCB0cnVlLCB0cywgbHpzdHJpbmcpXG4gICAgZnNNYXAuc2V0KGZpbGVQYXRoLnBhdGgsIGdldFRleHQoKSlcblxuICAgIGNvbnN0IHN5c3RlbSA9IHRzdmZzLmNyZWF0ZVN5c3RlbShmc01hcClcbiAgICBjb25zdCBob3N0ID0gdHN2ZnMuY3JlYXRlVmlydHVhbENvbXBpbGVySG9zdChzeXN0ZW0sIGNvbXBpbGVyT3B0aW9ucywgdHMpXG5cbiAgICBjb25zdCBwcm9ncmFtID0gdHMuY3JlYXRlUHJvZ3JhbSh7XG4gICAgICByb290TmFtZXM6IFsuLi5mc01hcC5rZXlzKCldLFxuICAgICAgb3B0aW9uczogY29tcGlsZXJPcHRpb25zLFxuICAgICAgaG9zdDogaG9zdC5jb21waWxlckhvc3QsXG4gICAgfSlcblxuICAgIHJldHVybiBwcm9ncmFtXG4gIH1cblxuICBjb25zdCBnZXRBU1QgPSBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgcHJvZ3JhbSA9IGF3YWl0IGNyZWF0ZVRTUHJvZ3JhbSgpXG4gICAgcHJvZ3JhbS5lbWl0KClcbiAgICByZXR1cm4gcHJvZ3JhbS5nZXRTb3VyY2VGaWxlKGZpbGVQYXRoLnBhdGgpIVxuICB9XG5cbiAgLy8gUGFzcyBhbG9uZyB0aGUgc3VwcG9ydGVkIHJlbGVhc2VzIGZvciB0aGUgcGxheWdyb3VuZFxuICBjb25zdCBzdXBwb3J0ZWRWZXJzaW9ucyA9IHN1cHBvcnRlZFJlbGVhc2VzXG5cbiAgcmV0dXJuIHtcbiAgICAvKiogVGhlIHNhbWUgY29uZmlnIHlvdSBwYXNzZWQgaW4gKi9cbiAgICBjb25maWcsXG4gICAgLyoqIEEgbGlzdCBvZiBUeXBlU2NyaXB0IHZlcnNpb25zIHlvdSBjYW4gdXNlIHdpdGggdGhlIFR5cGVTY3JpcHQgc2FuZGJveCAqL1xuICAgIHN1cHBvcnRlZFZlcnNpb25zLFxuICAgIC8qKiBUaGUgbW9uYWNvIGVkaXRvciBpbnN0YW5jZSAqL1xuICAgIGVkaXRvcixcbiAgICAvKiogRWl0aGVyIFwidHlwZXNjcmlwdFwiIG9yIFwiamF2YXNjcmlwdFwiIGRlcGVuZGluZyBvbiB5b3VyIGNvbmZpZyAqL1xuICAgIGxhbmd1YWdlLFxuICAgIC8qKiBUaGUgb3V0ZXIgbW9uYWNvIG1vZHVsZSwgdGhlIHJlc3VsdCBvZiByZXF1aXJlKFwibW9uYWNvLWVkaXRvclwiKSAgKi9cbiAgICBtb25hY28sXG4gICAgLyoqIEdldHMgYSBtb25hY28tdHlwZXNjcmlwdCB3b3JrZXIsIHRoaXMgd2lsbCBnaXZlIHlvdSBhY2Nlc3MgdG8gYSBsYW5ndWFnZSBzZXJ2ZXIuIE5vdGU6IHByZWZlciB0aGlzIGZvciBsYW5ndWFnZSBzZXJ2ZXIgd29yayBiZWNhdXNlIGl0IGhhcHBlbnMgb24gYSB3ZWJ3b3JrZXIgLiAqL1xuICAgIGdldFdvcmtlclByb2Nlc3MsXG4gICAgLyoqIEEgY29weSBvZiByZXF1aXJlKFwiQHR5cGVzY3JpcHQvdmZzXCIpIHRoaXMgY2FuIGJlIHVzZWQgdG8gcXVpY2tseSBzZXQgdXAgYW4gaW4tbWVtb3J5IGNvbXBpbGVyIHJ1bnMgZm9yIEFTVHMsIG9yIHRvIGdldCBjb21wbGV4IGxhbmd1YWdlIHNlcnZlciByZXN1bHRzIChhbnl0aGluZyBhYm92ZSBoYXMgdG8gYmUgc2VyaWFsaXplZCB3aGVuIHBhc3NlZCkqL1xuICAgIHRzdmZzLFxuICAgIC8qKiBHZXQgYWxsIHRoZSBkaWZmZXJlbnQgZW1pdHRlZCBmaWxlcyBhZnRlciBUeXBlU2NyaXB0IGlzIHJ1biAqL1xuICAgIGdldEVtaXRSZXN1bHQsXG4gICAgLyoqIEdldHMganVzdCB0aGUgSmF2YVNjcmlwdCBmb3IgeW91ciBzYW5kYm94LCB3aWxsIHRyYW5zcGlsZSBpZiBpbiBUUyBvbmx5ICovXG4gICAgZ2V0UnVubmFibGVKUyxcbiAgICAvKiogR2V0cyB0aGUgRFRTIG91dHB1dCBvZiB0aGUgbWFpbiBjb2RlIGluIHRoZSBlZGl0b3IgKi9cbiAgICBnZXREVFNGb3JDb2RlLFxuICAgIC8qKiBUaGUgbW9uYWNvLWVkaXRvciBkb20gbm9kZSwgdXNlZCBmb3Igc2hvd2luZy9oaWRpbmcgdGhlIGVkaXRvciAqL1xuICAgIGdldERvbU5vZGUsXG4gICAgLyoqIFRoZSBtb2RlbCBpcyBhbiBvYmplY3Qgd2hpY2ggbW9uYWNvIHVzZXMgdG8ga2VlcCB0cmFjayBvZiB0ZXh0IGluIHRoZSBlZGl0b3IuIFVzZSB0aGlzIHRvIGRpcmVjdGx5IG1vZGlmeSB0aGUgdGV4dCBpbiB0aGUgZWRpdG9yICovXG4gICAgZ2V0TW9kZWwsXG4gICAgLyoqIEdldHMgdGhlIHRleHQgb2YgdGhlIG1haW4gbW9kZWwsIHdoaWNoIGlzIHRoZSB0ZXh0IGluIHRoZSBlZGl0b3IgKi9cbiAgICBnZXRUZXh0LFxuICAgIC8qKiBTaG9ydGN1dCBmb3Igc2V0dGluZyB0aGUgbW9kZWwncyB0ZXh0IGNvbnRlbnQgd2hpY2ggd291bGQgdXBkYXRlIHRoZSBlZGl0b3IgKi9cbiAgICBzZXRUZXh0LFxuICAgIC8qKiBHZXRzIHRoZSBBU1Qgb2YgdGhlIGN1cnJlbnQgdGV4dCBpbiBtb25hY28gLSB1c2VzIGBjcmVhdGVUU1Byb2dyYW1gLCBzbyB0aGUgcGVyZm9ybWFuY2UgY2F2ZWF0IGFwcGxpZXMgdGhlcmUgdG9vICovXG4gICAgZ2V0QVNULFxuICAgIC8qKiBUaGUgbW9kdWxlIHlvdSBnZXQgZnJvbSByZXF1aXJlKFwidHlwZXNjcmlwdFwiKSAqL1xuICAgIHRzLFxuICAgIC8qKiBDcmVhdGUgYSBuZXcgUHJvZ3JhbSwgYSBUeXBlU2NyaXB0IGRhdGEgbW9kZWwgd2hpY2ggcmVwcmVzZW50cyB0aGUgZW50aXJlIHByb2plY3QuXG4gICAgICpcbiAgICAgKiBUaGUgZmlyc3QgdGltZSB0aGlzIGlzIGNhbGxlZCBpdCBoYXMgdG8gZG93bmxvYWQgYWxsIHRoZSBEVFMgZmlsZXMgd2hpY2ggaXMgbmVlZGVkIGZvciBhbiBleGFjdCBjb21waWxlciBydW4uIFdoaWNoXG4gICAgICogYXQgbWF4IGlzIGFib3V0IDEuNU1CIC0gYWZ0ZXIgdGhhdCBzdWJzZXF1ZW50IGRvd25sb2FkcyBvZiBkdHMgbGliIGZpbGVzIGNvbWUgZnJvbSBsb2NhbFN0b3JhZ2UuXG4gICAgICpcbiAgICAgKiBUcnkgdG8gdXNlIHRoaXMgc3BhcmluZ2x5IGFzIGl0IGNhbiBiZSBjb21wdXRhdGlvbmFsbHkgZXhwZW5zaXZlLCBhdCB0aGUgbWluaW11bSB5b3Ugc2hvdWxkIGJlIHVzaW5nIHRoZSBkZWJvdW5jZWQgc2V0dXAuXG4gICAgICpcbiAgICAgKiBUT0RPOiBJdCB3b3VsZCBiZSBnb29kIHRvIGNyZWF0ZSBhbiBlYXN5IHdheSB0byBoYXZlIGEgc2luZ2xlIHByb2dyYW0gaW5zdGFuY2Ugd2hpY2ggaXMgdXBkYXRlZCBmb3IgeW91XG4gICAgICogd2hlbiB0aGUgbW9uYWNvIG1vZGVsIGNoYW5nZXMuXG4gICAgICovXG4gICAgY3JlYXRlVFNQcm9ncmFtLFxuICAgIC8qKiBUaGUgU2FuZGJveCdzIGRlZmF1bHQgY29tcGlsZXIgb3B0aW9ucyAgKi9cbiAgICBjb21waWxlckRlZmF1bHRzLFxuICAgIC8qKiBUaGUgU2FuZGJveCdzIGN1cnJlbnQgY29tcGlsZXIgb3B0aW9ucyAqL1xuICAgIGdldENvbXBpbGVyT3B0aW9ucyxcbiAgICAvKiogUmVwbGFjZSB0aGUgU2FuZGJveCdzIGNvbXBpbGVyIG9wdGlvbnMgKi9cbiAgICBzZXRDb21waWxlclNldHRpbmdzLFxuICAgIC8qKiBPdmVyd3JpdGUgdGhlIFNhbmRib3gncyBjb21waWxlciBvcHRpb25zICovXG4gICAgdXBkYXRlQ29tcGlsZXJTZXR0aW5nLFxuICAgIC8qKiBVcGRhdGUgYSBzaW5nbGUgY29tcGlsZXIgb3B0aW9uIGluIHRoZSBTQW5kYm94ICovXG4gICAgdXBkYXRlQ29tcGlsZXJTZXR0aW5ncyxcbiAgICAvKiogQSB3YXkgdG8gZ2V0IGNhbGxiYWNrcyB3aGVuIGNvbXBpbGVyIHNldHRpbmdzIGhhdmUgY2hhbmdlZCAqL1xuICAgIHNldERpZFVwZGF0ZUNvbXBpbGVyU2V0dGluZ3MsXG4gICAgLyoqIEEgY29weSBvZiBsenN0cmluZywgd2hpY2ggaXMgdXNlZCB0byBhcmNoaXZlL3VuYXJjaGl2ZSBjb2RlICovXG4gICAgbHpzdHJpbmcsXG4gICAgLyoqIFJldHVybnMgY29tcGlsZXIgb3B0aW9ucyBmb3VuZCBpbiB0aGUgcGFyYW1zIG9mIHRoZSBjdXJyZW50IHBhZ2UgKi9cbiAgICBjcmVhdGVVUkxRdWVyeVdpdGhDb21waWxlck9wdGlvbnMsXG4gICAgLyoqIFJldHVybnMgY29tcGlsZXIgb3B0aW9ucyBpbiB0aGUgc291cmNlIGNvZGUgdXNpbmcgdHdvc2xhc2ggbm90YXRpb24gKi9cbiAgICBnZXRUd29TbGFzaENvbXBsaWVyT3B0aW9ucyxcbiAgICAvKiogR2V0cyB0byB0aGUgY3VycmVudCBtb25hY28tbGFuZ3VhZ2UsIHRoaXMgaXMgaG93IHlvdSB0YWxrIHRvIHRoZSBiYWNrZ3JvdW5kIHdlYndvcmtlcnMgKi9cbiAgICBsYW5ndWFnZVNlcnZpY2VEZWZhdWx0czogZGVmYXVsdHMsXG4gICAgLyoqIFRoZSBwYXRoIHdoaWNoIHJlcHJlc2VudHMgdGhlIGN1cnJlbnQgZmlsZSB1c2luZyB0aGUgY3VycmVudCBjb21waWxlciBvcHRpb25zICovXG4gICAgZmlsZXBhdGg6IGZpbGVQYXRoLnBhdGgsXG4gIH1cbn1cblxuZXhwb3J0IHR5cGUgU2FuZGJveCA9IFJldHVyblR5cGU8dHlwZW9mIGNyZWF0ZVR5cGVTY3JpcHRTYW5kYm94PlxuIl19